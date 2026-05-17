import { prisma } from "../prisma";
import { buscarDividendosConfigurado } from "../mercado/dividendos";
import { enviarParaTodos } from "../push";
import { log } from "../log";

/**
 * Importa todos os dividendos disponíveis para um ativo (até `anos` atrás),
 * tentando Yahoo → Status Invest → Fundamentus → Brapi até obter dados.
 * Cria lançamentos apenas para datas em que o usuário JÁ POSSUÍA cotas.
 * Não duplica datas já existentes.
 * Retorna quantos foram importados.
 */
export async function sincronizarDividendosDoAtivo(ativoId: string, anos = 10): Promise<number> {
  const ativo = await prisma.ativo.findUnique({
    where: { id: ativoId },
    include: { lancamentos: true },
  });
  if (!ativo) return 0;

  const { divs, fonte } = await buscarDividendosConfigurado(ativo.ticker, anos);
  if (divs.length === 0) {
    log.warn("sync-divs.sem_dados", { ticker: ativo.ticker });
    return 0;
  }
  log.info("sync-divs.fonte_usada", { ticker: ativo.ticker, fonte, total: divs.length });

  const existentes = new Set(
    ativo.lancamentos
      .filter((l) => l.tipo === "DIVIDENDO")
      .map((l) => l.data.toISOString().slice(0, 10)),
  );

  // Pré-calcula tudo antes de tocar no banco; depois grava em transação única.
  const paraCriar: { data: Date; valor: number; valorPorCota: number; cotas: number; key: string }[] = [];
  for (const d of divs) {
    const key = d.data.toISOString().slice(0, 10);
    if (existentes.has(key)) continue;
    const cotas = cotasNoMomento(ativo.lancamentos, d.data);
    if (cotas <= 0) continue;
    paraCriar.push({ data: d.data, valor: d.valor * cotas, valorPorCota: d.valor, cotas, key });
  }

  if (paraCriar.length === 0) return 0;

  // Transação atomica: ou tudo entra, ou nada (evita estado parcial em crash).
  await prisma.$transaction(
    paraCriar.map((p) =>
      prisma.lancamento.create({
        data: {
          tipo: "DIVIDENDO",
          ativoId: ativo.id,
          data: p.data,
          valorTotal: p.valor,
          observacao: `Auto (${fonte}) — ${p.valorPorCota.toFixed(4)}/cota × ${p.cotas}`,
        },
      }),
    ),
  );

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
  return paraCriar.length;
}

export async function sincronizarDividendosDeTodos(anos = 5): Promise<number> {
  const ativos = await prisma.ativo.findMany({ select: { id: true } });
  let total = 0;
  for (const a of ativos) {
    total += await sincronizarDividendosDoAtivo(a.id, anos);
  }
  return total;
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
