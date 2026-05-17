import { cn } from "@/lib/cn";

export function KpiCard({
  label, value, hint, accent,
}: { label: string; value: string; hint?: string; accent?: "emerald" | "amber" | "rose" }) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div
        className={cn(
          "kpi-value",
          accent === "emerald" && "text-emerald-400",
          accent === "amber" && "text-amber-300",
          accent === "rose" && "text-rose-400",
        )}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-zinc-500 mt-2">{hint}</div>}
    </div>
  );
}
