"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, X, MoreVertical, ChevronRight } from "lucide-react";
import { brl, num, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { mensagemErro } from "@/lib/erro-api";

type Posicao = {
  ativoId: string;
  ticker: string;
  nome: string | null;
  segmento: string | null;
  cotas: number;
  precoMedio: number;
  investido: number;
  precoAtual: number | null;
  valorAtual: number;
  dividendos12m: number;
  yieldOnCost: number;
};

function MiniItem({ label, valor, accent }: {
  label: string; valor: string;
  accent?: "emerald" | "rose";
}) {
  return (
    <div className="flex justify-between items-baseline min-w-0">
      <span className="text-zinc-500 whitespace-nowrap mr-2">{label}</span>
      <span className={cn(
        "tabular-nums truncate font-medium",
        accent === "emerald" && "text-emerald-400",
        accent === "rose" && "text-rose-400",
      )}>{valor}</span>
    </div>
  );
}

export function CarteiraClient({ posicoes, patrimonio }: { posicoes: Posicao[]; patrimonio: number }) {
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Posicao | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function excluirAtivo() {
    if (!confirmando) return;
    setCarregando(true);
    try {
      const r = await fetch(`/api/ativos/${confirmando.ativoId}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) {
        alert("Falha ao excluir: " + (await mensagemErro(r)));
        return;
      }
      setConfirmando(null);
      router.refresh();
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Carteira</h1>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
          {posicoes.length} ativos · {brl(patrimonio)}
        </p>
      </header>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {posicoes.length === 0 ? (
          <p className="text-sm text-zinc-500 p-4 card">
            Sua carteira está vazia. Registre sua primeira compra em Lançamentos.
          </p>
        ) : (
          posicoes.map((p) => {
            const variacao = p.investido > 0 ? p.valorAtual / p.investido - 1 : 0;
            return (
              <Link
                key={p.ativoId}
                href={`/carteira/${p.ticker}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 active:bg-zinc-900/80 transition"
              >
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base">{p.ticker}</span>
                      {p.segmento && (
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                          {p.segmento}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-zinc-600 shrink-0" />
                </div>

                <div className="flex justify-between items-baseline mb-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Valor atual</div>
                    <div className="text-xl font-semibold tabular-nums truncate">{brl(p.valorAtual)}</div>
                  </div>
                  <div className={cn(
                    "text-sm font-medium tabular-nums whitespace-nowrap",
                    variacao >= 0 ? "text-emerald-400" : "text-rose-400",
                  )}>
                    {variacao >= 0 ? "+" : ""}{pct(variacao)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs border-t border-zinc-800 pt-3">
                  <MiniItem label="Cotas"      valor={num(p.cotas, 0)} />
                  <MiniItem label="PM"         valor={brl(p.precoMedio)} />
                  <MiniItem label="Cotação"    valor={p.precoAtual != null ? brl(p.precoAtual) : "—"} />
                  <MiniItem label="% cart."    valor={pct(p.valorAtual / (patrimonio || 1))} />
                  <MiniItem label="Div. 12m"   valor={brl(p.dividendos12m)} accent="emerald" />
                  <MiniItem label="YoC"        valor={pct(p.yieldOnCost)} accent="emerald" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block card overflow-x-auto p-0">
        {posicoes.length === 0 ? (
          <p className="text-sm text-zinc-500 p-6">
            Sua carteira está vazia. Vá em Lançamentos e registre sua primeira compra —
            o ativo é criado automaticamente.
          </p>
        ) : (
          <table className="table min-w-[960px]">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Segmento</th>
                <th className="text-right">Cotas</th>
                <th className="text-right">PM</th>
                <th className="text-right">Cotação</th>
                <th className="text-right">Investido</th>
                <th className="text-right">Valor atual</th>
                <th className="text-right">Var.</th>
                <th className="text-right">Div. 12m</th>
                <th className="text-right">YoC</th>
                <th className="text-right">% cart.</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {posicoes.map((p) => {
                const variacao = p.investido > 0 ? p.valorAtual / p.investido - 1 : 0;
                return (
                  <tr key={p.ativoId} className="relative">
                    <td>
                      <Link href={`/carteira/${p.ticker}`} className="hover:text-emerald-300">
                        <div className="font-medium">{p.ticker}</div>
                        <div className="text-xs text-zinc-500 max-w-[180px] truncate">{p.nome ?? ""}</div>
                      </Link>
                    </td>
                    <td className="text-zinc-400">{p.segmento ?? "—"}</td>
                    <td className="text-right">{num(p.cotas, 0)}</td>
                    <td className="text-right">{brl(p.precoMedio)}</td>
                    <td className="text-right">{p.precoAtual != null ? brl(p.precoAtual) : "—"}</td>
                    <td className="text-right">{brl(p.investido)}</td>
                    <td className="text-right font-medium">{brl(p.valorAtual)}</td>
                    <td className={cn("text-right", variacao >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {pct(variacao)}
                    </td>
                    <td className="text-right text-emerald-400">{brl(p.dividendos12m)}</td>
                    <td className="text-right">{pct(p.yieldOnCost)}</td>
                    <td className="text-right text-zinc-400">
                      {pct(p.valorAtual / (patrimonio || 1))}
                    </td>
                    <td className="text-right relative">
                      <button
                        className="text-zinc-400 hover:text-zinc-100 p-1"
                        onClick={() => setMenuAberto(menuAberto === p.ativoId ? null : p.ativoId)}
                      >
                        <MoreVertical size={14} />
                      </button>
                      {menuAberto === p.ativoId && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)} />
                          <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl min-w-[160px]">
                            <button
                              className="w-full text-left px-3 py-2 text-sm text-rose-400 hover:bg-zinc-800 flex items-center gap-2"
                              onClick={() => { setMenuAberto(null); setConfirmando(p); }}
                            >
                              <Trash2 size={14} /> Remover da carteira
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {confirmando && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center md:p-4">
          <div
            className="bg-zinc-950 w-full md:max-w-md rounded-t-2xl md:rounded-2xl border border-zinc-800 p-5"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Remover {confirmando.ticker}?</h2>
            <p className="text-sm text-zinc-400 mt-2">
              O ativo será removido. Os lançamentos associados serão mantidos sem vínculo.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                className="min-h-[48px] rounded-lg border border-zinc-800 text-zinc-300 font-medium active:bg-zinc-800"
                onClick={() => setConfirmando(null)}
                disabled={carregando}
              >
                Cancelar
              </button>
              <button
                className="min-h-[48px] rounded-lg bg-rose-500 text-zinc-950 font-medium hover:bg-rose-400 disabled:opacity-50"
                onClick={excluirAtivo}
                disabled={carregando}
              >
                {carregando ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
