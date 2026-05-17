export type PeriodoId = "1m" | "3m" | "6m" | "12m" | "ytd" | "all";

export function mesesDoPeriodo(id: string): number {
  if (id === "1m")  return 1;
  if (id === "3m")  return 3;
  if (id === "6m")  return 6;
  if (id === "12m") return 12;
  if (id === "ytd") return new Date().getMonth() + 1;
  if (id === "all") return 120;
  return 12;
}
