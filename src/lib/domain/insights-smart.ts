import { prisma } from "../prisma";

export type Insight = {
  id: string;
  tipo: "vitoria" | "marco" | "info" | "atencao";
  titulo: string;
  detalhe?: string;
};

/**
 * Gera mensagens automáticas que destacam padrões e marcos da carteira.
 * Roda no servidor, ordenadas por relevância.
 */
export async function gerarInsights(carteiraId?: string): Promise<Insight[]> {
  const insights: Insight[] = [];

  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - 24);

  const divs = await prisma.lancamento.findMany({
    where: {
      tipo: "DIVIDENDO",
      data: { gte: inicio },
      ...(carteiraId ? { carteiraId } : {}),
    },
    include: { ativo: true },
    orderBy: { data: "asc" },
  });

  // Agrega por mês
  const mensal = new Map<string, number>();
  const porMesAtivo = new Map<string, Map<string, number>>();
  for (const d of divs) {
    const k = `${d.data.getFullYear()}-${String(d.data.getMonth() + 1).padStart(2, "0")}`;
    mensal.set(k, (mensal.get(k) ?? 0) + d.valorTotal);
    if (!porMesAtivo.has(k)) porMesAtivo.set(k, new Map());
    const m = porMesAtivo.get(k)!;
    const t = d.ativo?.ticker ?? "—";
    m.set(t, (m.get(t) ?? 0) + d.valorTotal);
  }

  const meses = [...mensal.keys()].sort();
  if (meses.length === 0) return insights;

  const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const valorAtual = mensal.get(mesAtual) ?? 0;
  const mesAnterior = meses.at(-2);
  const valorAnterior = mesAnterior ? (mensal.get(mesAnterior) ?? 0) : 0;

  // 1) Recorde mensal
  const recorde = Math.max(...mensal.values());
  if (valorAtual > 0 && valorAtual >= recorde && meses.length > 1) {
    insights.push({
      id: "recorde",
      tipo: "vitoria",
      titulo: `🏆 Recorde de proventos no mês`,
      detalhe: `R$ ${valorAtual.toFixed(2)} — sua maior média mensal até hoje.`,
    });
  }

  // 2) Comparação mês a mês
  if (valorAtual > 0 && valorAnterior > 0) {
    const variacao = (valorAtual - valorAnterior) / valorAnterior;
    if (Math.abs(variacao) >= 0.10) {
      insights.push({
        id: "mom",
        tipo: variacao > 0 ? "vitoria" : "info",
        titulo: variacao > 0
          ? `📈 +${(variacao * 100).toFixed(0)}% vs mês anterior`
          : `📉 ${(variacao * 100).toFixed(0)}% vs mês anterior`,
        detalhe: `Recebido este mês: R$ ${valorAtual.toFixed(2)} (antes R$ ${valorAnterior.toFixed(2)}).`,
      });
    }
  }

  // 3) Top pagador do mês
  const topMes = porMesAtivo.get(mesAtual);
  if (topMes && topMes.size > 0) {
    const sorted = [...topMes.entries()].sort((a, b) => b[1] - a[1]);
    const [topAtivo, topValor] = sorted[0];
    if (topValor > 0 && valorAtual > 0) {
      const pct = (topValor / valorAtual) * 100;
      insights.push({
        id: "top-mes",
        tipo: "info",
        titulo: `${topAtivo} foi seu top pagador neste mês`,
        detalhe: `R$ ${topValor.toFixed(2)} (${pct.toFixed(0)}% do total).`,
      });
    }
  }

  // 4) Marcos de patrimônio em dividendos acumulado
  const acumulado = divs.reduce((s, d) => s + d.valorTotal, 0);
  const marcos = [1000, 5000, 10000, 25000, 50000, 100000];
  for (const m of marcos) {
    if (acumulado >= m && acumulado < m * 1.1) {
      insights.push({
        id: `marco-${m}`,
        tipo: "marco",
        titulo: `🎯 Você passou de R$ ${m.toLocaleString("pt-BR")} em proventos acumulados`,
        detalhe: `Total recebido até hoje: R$ ${acumulado.toFixed(2)}.`,
      });
      break;
    }
  }

  // 5) Streak — meses consecutivos com proventos
  let streak = 0;
  for (let i = meses.length - 1; i >= 0; i--) {
    if ((mensal.get(meses[i]) ?? 0) > 0) streak++;
    else break;
  }
  if (streak >= 6) {
    insights.push({
      id: "streak",
      tipo: "vitoria",
      titulo: `🔥 ${streak} meses seguidos recebendo dividendos`,
      detalhe: `Consistência é o motor do longo prazo.`,
    });
  }

  return insights;
}
