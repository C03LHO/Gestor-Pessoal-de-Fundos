import { prisma } from "../prisma";
import { buscarDividendos } from "../mercado/yahoo";
import { enviarParaTodos } from "../push";

/**
 * Importa todos os dividendos do Yahoo para um ativo (até `anos` atrás),
 * criando lançamentos apenas para datas em que o usuário JÁ POSSUÍA cotas.
 * Não duplica datas já existentes.
 * Retorna quantos foram importados.
 */
export async function sincronizarDividendosDoAtivo(ativoId: string, anos = 10): Promise<number> {
  const ativo = await prisma.ativo.findUnique({
    where: { id: ativoId },
    include: { lancamentos: true },
  });
  if (!ativo) return 0;

  const divs = await buscarDividendos(ativo.ticker, anos);
  if (divs.length === 0) return 0;

  const existentes = new Set(
    ativo.lancamentos
      .filter((l) => l.tipo === "DIVIDENDO")
      .map((l) => l.data.toISOString().slice(0, 10)),
  );

  let importados = 0;
  for (const d of divs) {
    const key = d.data.toISOString().slice(0, 10);
    if (existentes.has(key)) continue;
    const cotas = cotasNoMomento(ativo.lancamentos, d.data);
    if (cotas <= 0) continue;

    const valor = d.valor * cotas;
    await prisma.lancamento.create({
      data: {
        tipo: "DIVIDENDO",
        ativoId: ativo.id,
        data: d.data,
        valorTotal: valor,
        observacao: `Auto (Yahoo) — ${d.valor.toFixed(4)}/cota × ${cotas}`,
      },
    });
    importados++;

    // Notificação push só para dividendos recentes (≤ 7 dias)
    const seteDias = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - d.data.getTime() < seteDias) {
      enviarParaTodos({
        titulo: `${ativo.ticker} pagou R$ ${valor.toFixed(2)}`,
        corpo: `${cotas} cotas × R$ ${d.valor.toFixed(4)}`,
        url: `/carteira/${ativo.ticker}`,
        tag: `div-${ativo.ticker}-${key}`,
      }).catch(() => {});
    }
  }
  return importados;
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
