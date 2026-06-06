"use client";
import Link from "next/link";
import { TrendingUp, ArrowRight, AlertTriangle } from "lucide-react";
import { Money } from "@/components/cripto/Money";
import { Sparkline } from "@/components/cripto/Sparkline";
import { TendenciaBadge } from "@/components/cripto/TendenciaBadge";
import { useMoeda } from "@/lib/cripto/moeda";
import { formatQtd, CRYPTO_BY_ID, TIPO_LANCAMENTO_META, type TipoTransacao } from "@/lib/cripto/constants";
import { dataBR } from "@/lib/format";
import { sinalLabel, type SinalFinal, type Tendencia } from "@/lib/cripto/analise";
import { cn } from "@/lib/cn";

type Mercado = {
  cryptoId: string;
  symbol: string;
  nome: string;
  color: string;
  precoBrl: number;
  precoUsd: number | null;
  variacao24h: number | null;
  variacao7d: number | null;
  volume24hBrl: number | null;
  offline: boolean;
  sparkline: { t: number; p: number }[];
  score: number | null;
  sinal: SinalFinal | null;
  tendencia: Tendencia | null;
  resumo: string;
};

type Posicao = {
  cryptoId: string; symbol: string; nome: string; color: string;
  quantidade: number; precoMedio: number; valorAtual: number;
  lucroNaoRealizado: number; lucroNaoRealizadoPct: number;
};

type Resumo = {
  valorTotal: number; custoTotal: number;
  lucroNaoRealizado: number; lucroNaoRealizadoPct: number;
  lucroRealizado: number;
  variacaoDia: number; variacaoDiaPct: number;
};

type Lanc = {
  id: string; tipo: TipoTransacao; data: string;
  cryptoId: string; quantidade: number; valorTotal: number;
};

const CORES_SINAL: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  sky:     "bg-sky-500/15 text-sky-300 border-sky-500/40",
  zinc:    "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
  amber:   "bg-amber-500/15 text-amber-300 border-amber-500/40",
  rose:    "bg-rose-500/15 text-rose-300 border-rose-500/40",
};
const CORES_BARRA: Record<string, string> = {
  emerald: "bg-emerald-500", sky: "bg-sky-500", zinc: "bg-zinc-500", amber: "bg-amber-500", rose: "bg-rose-500",
};

export function DashboardCriptoClient({
  mercado, resumo, posicoes, lancamentosRecentes, dominante, valorCarteiraSerie, algumOffline,
}: {
  mercado: Mercado[];
  resumo: Resumo;
  posicoes: Posicao[];
  lancamentosRecentes: Lanc[];
  dominante: Mercado | null;
  valorCarteiraSerie: { t: number; v: number }[];
  algumOffline: boolean;
}) {
  const { moeda, rate } = useMoeda();
  const posicoesAbertas = posicoes.filter((p) => p.quantidade > 0);
  const oportunidadesOrdenadas = [...mercado].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  // Alerta de variação brusca: ativos que você possui com |Δ24h| >= 10%.
  const LIMIAR_VARIACAO_24H = 10;
  const alertasVariacao = posicoesAbertas
    .map((p) => {
      const v = mercado.find((x) => x.cryptoId === p.cryptoId)?.variacao24h ?? null;
      return v != null && Math.abs(v) >= LIMIAR_VARIACAO_24H ? { symbol: p.symbol, v } : null;
    })
    .filter((x): x is { symbol: string; v: number } => x !== null)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));

  // Stats do desempenho 30d
  const valores = valorCarteiraSerie.map((s) => s.v).filter((v) => v > 0);
  const maxValor = valores.length ? Math.max(...valores) : 0;
  const minValor = valores.length ? Math.min(...valores) : 0;
  const valorInicial = valorCarteiraSerie.find((s) => s.v > 0)?.v ?? 0;
  const valorAtual = valorCarteiraSerie[valorCarteiraSerie.length - 1]?.v ?? 0;
  const variacaoDesdeInicio = valorInicial > 0 ? ((valorAtual - valorInicial) / valorInicial) * 100 : 0;

  // Função auxiliar para converter BRL→USD por ativo
  function usdDoAtivo(brlValue: number, cryptoId: string): number | null {
    const m = mercado.find((x) => x.cryptoId === cryptoId);
    if (!m || !m.precoUsd || !m.precoBrl) return null;
    return brlValue * (m.precoUsd / m.precoBrl);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Cripto — Início</h1>
        {algumOffline && (
          <span className="text-[10px] font-semibold px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Dados desatualizados (offline)
          </span>
        )}
      </div>

      {/* Alerta de variação brusca nos ativos da carteira */}
      {alertasVariacao.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-300 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-100">
            <span className="font-semibold">Variação brusca em 24h: </span>
            {alertasVariacao.map((a, i) => (
              <span key={a.symbol}>
                {i > 0 && ", "}
                {a.symbol}{" "}
                <span className={a.v >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {a.v >= 0 ? "+" : ""}{a.v.toFixed(1)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* (A) KPIs principais — 5 colunas em desktop */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Valor da carteira" brl={resumo.valorTotal} usd={resumo.valorTotal / rate} />
        <Kpi
          label="Variação 24h"
          brl={resumo.variacaoDia}
          usd={resumo.variacaoDia / rate}
          sub={`${resumo.variacaoDiaPct >= 0 ? "+" : ""}${resumo.variacaoDiaPct.toFixed(2)}%`}
          cor={resumo.variacaoDia >= 0 ? "emerald" : "rose"}
        />
        <Kpi label="Total investido" brl={resumo.custoTotal} usd={resumo.custoTotal / rate} />
        <Kpi
          label="P/L não realizado"
          brl={resumo.lucroNaoRealizado}
          usd={resumo.lucroNaoRealizado / rate}
          sub={`${resumo.lucroNaoRealizadoPct >= 0 ? "+" : ""}${resumo.lucroNaoRealizadoPct.toFixed(2)}%`}
          cor={resumo.lucroNaoRealizado >= 0 ? "emerald" : "rose"}
        />
        <Kpi
          label="P/L realizado"
          brl={resumo.lucroRealizado}
          usd={resumo.lucroRealizado / rate}
          cor={resumo.lucroRealizado >= 0 ? "emerald" : "rose"}
        />
      </div>

      {/* (F) Dominância de mercado */}
      {dominante && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <span className="text-xs text-zinc-400">Maior alta 24h:</span>
            <span className="font-semibold">{dominante.symbol}</span>
          </div>
          <span className="text-emerald-400 text-sm font-semibold">
            +{(dominante.variacao24h ?? 0).toFixed(2)}%
          </span>
        </div>
      )}

      {/* (B) Cards de mercado */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 mb-2">Mercado</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {mercado.map((m) => (
            <div key={m.cryptoId} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: m.color }} />
                  <span className="font-semibold">{m.symbol}</span>
                  <span className="text-xs text-zinc-500">{m.nome}</span>
                </div>
                <TendenciaBadge tendencia={m.tendencia} />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-lg font-semibold">
                    <Money brl={m.precoBrl} usd={m.precoUsd} />
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    {m.variacao24h !== null && (
                      <span className={m.variacao24h >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        24h {m.variacao24h >= 0 ? "+" : ""}{m.variacao24h.toFixed(2)}%
                      </span>
                    )}
                    {m.variacao7d !== null && (
                      <span className={m.variacao7d >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        7d {m.variacao7d >= 0 ? "+" : ""}{m.variacao7d.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  {m.volume24hBrl != null && (
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      Vol 24h: <Money brl={m.volume24hBrl} usd={usdDoAtivo(m.volume24hBrl, m.cryptoId)} compacto />
                    </div>
                  )}
                </div>
                <Sparkline pontos={m.sparkline} cor="auto" largura={100} altura={32} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* (C) Resumo de Oportunidade */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-400">Resumo de oportunidade</h2>
          <Link href="/cripto/oportunidades" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            Ver análise completa <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {oportunidadesOrdenadas.map((m) => {
            const sinal = m.sinal ? sinalLabel(m.sinal) : { texto: "—", cor: "zinc", emoji: "⚪" };
            const score = m.score ?? 0;
            return (
              <Link
                key={m.cryptoId}
                href={`/cripto/oportunidades#opp-${m.cryptoId}`}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 hover:border-zinc-700 transition flex items-center gap-3"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                <span className="font-semibold text-sm w-12">{m.symbol}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CORES_SINAL[sinal.cor]}`}>
                  {sinal.emoji} {sinal.texto}
                </span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden flex-1">
                    <div className={`h-full ${CORES_BARRA[sinal.cor]}`} style={{ width: `${score}%` }} />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 w-9 text-right">{score}/100</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* (D) Desempenho da Carteira */}
      {posicoesAbertas.length > 0 && valorCarteiraSerie.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 mb-2">Desempenho da carteira (30 dias)</h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <Sparkline
              pontos={valorCarteiraSerie.map((s) => ({ t: s.t, p: s.v }))}
              cor="auto"
              largura={1000}
              altura={64}
            />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Mini label="Maior valor" brl={maxValor} usd={maxValor / rate} />
              <Mini label="Menor valor" brl={minValor} usd={minValor / rate} />
              <div className="bg-zinc-950/40 border border-zinc-800 rounded p-2">
                <div className="text-[10px] text-zinc-500 uppercase">Variação 30d</div>
                <div className={variacaoDesdeInicio >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {variacaoDesdeInicio >= 0 ? "+" : ""}{variacaoDesdeInicio.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Posições abertas */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 mb-2">Posições abertas</h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-zinc-400 text-xs">
              <tr>
                <th className="text-left px-3 py-2">Ativo</th>
                <th className="text-right px-3 py-2">Quantidade</th>
                <th className="text-right px-3 py-2">Preço médio</th>
                <th className="text-right px-3 py-2 hidden sm:table-cell">Valor atual</th>
                <th className="text-right px-3 py-2">P/L</th>
              </tr>
            </thead>
            <tbody>
              {posicoesAbertas.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-zinc-500 py-6">Nenhuma posição aberta.</td></tr>
              ) : posicoesAbertas.map((p) => (
                <tr key={p.cryptoId} className="border-t border-zinc-800">
                  <td className="px-3 py-2">
                    <span className="font-semibold">{p.symbol}</span>{" "}
                    <span className="text-zinc-500 text-xs">{p.nome}</span>
                  </td>
                  <td className="text-right px-3 py-2 font-mono text-xs">{formatQtd(p.quantidade, p.cryptoId)}</td>
                  <td className="text-right px-3 py-2">
                    <Money brl={p.precoMedio} usd={usdDoAtivo(p.precoMedio, p.cryptoId)} />
                  </td>
                  <td className="text-right px-3 py-2 hidden sm:table-cell">
                    <Money brl={p.valorAtual} usd={usdDoAtivo(p.valorAtual, p.cryptoId)} />
                  </td>
                  <td className={`text-right px-3 py-2 ${p.lucroNaoRealizado >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    <Money brl={p.lucroNaoRealizado} usd={usdDoAtivo(p.lucroNaoRealizado, p.cryptoId)} />
                    <br />
                    <span className="text-[10px]">{p.lucroNaoRealizadoPct >= 0 ? "+" : ""}{p.lucroNaoRealizadoPct.toFixed(2)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* (E) Últimos Lançamentos */}
      {lancamentosRecentes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-zinc-400">Últimos lançamentos</h2>
            <Link href="/cripto/lancamentos" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-zinc-400 text-xs">
                <tr>
                  <th className="text-left px-3 py-2">Data</th>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-left px-3 py-2">Ativo</th>
                  <th className="text-right px-3 py-2">Qtd</th>
                  <th className="text-right px-3 py-2 hidden sm:table-cell">Valor</th>
                </tr>
              </thead>
              <tbody>
                {lancamentosRecentes.map((l) => {
                  const meta = CRYPTO_BY_ID[l.cryptoId];
                  const tipoMeta = TIPO_LANCAMENTO_META[l.tipo] ?? { label: l.tipo, cor: "zinc", descricao: "" };
                  return (
                    <tr key={l.id} className="border-t border-zinc-800">
                      <td className="px-3 py-2 text-xs">{dataBR(l.data)}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                          tipoMeta.cor === "emerald" && "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
                          tipoMeta.cor === "rose" && "bg-rose-500/15 text-rose-300 border-rose-500/30",
                          tipoMeta.cor === "amber" && "bg-amber-500/15 text-amber-300 border-amber-500/30",
                          tipoMeta.cor === "sky" && "bg-sky-500/15 text-sky-300 border-sky-500/30",
                        )}>
                          {tipoMeta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2"><strong>{meta?.symbol ?? l.cryptoId}</strong></td>
                      <td className="text-right px-3 py-2 font-mono text-xs">{formatQtd(l.quantidade, l.cryptoId)}</td>
                      <td className="text-right px-3 py-2 hidden sm:table-cell">
                        {l.valorTotal > 0
                          ? <Money brl={l.valorTotal} usd={usdDoAtivo(l.valorTotal, l.cryptoId)} />
                          : <span className="text-zinc-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-[10px] text-zinc-600 italic">
        Análise baseada em dados históricos. Não é recomendação de investimento.
      </p>
    </div>
  );
}

function Kpi({ label, brl, usd, sub, cor }: { label: string; brl: number; usd?: number | null; sub?: string; cor?: "emerald" | "rose" }) {
  const corClasse = cor === "emerald" ? "text-emerald-400" : cor === "rose" ? "text-rose-400" : "text-zinc-100";
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="text-[11px] text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold ${corClasse}`}>
        <Money brl={brl} usd={usd ?? null} compacto />
      </div>
      {sub && <div className={`text-xs ${corClasse}`}>{sub}</div>}
    </div>
  );
}

function Mini({ label, brl, usd }: { label: string; brl: number; usd?: number | null }) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded p-2">
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
      <div className="text-zinc-100"><Money brl={brl} usd={usd ?? null} compacto /></div>
    </div>
  );
}
