export const brl = (v: number) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (v: number, casas = 2) =>
  (v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const pct = (v: number, casas = 2) =>
  `${((v ?? 0) * 100).toFixed(casas).replace(".", ",")}%`;

export const formatarMeses = (m: number) => {
  if (!isFinite(m) || m < 0) return "—";
  const anos = Math.floor(m / 12);
  const meses = Math.round(m % 12);
  if (anos === 0) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  if (meses === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos}a ${meses}m`;
};

export const dataBR = (d: Date | string) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
};
