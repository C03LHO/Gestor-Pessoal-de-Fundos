import { prisma } from "../prisma";
import { recalcularPortfolio, type LancamentoInput, type AtivoInfo } from "./portfolio";

/**
 * Reconstrói a evolução do patrimônio mês a mês usando a MESMA engine que
 * calcula a carteira atual. Para cada mês:
 *  - filtra lançamentos com data <= fim do mês
 *  - aplica preço da Cotacao mais recente <= fim do mês (fallback: precoAtual)
 *  - delega a recalcularPortfolio
 */
export async function patrimonioHistorico(
  meses = 12,
  carteiraId?: string,
): Promise<{ mes: string; investido: number; valor: number }[]> {
  const ini = new Date();
  ini.setDate(1); ini.setHours(0, 0, 0, 0);
  ini.setMonth(ini.getMonth() - (meses - 1));

  const [ativos, todos, cotacoes] = await Promise.all([
    prisma.ativo.findMany({
      select: { id: true, ticker: true, nome: true, segmento: true, precoAtual: true },
    }),
    prisma.lancamento.findMany({
      // Isola por carteira ativa — sem isso a evolução somava TODAS as carteiras.
      where: {
        carteiraId: carteiraId ?? undefined,
        tipo: { in: ["COMPRA", "VENDA", "REINVESTIMENTO", "DIVIDENDO", "AMORTIZACAO"] },
      },
      select: {
        id: true, tipo: true, data: true, ativoId: true,
        quantidade: true, precoUnit: true, valorTotal: true,
      },
      orderBy: { data: "asc" },
    }),
    // Só cotações da janela analisada (>= início do 1º mês). Antes carregava a
    // tabela inteira a cada render do dashboard.
    prisma.cotacao.findMany({ where: { data: { gte: ini } }, orderBy: { data: "asc" } }),
  ]);

  const seriesCotacao = new Map<string, { data: Date; preco: number }[]>();
  for (const c of cotacoes) {
    if (!seriesCotacao.has(c.ticker)) seriesCotacao.set(c.ticker, []);
    seriesCotacao.get(c.ticker)!.push({ data: c.data, preco: c.preco });
  }

  const lancsBase: LancamentoInput[] = todos.map((l) => ({
    id: l.id,
    tipo: l.tipo as LancamentoInput["tipo"],
    data: l.data,
    ativoId: l.ativoId,
    quantidade: l.quantidade,
    precoUnit: l.precoUnit,
    valorTotal: l.valorTotal,
  }));

  const resultado: { mes: string; investido: number; valor: number }[] = [];

  for (let m = 0; m < meses; m++) {
    const fim = new Date(ini);
    fim.setMonth(ini.getMonth() + m + 1);
    fim.setDate(0); fim.setHours(23, 59, 59, 999);

    // Preço de cada ativo no fim deste mês (fallback: precoAtual de hoje)
    const ativosNoMes: AtivoInfo[] = ativos.map((a) => {
      const serie = seriesCotacao.get(a.ticker) ?? [];
      let precoMes: number | null = null;
      for (const c of serie) {
        if (c.data <= fim) precoMes = c.preco;
        else break;
      }
      return { ...a, precoAtual: precoMes ?? a.precoAtual };
    });

    const lancsAteMes = lancsBase.filter((l) => l.data <= fim);
    const { consolidado } = recalcularPortfolio(ativosNoMes, lancsAteMes, fim);

    const d = new Date(ini); d.setMonth(ini.getMonth() + m);
    resultado.push({
      mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      investido: consolidado.custoTotal,
      // se não temos preço de mercado em nenhum ativo, mostra ao menos o custo
      valor: consolidado.valorAtual > 0 ? consolidado.valorAtual : consolidado.custoTotal,
    });
  }

  return resultado;
}
