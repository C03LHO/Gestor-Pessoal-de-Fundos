"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Wallet, LogOut, Coins } from "lucide-react";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/ux/haptic";

type Carteira = { id: string; nome: string; cor: string | null; tipo?: string | null };

export function CarteiraSwitcher({ ativaId, carteiras }: { ativaId: string; carteiras: Carteira[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [novaNome, setNovaNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<"FII" | "CRIPTO">("FII");
  const [criando, setCriando] = useState(false);
  const ativa = carteiras.find((c) => c.id === ativaId) ?? carteiras[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const alvo = e.target as HTMLElement;
      if (!alvo.closest("[data-carteira-menu]")) setAberto(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  async function trocar(id: string) {
    haptic("leve");
    await fetch("/api/carteiras/ativa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAberto(false);
    const alvo = carteiras.find((c) => c.id === id);
    const tipoAlvo = (alvo?.tipo === "CRIPTO" ? "CRIPTO" : "FII") as "FII" | "CRIPTO";
    const tipoAtual = (ativa?.tipo === "CRIPTO" ? "CRIPTO" : "FII") as "FII" | "CRIPTO";
    if (tipoAlvo !== tipoAtual) {
      window.location.href = tipoAlvo === "CRIPTO" ? "/cripto" : "/";
    } else {
      router.refresh();
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!novaNome.trim()) return;
    setCriando(true);
    try {
      const r = await fetch("/api/carteiras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novaNome.trim(), tipo: novoTipo }),
      });
      if (!r.ok) { alert(await r.text()); return; }
      const nova = await r.json();
      setNovaNome("");
      await trocar(nova.id);
    } finally { setCriando(false); }
  }

  async function logoutAll() {
    if (!confirm("Desconectar TODOS os dispositivos? Você precisará fazer login de novo em todos eles.")) return;
    await fetch("/api/auth/logout-all", { method: "POST" });
    window.location.href = "/login";
  }

  const tipoAtiva = (ativa?.tipo === "CRIPTO" ? "CRIPTO" : "FII") as "FII" | "CRIPTO";

  return (
    <div className="relative" data-carteira-menu>
      <button
        onClick={() => setAberto((v) => !v)}
        className="btn-ghost border border-zinc-800 !py-1 !px-2 gap-1.5"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: ativa?.cor ?? "#10b981" }}
        />
        <span className="text-sm font-medium truncate max-w-[100px]">{ativa?.nome ?? "—"}</span>
        {tipoAtiva === "CRIPTO" && (
          <span className="text-[9px] font-semibold px-1 py-[1px] rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 leading-none">
            CRIPTO
          </span>
        )}
        <ChevronDown size={12} className="text-zinc-500" />
      </button>

      {aberto && (
        <div className="absolute left-0 top-full mt-2 z-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-[min(20rem,calc(100vw-2rem))] overflow-hidden">
          <div className="p-1">
            {carteiras.map((c) => {
              const cripto = c.tipo === "CRIPTO";
              return (
                <button
                  key={c.id}
                  onClick={() => trocar(c.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-zinc-800 active:bg-zinc-800",
                    c.id === ativaId && "bg-zinc-800/50 text-white",
                  )}
                >
                  {cripto ? <Coins size={14} className="text-amber-400" /> : <Wallet size={14} className="text-zinc-500" />}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: c.cor ?? "#10b981" }}
                  />
                  <span className="flex-1 text-left truncate">{c.nome}</span>
                  {cripto && (
                    <span className="text-[9px] font-semibold px-1 py-[1px] rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 leading-none">
                      CRIPTO
                    </span>
                  )}
                  {c.id === ativaId && <span className="text-[10px] text-emerald-400">atual</span>}
                </button>
              );
            })}
          </div>
          <form onSubmit={criar} className="border-t border-zinc-800 p-2 flex flex-col gap-1">
            <div className="flex gap-1">
              <input
                className="input !min-h-[44px] !py-1.5 !text-base flex-1"
                placeholder="Nova carteira..."
                value={novaNome}
                onChange={(e) => setNovaNome(e.target.value)}
                maxLength={40}
              />
              <button type="submit" disabled={criando || !novaNome.trim()}
                      className="px-2 rounded-lg bg-emerald-500 text-zinc-950 disabled:opacity-40">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex gap-1 text-[11px]">
              <button type="button" onClick={() => setNovoTipo("FII")}
                className={cn("flex-1 px-2 py-1 rounded border",
                  novoTipo === "FII" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 text-zinc-400")}>
                FII
              </button>
              <button type="button" onClick={() => setNovoTipo("CRIPTO")}
                className={cn("flex-1 px-2 py-1 rounded border",
                  novoTipo === "CRIPTO" ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-zinc-800 text-zinc-400")}>
                Cripto
              </button>
            </div>
          </form>
          <button
            onClick={logoutAll}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 border-t border-zinc-800"
          >
            <LogOut size={12} /> Desconectar todos os dispositivos
          </button>
        </div>
      )}
    </div>
  );
}
