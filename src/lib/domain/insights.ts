import { prisma } from "../prisma";

export async function dividendosPorMes(mesesAtras = 12, carteiraId?: string) {
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - mesesAtras);
  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);

  const lancs = await prisma.lancamento.findMany({
    where: {
      tipo: "DIVIDENDO",
      data: { gte: inicio },
      ...(carteiraId ? { carteiraId } : {}),
    },
    orderBy: { data: "asc" },
  });

  const mapa = new Map<string, number>();
  for (let i = 0; i <= mesesAtras; i++) {
    const d = new Date(inicio);
    d.setMonth(inicio.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    mapa.set(key, 0);
  }
  for (const l of lancs) {
    const key = `${l.data.getFullYear()}-${String(l.data.getMonth() + 1).padStart(2, "0")}`;
    mapa.set(key, (mapa.get(key) ?? 0) + l.valorTotal);
  }

  return Array.from(mapa.entries()).map(([mes, total]) => ({ mes, total }));
}

export async function dividendosDoMes(carteiraId?: string) {
  const ini = new Date();
  ini.setDate(1); ini.setHours(0, 0, 0, 0);
  const fim = new Date(ini);
  fim.setMonth(fim.getMonth() + 1);

  const r = await prisma.lancamento.aggregate({
    _sum: { valorTotal: true },
    where: {
      tipo: "DIVIDENDO",
      data: { gte: ini, lt: fim },
      ...(carteiraId ? { carteiraId } : {}),
    },
  });
  return r._sum.valorTotal ?? 0;
}
