"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useMoeda } from "@/lib/cripto/moeda";
import { Money } from "@/components/cripto/Money";
import { formatQtd } from "@/lib/cripto/constants";

type Posicao = {
  cryptoId: string;
  symbol: string;
  nome: string;
  decimals: number;
  color: string;
  quantidade: number;
  custoTotal: number;
  precoMedio: number;
  precoAtual: number;
  valorAtual: number;
  lucroNaoRealizado: number;
  lucroNaoRealizadoPct: number;
  lucroRealizado: number;
};

type Resumo = {
  valorTotal: number;
  custoTotal: number;
  lucroNaoRealizado: number;
  lucroNaoRealizadoPct: number;
  lucroRealizado: number;
};

type PrecosMap = Record<string, { brl: number; usd: number | null }>;

export function CarteiraCriptoClient({
  posicoes,
  resumo,
  precosMap,
}: {
  posicoes: Posicao[];
  resumo: Resumo;
  precosMap: PrecosMap;
}) {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const { moeda } = useMoeda();

  const visiveis = useMemo(
    () => mostrarTodos ? posicoes : posicoes.filter((p) => p.quantidade > 0),
    [mostrarTodos, posicoes],
  );
  const temPosicao = posicoes.some((p) => p.quantidade > 0);

  // Converte valor BRL para USD usando o rate específico do ativo (precoUsd/precoBrl)
  function usdDoAtivo(brlValue: number, cryptoId: string): number | null {
    const p = precosMap[cryptoId];
    if (!p || !p.usd || !p.brl) return null;
    return brlValue * (p.usd / p.brl);
  }

  // Resumo agregado em USD: precisa converter cada parcela. Usa rate médio ponderado.
  const totalUsd = useMemo(() => {
    if (moeda !== "USD") return null;
    return posicoes.reduce((acc, p) => {
      const u = usdDoAtivo(p.valorAtual, p.cryptoId);
      return acc + (u ?? 0);
    }, 0);
  }, [posicoes, moeda]);

  const custoUsd = useMemo(() => {
    if (moeda !== "USD") return null;
    return posicoes.reduce((acc, p) => {
      const u = usdDoAtivo(p.custoTotal, p.cryptoId);
      return acc + (u ?? 0);
    }, 0);
  }, [posicoes, moeda]);

  const lucroNaoRealUsd = useMemo(() => {
    if (moeda !== "USD") return null;
    return posicoes.reduce((acc, p) => acc + (usdDoAtivo(p.lucroNaoRealizado, p.cryptoId) ?? 0), 0);
  }, [posicoes, moeda]);

  const lucroRealUsd = useMemo(() => {
    if (moeda !== "USD") return null;
    return posicoes.reduce((acc, p) => acc + (usdDoAtivo(p.lucroRealizado, p.cryptoId) ?? 0), 0);
  }, [posicoes, moeda]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Carteira cripto</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiBox label="Valor atual"   brl={resumo.valorTotal}        usd={totalUsd ?? undefined} />
        <KpiBox label="Custo total"   brl={resumo.custoTotal}        usd={custoUsd ?? undefined} />
        <KpiBox
          label="P/L não realizado"
          brl={resumo.lucroNaoRealizado}
          usd={lucroNaoRealUsd ?? undefined}
          sub={`${resumo.lucroNaoRealizadoPct >= 0 ? "+" : ""}${resumo.lucroNaoRealizadoPct.toFixed(2)}%`}
          cor={resumo.lucroNaoRealizado >= 0 ? "emerald" : "rose"}
        />
        <KpiBox
          label="P/L realizado"
          brl={resumo.lucroRealizado}
          usd={lucroRealUsd ?? undefined}
          cor={resumo.lucroRealizado >= 0 ? "emerald" : "rose"}
        />
      </div>

      {/* Toggle mostrar todos */}
      {temPosicao && (
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarTodos}
            onChange={(e) => setMostrarTodos(e.target.checked)}
            className="accent-emerald-500"
          />
          Mostrar todos os ativos (incluindo sem posição)
        </label>
      )}

      {/* Empty state */}
      {!temPosicao ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center space-y-3">
          <p className="text-zinc-400">Nenhuma posição aberta. Adicione um lançamento para começar.</p>
          <Link
            href="/cripto/lancamentos"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-zinc-950 text-sm font-semibold"
          >
            <Plus size={14} /> Novo lançamento
          </Link>
        </div>
      ) : (
        <>
          {/* Tabela (desktop) */}
          <div className="hidden md:block rounded-xl border border-zinc-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-zinc-900/60 text-zinc-400 text-xs">
                <tr>
                  <th className="text-left px-3 py-2">Ativo</th>
                  <th className="text-right px-3 py-2">Quantidade</th>
                  <th className="text-right px-3 py-2">Preço médio</th>
                  <th className="text-right px-3 py-2">Preço atual</th>
                  <th className="text-right px-3 py-2">Custo</th>
                  <th className="text-right px-3 py-2">Valor atual</th>
                  <th className="text-right px-3 py-2">P/L não realizado</th>
                  <th className="text-right px-3 py-2">P/L realizado</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => (
                  <tr key={p.cryptoId} className="border-t border-zinc-800">
                    <td className="px-3 py-2">
                      <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: p.color }} />
                      <span className="font-semibold">{p.symbol}</span>{" "}
                      <span className="text-zinc-500 text-xs">{p.nome}</span>
                    </td>
                    <td className="text-right px-3 py-2 font-mono text-xs">
                      {p.quantidade > 0 ? formatQtd(p.quantidade, p.cryptoId) : "—"}
                    </td>
                    <td className="text-right px-3 py-2">
                      {p.precoMedio > 0
                        ? <Money brl={p.precoMedio} usd={usdDoAtivo(p.precoMedio, p.cryptoId)} />
                        : "—"}
                    </td>
                    <td className="text-right px-3 py-2">
                      <Money brl={p.precoAtual} usd={precosMap[p.cryptoId]?.usd ?? null} />
                    </td>
                    <td className="text-right px-3 py-2">
                      {p.custoTotal > 0
                        ? <Money brl={p.custoTotal} usd={usdDoAtivo(p.custoTotal, p.cryptoId)} />
                        : "—"}
                    </td>
                    <td className="text-right px-3 py-2">
                      {p.quantidade > 0
                        ? <Money brl={p.valorAtual} usd={usdDoAtivo(p.valorAtual, p.cryptoId)} />
                        : "—"}
                    </td>
                    <td className={`text-right px-3 py-2 ${p.lucroNaoRealizado >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {p.quantidade > 0 ? (
                        <>
                          <Money brl={p.lucroNaoRealizado} usd={usdDoAtivo(p.lucroNaoRealizado, p.cryptoId)} />
                          {" "}({p.lucroNaoRealizadoPct >= 0 ? "+" : ""}{p.lucroNaoRealizadoPct.toFixed(2)}%)
                        </>
                      ) : "—"}
                    </td>
                    <td className={`text-right px-3 py-2 ${p.lucroRealizado >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {p.lucroRealizado !== 0
                        ? <Money brl={p.lucroRealizado} usd={usdDoAtivo(p.lucroRealizado, p.cryptoId)} />
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <div className="md:hidden space-y-3">
            {visiveis.map((p) => (
              <div key={p.cryptoId} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="font-semibold">{p.symbol}</span>
                    <span className="text-xs text-zinc-500">{p.nome}</span>
                  </div>
                  {p.quantidade === 0 && <span className="text-[10px] text-zinc-600">sem posição</span>}
                </div>
                {p.quantidade > 0 ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Item label="Quantidade" valor={formatQtd(p.quantidade, p.cryptoId)} mono />
                    <Item label="Preço médio" node={<Money brl={p.precoMedio} usd={usdDoAtivo(p.precoMedio, p.cryptoId)} />} />
                    <Item label="Valor atual" node={<Money brl={p.valorAtual} usd={usdDoAtivo(p.valorAtual, p.cryptoId)} />} />
                    <Item
                      label="P/L"
                      node={
                        <span className={p.lucroNaoRealizado >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          <Money brl={p.lucroNaoRealizado} usd={usdDoAtivo(p.lucroNaoRealizado, p.cryptoId)} />
                          <br />
                          <span className="text-[10px]">
                            {p.lucroNaoRealizadoPct >= 0 ? "+" : ""}{p.lucroNaoRealizadoPct.toFixed(2)}%
                          </span>
                        </span>
                      }
                    />
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Preço atual: <Money brl={p.precoAtual} usd={precosMap[p.cryptoId]?.usd ?? null} />
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KpiBox({ label, brl, usd, sub, cor }: { label: string; brl: number; usd?: number; sub?: string; cor?: "emerald" | "rose" }) {
  const corClasse = cor === "emerald" ? "text-emerald-400" : cor === "rose" ? "text-rose-400" : "text-zinc-100";
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="text-[11px] text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold ${corClasse}`}>
        <Money brl={brl} usd={usd ?? null} />
      </div>
      {sub && <div className={`text-xs ${corClasse}`}>{sub}</div>}
    </div>
  );
}

function Item({ label, valor, node, mono }: { label: string; valor?: string; node?: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
      <div className={`text-zinc-100 ${mono ? "font-mono text-xs" : ""}`}>{node ?? valor}</div>
    </div>
  );
}
