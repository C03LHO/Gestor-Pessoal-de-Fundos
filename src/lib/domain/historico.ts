import { prisma } from "../prisma";
import { somar, somarLista } from "../money";

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
  // Acumula em centavos no bucket para evitar drift
  const bucketsCent = new Map<string, number>();
  for (const k of buckets.keys()) bucketsCent.set(k, 0);
  for (const l of lancs) {
    const k = chave(l.data);
    if (bucketsCent.has(k)) bucketsCent.set(k, (bucketsCent.get(k) ?? 0) + Math.round(l.valorTotal * 100));
  }
  for (const [k, v] of bucketsCent) buckets.set(k, v / 100);

  const serie: SerieMensal = Array.from(buckets.entries()).map(([mes, valor]) => ({ mes, valor }));
  const total12  = somarLista(serie, (p) => p.valor);
  const ultimos6 = somarLista(serie.slice(-6), (p) => p.valor);
  const ultimos3 = somarLista(serie.slice(-3), (p) => p.valor);

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
