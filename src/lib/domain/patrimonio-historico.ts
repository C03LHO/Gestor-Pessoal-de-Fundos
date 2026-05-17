import { prisma } from "../prisma";

/**
 * Reconstrói a evolução do patrimônio mês a mês a partir dos lançamentos
 * (compras/vendas) e dos preços de cada ativo. Como nem sempre temos cotação
 * histórica detalhada, usamos a cotação ATUAL como aproximação para meses
 * em que não há registro — o que é suficiente para visualizar a trajetória
 * de aportes.
 *
 * Quando a tabela `Cotacao` tiver mais dados, melhora automaticamente.
 */
export async function patrimonioHistorico(meses = 12): Promise<{ mes: string; investido: number; valor: number }[]> {
  const ini = new Date();
  ini.setDate(1); ini.setHours(0, 0, 0, 0);
  ini.setMonth(ini.getMonth() - (meses - 1));

  const [ativos, todos] = await Promise.all([
    prisma.ativo.findMany(),
    prisma.lancamento.findMany({
      where: { OR: [{ tipo: "COMPRA" }, { tipo: "VENDA" }, { tipo: "REINVESTIMENTO" }] },
      orderBy: { data: "asc" },
    }),
  ]);
  const precoAtual = new Map(ativos.map((a) => [a.id, a.precoAtual ?? 0]));

  const cotacoes = await prisma.cotacao.findMany({ orderBy: { data: "asc" } });
  // index ticker → série
  const seriesCotacao = new Map<string, { data: Date; preco: number }[]>();
  for (const c of cotacoes) {
    if (!seriesCotacao.has(c.ticker)) seriesCotacao.set(c.ticker, []);
    seriesCotacao.get(c.ticker)!.push({ data: c.data, preco: c.preco });
  }

  const resultado: { mes: string; investido: number; valor: number }[] = [];

  for (let m = 0; m < meses; m++) {
    const fim = new Date(ini);
    fim.setMonth(ini.getMonth() + m + 1);
    fim.setDate(0); fim.setHours(23, 59, 59, 999);

    // cotas e investido por ativo até `fim`
    const cotasPorAtivo = new Map<string, number>();
    const investidoPorAtivo = new Map<string, number>();
    for (const l of todos) {
      if (l.data > fim) break;
      const aid = l.ativoId;
      if (!aid) continue;
      const qtd = l.quantidade ?? 0;
      if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") {
        cotasPorAtivo.set(aid, (cotasPorAtivo.get(aid) ?? 0) + qtd);
        investidoPorAtivo.set(aid, (investidoPorAtivo.get(aid) ?? 0) + l.valorTotal);
      } else if (l.tipo === "VENDA") {
        cotasPorAtivo.set(aid, (cotasPorAtivo.get(aid) ?? 0) - qtd);
        investidoPorAtivo.set(aid, (investidoPorAtivo.get(aid) ?? 0) - l.valorTotal);
      }
    }

    let investido = 0, valor = 0;
    for (const [aid, cotas] of cotasPorAtivo) {
      if (cotas <= 0) continue;
      const ativo = ativos.find((a) => a.id === aid);
      if (!ativo) continue;
      const inv = investidoPorAtivo.get(aid) ?? 0;
      const cot = seriesCotacao.get(ativo.ticker) ?? [];
      const precoNoMes = cot.findLast((c) => c.data <= fim)?.preco ?? precoAtual.get(aid) ?? 0;
      investido += inv;
      valor += precoNoMes * cotas;
    }

    const d = new Date(ini); d.setMonth(ini.getMonth() + m);
    resultado.push({
      mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      investido,
      valor: valor > 0 ? valor : investido,
    });
  }

  return resultado;
}
