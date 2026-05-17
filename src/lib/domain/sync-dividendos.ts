import { prisma } from "../prisma";
import { buscarDividendosConfigurado } from "../mercado/dividendos";
import { enviarParaTodos } from "../push";
import { log } from "../log";
import { getCarteiraAtivaId } from "../carteira";

/**
 * Importa todos os dividendos disponíveis para um ativo (até `anos` atrás),
 * tentando Yahoo → Status Invest → Fundamentus → Brapi até obter dados.
 * Cria lançamentos apenas para datas em que o usuário JÁ POSSUÍA cotas.
 * Não duplica datas já existentes.
 * Retorna quantos foram importados.
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

  // Mapa por mês (YYYY-MM): cada fonte usa convenção de data diferente
  // (Yahoo ex-date vs Fundamentus data de pagamento), e o usuário só recebe
  // uma vez por distribuição.
  const existentesPorMes = new Map<string, typeof ativo.lancamentos[number]>();
  for (const l of ativo.lancamentos) {
    if (l.tipo !== "DIVIDENDO") continue;
    existentesPorMes.set(l.data.toISOString().slice(0, 7), l);
  }

  const paraCriar: { data: Date; valor: number; valorPorCota: number; cotas: number; key: string }[] = [];
  // Atualizações: quando uma compra retroativa entrou, o nº de cotas no dia
  // do dividendo mudou — temos que recalcular o valor do dividendo existente.
  const paraAtualizar: { id: string; valorAntigo: number; valorNovo: number; cotas: number; valorPorCota: number }[] = [];

  for (const d of divs) {
    const key = d.data.toISOString().slice(0, 7);
    const cotas = cotasNoMomento(ativo.lancamentos, d.data);
    if (cotas <= 0) continue;
    const valorEsperado = arred(d.valor * cotas);
    const existente = existentesPorMes.get(key);
    if (existente) {
      // Só atualiza se a diferença for material (>= 1 centavo).
      if (Math.abs(arred(existente.valorTotal) - valorEsperado) >= 0.01) {
        paraAtualizar.push({
          id: existente.id,
          valorAntigo: existente.valorTotal,
          valorNovo: valorEsperado,
          cotas,
          valorPorCota: d.valor,
        });
      }
      continue;
    }
    paraCriar.push({ data: d.data, valor: valorEsperado, valorPorCota: d.valor, cotas, key });
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
          observacao: `Auto (${fonte}) — ${p.valorPorCota.toFixed(4)}/cota × ${p.cotas}`,
        },
      }),
    ),
    ...paraAtualizar.map((u) =>
      prisma.lancamento.update({
        where: { id: u.id },
        data: {
          valorTotal: u.valorNovo,
          observacao: `Auto (${fonte}) — ${u.valorPorCota.toFixed(4)}/cota × ${u.cotas} (recalc)`,
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

export async function sincronizarDividendosDeTodos(anos = 5, carteiraId?: string): Promise<number> {
  const carteiraAlvo = carteiraId ?? (await getCarteiraAtivaId());
  const ativos = await prisma.ativo.findMany({ select: { id: true } });
  let total = 0;
  for (const a of ativos) {
    total += await sincronizarDividendosDoAtivo(a.id, anos, carteiraAlvo);
  }
  return total;
}

function arred(v: number): number {
  return Math.round(v * 100) / 100;
}

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
