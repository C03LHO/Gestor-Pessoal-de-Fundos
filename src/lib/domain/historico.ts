import { prisma } from "../prisma";

export type SerieMensal = { mes: string; valor: number }[];

export type HistoricoAportes = {
  serie: SerieMensal;
  totalUltimos12m: number;
  mediaMensal12m: number;
  mediaMensal6m: number;
  mediaMensal3m: number;
};

/**
 * "Aporte" no sentido do simulador = dinheiro novo + reinvestimento de dividendos.
 * Conta COMPRA + REINVESTIMENTO + APORTE como capital adicionado à carteira.
 * Ignora VENDA e DIVIDENDO recebido (este último não é capital novo seu).
 */
export async function historicoAportes(meses = 12, carteiraId?: string): Promise<HistoricoAportes> {
  const ini = inicioDoMes();
  ini.setMonth(ini.getMonth() - (meses - 1));

  const lancs = await prisma.lancamento.findMany({
    where: {
      data: { gte: ini },
      tipo: { in: ["COMPRA", "REINVESTIMENTO", "APORTE"] },
      ...(carteiraId ? { carteiraId } : {}),
    },
    orderBy: { data: "asc" },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < meses; i++) {
    const d = new Date(ini);
    d.setMonth(ini.getMonth() + i);
    buckets.set(chave(d), 0);
  }
  for (const l of lancs) {
    const k = chave(l.data);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + l.valorTotal);
  }

  const serie: SerieMensal = Array.from(buckets.entries()).map(([mes, valor]) => ({ mes, valor }));
  const total12 = serie.reduce((s, p) => s + p.valor, 0);
  const ultimos6 = serie.slice(-6).reduce((s, p) => s + p.valor, 0);
  const ultimos3 = serie.slice(-3).reduce((s, p) => s + p.valor, 0);

  return {
    serie,
    totalUltimos12m: total12,
    mediaMensal12m: total12 / Math.min(meses, 12),
    mediaMensal6m: ultimos6 / 6,
    mediaMensal3m: ultimos3 / 3,
  };
}

function inicioDoMes(d: Date = new Date()) {
  const r = new Date(d);
  r.setDate(1); r.setHours(0, 0, 0, 0);
  return r;
}
function chave(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
