"use client";
import { useMoeda } from "@/lib/cripto/moeda";
import { cn } from "@/lib/cn";

export function MoedaToggle() {
  const { moeda, setMoeda } = useMoeda();
  return (
    <div className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 text-[11px] font-semibold">
      <button
        onClick={() => setMoeda("BRL")}
        className={cn(
          "px-2 py-1 rounded-md transition",
          moeda === "BRL" ? "bg-emerald-500/15 text-emerald-300" : "text-zinc-500 hover:text-zinc-300",
        )}
      >
        BRL
      </button>
      <button
        onClick={() => setMoeda("USD")}
        className={cn(
          "px-2 py-1 rounded-md transition",
          moeda === "USD" ? "bg-emerald-500/15 text-emerald-300" : "text-zinc-500 hover:text-zinc-300",
        )}
      >
        USD
      </button>
    </div>
  );
}
