import { prisma } from "../prisma";
import { buscarDividendosConfigurado } from "../mercado/dividendos";
import { enviarParaTodos } from "../push";
import { log } from "../log";
import { getCarteiraAtivaId } from "../carteira";
import {
  planejarSyncDividendos,
  observacaoAuto,
  type LancDividendo,
} from "./sync-dividendos-plano";

/**
 * Importa todos os dividendos disponíveis para um ativo (até `anos` atrás),
 * tentando Yahoo → Status Invest → Fundamentus → Brapi até obter dados.
 * Cria lançamentos apenas para datas em que o usuário JÁ POSSUÍA cotas.
 * O pareamento com o que já está gravado (incluindo o caso de a fonte mudar a
 * convenção de data) fica em `planejarSyncDividendos`, que também garante que
 * dividendo digitado à mão nunca é sobrescrito.
 * Retorna quantos foram importados/ajustados.
 */
export async function sincronizarDividendosDoAtivo(
  ativoId: string,
  anos = 10,
  carteiraId?: string,
): Promise<number> {
  // Resolve a carteira-alvo (default: ativa). Sem isso o lançamento DIVIDENDO
  // fica sem carteiraId e a página Lançamentos (que filtra por carteira) não mostra.
  const carteiraAlvo = carteiraId ?? (await getCarteiraAtivaId());

  const ativo = await prisma.ativo.findUnique({
    where: { id: ativoId },
    include: { lancamentos: { where: { carteiraId: carteiraAlvo } } },
  });
  if (!ativo) return 0;

  const { divs, fonte } = await buscarDividendosConfigurado(ativo.ticker, anos);
  if (divs.length === 0) {
    log.warn("sync-divs.sem_dados", { ticker: ativo.ticker });
    return 0;
  }
  log.info("sync-divs.fonte_usada", { ticker: ativo.ticker, fonte, total: divs.length, carteiraId: carteiraAlvo });

  const existentes: LancDividendo[] = ativo.lancamentos
    .filter((l) => l.tipo === "DIVIDENDO")
    .map((l) => ({ id: l.id, data: l.data, valorTotal: l.valorTotal, observacao: l.observacao }));

  const plano = planejarSyncDividendos(existentes, divs, (data) =>
    cotasNoMomento(ativo.lancamentos, data),
  );
  const paraCriar = plano.criar;
  const paraAtualizar = plano.atualizar;

  const manuaisPreservados = plano.preservados.filter((p) => p.motivo === "manual").length;
  if (manuaisPreservados > 0) {
    log.info("sync-divs.manual_preservado", { ticker: ativo.ticker, total: manuaisPreservados });
  }

  if (paraCriar.length === 0 && paraAtualizar.length === 0) return 0;

  // Transação atomica: ou tudo entra, ou nada (evita estado parcial em crash).
  await prisma.$transaction([
    ...paraCriar.map((p) =>
      prisma.lancamento.create({
        data: {
          tipo: "DIVIDENDO",
          ativoId: ativo.id,
          carteiraId: carteiraAlvo,
          data: p.data,
          valorTotal: p.valor,
          observacao: observacaoAuto(fonte, p.valorPorCota, p.cotas),
        },
      }),
    ),
    ...paraAtualizar.map((u) =>
      prisma.lancamento.update({
        where: { id: u.id },
        data: {
          valorTotal: u.valorNovo,
          observacao: observacaoAuto(fonte, u.valorPorCota, u.cotas, true),
        },
      }),
    ),
  ]);

  if (paraAtualizar.length > 0) {
    log.info("sync-divs.recalc", {
      ticker: ativo.ticker,
      ajustados: paraAtualizar.length,
    });
  }

  // Push só para dividendos recentes — depois da gravação dar OK
  const seteDias = 7 * 24 * 60 * 60 * 1000;
  for (const p of paraCriar) {
    if (Date.now() - p.data.getTime() < seteDias) {
      enviarParaTodos({
        titulo: `${ativo.ticker} pagou R$ ${p.valor.toFixed(2)}`,
        corpo: `${p.cotas} cotas × R$ ${p.valorPorCota.toFixed(4)}`,
        url: `/carteira/${ativo.ticker}`,
        tag: `div-${ativo.ticker}-${p.key}`,
      }).catch(() => {});
    }
  }
  return paraCriar.length + paraAtualizar.length;
}

/**
 * Sincroniza dividendos de toda a base.
 *
 * Com `carteiraId`, opera so nessa carteira. Sem ele, descobre os pares
 * (ativo, carteira) que de fato tem posicao, em vez de usar a carteira ativa:
 * a carteira ativa vem de cookie, entao o destino do lancamento dependia de
 * qual carteira o navegador tinha selecionada na hora da sync. Se fosse uma
 * carteira sem aquele ativo, `cotas` dava 0 e a distribuicao era descartada
 * silenciosamente. Derivar do dado tambem torna a funcao chamavel fora de uma
 * request (scheduler/cron), onde `cookies()` nao existe.
 */
export async function sincronizarDividendosDeTodos(anos = 5, carteiraId?: string): Promise<number> {
  let total = 0;

  if (carteiraId) {
    const ativos = await prisma.ativo.findMany({ select: { id: true } });
    for (const a of ativos) {
      total += await sincronizarDividendosDoAtivo(a.id, anos, carteiraId);
    }
    return total;
  }

  const pares = await prisma.lancamento.findMany({
    where: {
      tipo: { in: ["COMPRA", "REINVESTIMENTO"] },
      ativoId: { not: null },
      carteiraId: { not: null },
    },
    select: { ativoId: true, carteiraId: true },
    distinct: ["ativoId", "carteiraId"],
  });

  log.info("sync-divs.pares", { total: pares.length });
  for (const par of pares) {
    total += await sincronizarDividendosDoAtivo(par.ativoId!, anos, par.carteiraId!);
  }
  return total;
}

/**
 * Posição na data, para dimensionar o dividendo.
 *
 * Espelha `cotasNaData` de portfolio.ts, com uma diferença deliberada: aqui a
 * venda nao e limitada a zero. Se um historico inconsistente levasse a posicao
 * a negativo, o resultado <= 0 faz a distribuicao ser ignorada, que e o lado
 * seguro do erro. Unificar as duas exigiria converter para LancamentoInput (o
 * `tipo` do Prisma e string, o da engine e union), e o cast necessario esconderia
 * justamente o tipo de divergencia que a unificacao pretende evitar.
 */
function cotasNoMomento(
  lancs: { tipo: string; data: Date; quantidade: number | null }[],
  data: Date,
): number {
  let cotas = 0;
  for (const l of lancs) {
    if (l.data > data) continue;
    if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") cotas += l.quantidade ?? 0;
    else if (l.tipo === "VENDA") cotas -= l.quantidade ?? 0;
  }
  return cotas;
}
