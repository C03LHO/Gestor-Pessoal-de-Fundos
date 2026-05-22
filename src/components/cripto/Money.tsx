"use client";
import { useMoeda } from "@/lib/cripto/moeda";

/** Renderiza valor em BRL ou USD conforme contexto. */
export function Money({ brl, usd, compacto = false, className }: {
  brl: number;
  usd?: number | null;
  compacto?: boolean;
  className?: string;
}) {
  const { formatar, formatarCompacto } = useMoeda();
  const txt = compacto ? formatarCompacto(brl, usd) : formatar(brl, usd);
  return <span className={className}>{txt}</span>;
}
