import { cn } from "@/lib/cn";
import type { Tendencia } from "@/lib/cripto/analise";

const MAP: Record<Tendencia, { texto: string; cls: string; seta: string }> = {
  ALTA:    { texto: "ALTA",    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", seta: "↑" },
  BAIXA:   { texto: "BAIXA",   cls: "bg-rose-500/15 text-rose-300 border-rose-500/30",          seta: "↓" },
  LATERAL: { texto: "LATERAL", cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",          seta: "→" },
};

export function TendenciaBadge({ tendencia }: { tendencia: Tendencia | null | undefined }) {
  const t = tendencia ?? "LATERAL";
  const m = MAP[t];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border leading-none", m.cls)}>
      <span>{m.seta}</span>
      {m.texto}
    </span>
  );
}
