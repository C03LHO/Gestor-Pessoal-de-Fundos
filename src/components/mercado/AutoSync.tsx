"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check } from "lucide-react";

type Estado =
  | { status: "idle" }
  | { status: "sync" }
  | { status: "ok"; ultima: Date; atualizou: boolean; cotacoes?: number; dividendos?: number }
  | { status: "skip"; ultima: Date }
  | { status: "erro"; msg: string };

export function AutoSync() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ status: "idle" });

  async function sincronizar(force = false) {
    setEstado({ status: "sync" });
    try {
      const r = await fetch(`/api/mercado/sync${force ? "?force=1" : ""}`, { method: "POST" });
      const j = await r.json();
      if (j.skipped) {
        setEstado({ status: "skip", ultima: new Date(j.ultimaAtualizacao) });
      } else {
        setEstado({
          status: "ok",
          ultima: new Date(j.ultimaAtualizacao),
          atualizou: true,
          cotacoes: j.cotacoesAtualizadas,
          dividendos: j.dividendosImportados,
        });
        router.refresh();
      }
    } catch (e: any) {
      setEstado({ status: "erro", msg: e?.message ?? "Erro" });
    }
  }

  useEffect(() => {
    sincronizar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs">
      <SyncBadge estado={estado} />
      <button
        onClick={() => sincronizar(true)}
        disabled={estado.status === "sync"}
        className="btn-ghost border border-zinc-800 !py-1 !px-2"
        aria-label="Atualizar"
        title="Forçar atualização"
      >
        <RefreshCw size={12} className={estado.status === "sync" ? "animate-spin" : ""} />
      </button>
    </div>
  );
}

function SyncBadge({ estado }: { estado: Estado }) {
  if (estado.status === "idle" || estado.status === "sync") {
    return (
      <span className="flex items-center gap-1.5 text-zinc-500">
        <RefreshCw size={12} className="animate-spin" />
        Sincronizando…
      </span>
    );
  }
  if (estado.status === "erro") {
    return <span className="text-rose-400">Falha: {estado.msg}</span>;
  }
  if (estado.status === "ok") {
    const detalhes: string[] = [];
    if (estado.cotacoes) detalhes.push(`${estado.cotacoes} cotações`);
    if (estado.dividendos) detalhes.push(`${estado.dividendos} dividendos`);
    return (
      <span className="flex items-center gap-1.5 text-emerald-400">
        <Check size={12} />
        Atualizado{detalhes.length ? ` · ${detalhes.join(", ")}` : ""}
      </span>
    );
  }
  return (
    <span className="text-zinc-500">
      Atualizado {tempoRelativo(estado.ultima)}
    </span>
  );
}

function tempoRelativo(d: Date) {
  const min = Math.round((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const dias = Math.round(h / 24);
  return `há ${dias}d`;
}
