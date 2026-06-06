"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { brl, dataBR } from "@/lib/format";

type Resultado = {
  ativos: { id: string; ticker: string; nome: string | null }[];
  lancamentos: { id: string; tipo: string; data: string; valorTotal: number; ativo: { ticker: string } | null }[];
};

export function BuscaGlobal() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Resultado>({ ativos: [], lancamentos: [] });

  // atalho Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setAberto((v) => !v);
      }
      if (e.key === "Escape") setAberto(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!aberto || !q.trim()) { setRes({ ativos: [], lancamentos: [] }); return; }
    const id = setTimeout(async () => {
      const r = await fetch(`/api/busca?q=${encodeURIComponent(q)}`);
      setRes(await r.json());
    }, 150);
    return () => clearTimeout(id);
  }, [q, aberto]);

  function navegar(href: string) {
    setAberto(false);
    setQ("");
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="btn-ghost border border-zinc-800 !p-2"
        aria-label="Buscar"
        title="Buscar (Ctrl+K)"
      >
        <Search size={14} />
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-[55] bg-black/70 flex items-start justify-center md:pt-24 px-4"
          style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}
          onClick={() => setAberto(false)}>{/* mobile fix: safe-area-inset-top em vez de pt fixo */}
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
              <Search size={16} className="text-zinc-500" />
              <input
                autoFocus
                placeholder="Buscar ticker, lançamento, observação..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="flex-1 bg-transparent outline-none text-base"
              />
              <button onClick={() => setAberto(false)} className="text-zinc-500" aria-label="Fechar busca"><X size={18} /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {res.ativos.length === 0 && res.lancamentos.length === 0 && q.trim() && (
                <p className="p-6 text-sm text-zinc-500 text-center">Nada encontrado.</p>
              )}

              {res.ativos.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-4 pt-3 pb-1">Ativos</div>
                  {res.ativos.map((a) => (
                    <button key={a.id} onClick={() => navegar(`/carteira/${a.ticker}`)}
                            className="w-full text-left px-4 py-2.5 hover:bg-zinc-900 flex justify-between items-center">
                      <div>
                        <div className="font-medium">{a.ticker}</div>
                        {a.nome && <div className="text-xs text-zinc-500 truncate">{a.nome}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {res.lancamentos.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-4 pt-3 pb-1">Lançamentos</div>
                  {res.lancamentos.map((l) => (
                    <button key={l.id} onClick={() => navegar(`/lancamentos`)}
                            className="w-full text-left px-4 py-2.5 hover:bg-zinc-900 flex justify-between items-center">
                      <div>
                        <div className="text-sm">
                          <span className="font-medium">{l.ativo?.ticker ?? "—"}</span>
                          <span className="text-zinc-500 ml-2">{l.tipo}</span>
                        </div>
                        <div className="text-xs text-zinc-500">{dataBR(l.data)}</div>
                      </div>
                      <span className="text-emerald-400 tabular-nums text-sm">{brl(l.valorTotal)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
              <span>Ctrl+K para abrir</span>
              <span>Esc para fechar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
