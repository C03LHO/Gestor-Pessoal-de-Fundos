"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import type { PeriodoId } from "@/lib/periodo";

const PERIODOS: { id: PeriodoId; label: string }[] = [
  { id: "1m",  label: "1m"  },
  { id: "3m",  label: "3m"  },
  { id: "6m",  label: "6m"  },
  { id: "12m", label: "12m" },
  { id: "ytd", label: "YTD" },
  { id: "all", label: "All" },
];

export function FiltroPeriodo({ atual }: { atual: PeriodoId }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function trocar(id: PeriodoId) {
    const p = new URLSearchParams(searchParams);
    p.set("periodo", id);
    router.push(`?${p.toString()}`);
  }

  return (
    <div className="inline-flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
      {PERIODOS.map((p) => (
        <button
          key={p.id}
          onClick={() => trocar(p.id)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded transition",
            atual === p.id
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-zinc-100",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

