import { prisma } from "../prisma";
import { buscarDividendos } from "../mercado/yahoo";

export type ProximoDividendo = {
  ticker: string;
  dataEstimada: string; // ISO date
  valorEstimado: number;
  valorPorCotaEstimado: number;
  cotas: number;
  fonte: "historico-proprio" | "yahoo" | "indisponivel";
  confianca: "alta" | "media" | "baixa";
  diasAteEvento: number;
};

/**
 * Estima quando cada ativo da carteira (com cotas > 0) vai pagar próximo
 * dividendo, com base no padrão histórico de datas e valores.
 *
 * Algoritmo:
 *   1. Para cada ativo com cotas > 0, pega últimos 6 dividendos (locais ou Yahoo)
 *   2. Calcula a mediana de dia do mês das datas e valor médio por cota
 *   3. A próxima data = no mês corrente se ainda não pagou + dia mediana > hoje,
 *      caso contrário no próximo mês
 *   4. Valor = média histórica × cotas atuais
 */
export async function proximosDividendos(carteiraId?: string): Promise<ProximoDividendo[]> {
  const ativos = await prisma.ativo.findMany({
    include: {
      lancamentos: {
        where: carteiraId ? { carteiraId } : undefined,
        orderBy: { data: "asc" },
      },
    },
  });

  const resultados: ProximoDividendo[] = [];

  for (const a of ativos) {
    let cotas = 0;
    for (const l of a.lancamentos) {
      if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") cotas += l.quantidade ?? 0;
      else if (l.tipo === "VENDA") cotas -= l.quantidade ?? 0;
    }
    if (cotas <= 0) continue;

    const divsLocais = a.lancamentos
      .filter((l) => l.tipo === "DIVIDENDO")
      .sort((x, y) => +x.data - +y.data);

    let datas: Date[];
    let valoresPorCota: number[];
    let fonte: ProximoDividendo["fonte"];

    if (divsLocais.length >= 3) {
      // Usa histórico próprio
      datas = divsLocais.slice(-6).map((d) => d.data);
      valoresPorCota = divsLocais.slice(-6).map((d) => {
        // Estima cotas que existiam naquela data
        let cotasNaData = 0;
        for (const l of a.lancamentos) {
          if (l.data > d.data) break;
          if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") cotasNaData += l.quantidade ?? 0;
          else if (l.tipo === "VENDA") cotasNaData -= l.quantidade ?? 0;
        }
        return cotasNaData > 0 ? d.valorTotal / cotasNaData : 0;
      }).filter((v) => v > 0);
      fonte = "historico-proprio";
    } else {
      // Fallback: usa Yahoo
      const divsYahoo = await buscarDividendos(a.ticker, 1).catch(() => []);
      if (divsYahoo.length === 0) {
        resultados.push({
          ticker: a.ticker, dataEstimada: "", valorEstimado: 0,
          valorPorCotaEstimado: 0, cotas, fonte: "indisponivel",
          confianca: "baixa", diasAteEvento: -1,
        });
        continue;
      }
      datas = divsYahoo.slice(-6).map((d) => d.data);
      valoresPorCota = divsYahoo.slice(-6).map((d) => d.valor);
      fonte = "yahoo";
    }

    if (datas.length === 0) continue;

    // Mediana do dia do mês
    const dias = datas.map((d) => d.getDate()).sort((a, b) => a - b);
    const diaTipico = dias[Math.floor(dias.length / 2)];

    // Estima próxima data
    const hoje = new Date();
    const proxData = new Date(hoje.getFullYear(), hoje.getMonth(), diaTipico);
    if (proxData <= hoje) proxData.setMonth(proxData.getMonth() + 1);

    // Valor por cota: média dos últimos 3
    const ultimos3 = valoresPorCota.slice(-3);
    const valorPorCota = ultimos3.reduce((s, v) => s + v, 0) / ultimos3.length;

    // Confiança: alta se temos 6+ pagamentos, média se 3-5, baixa se < 3
    const confianca: ProximoDividendo["confianca"] =
      datas.length >= 6 ? "alta" : datas.length >= 3 ? "media" : "baixa";

    const diasAteEvento = Math.round((proxData.getTime() - hoje.getTime()) / 86400000);

    resultados.push({
      ticker: a.ticker,
      dataEstimada: proxData.toISOString(),
      valorEstimado: valorPorCota * cotas,
      valorPorCotaEstimado: valorPorCota,
      cotas,
      fonte,
      confianca,
      diasAteEvento,
    });
  }

  return resultados
    .filter((r) => r.fonte !== "indisponivel")
    .sort((a, b) => a.diasAteEvento - b.diasAteEvento);
}
