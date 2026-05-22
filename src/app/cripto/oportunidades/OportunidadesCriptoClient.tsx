"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Calculator } from "lucide-react";
import { Sparkline } from "@/components/cripto/Sparkline";
import { TendenciaBadge } from "@/components/cripto/TendenciaBadge";
import { Money } from "@/components/cripto/Money";
import { useMoeda } from "@/lib/cripto/moeda";
import { sinalLabel, type Analise } from "@/lib/cripto/analise";
import { type ProjecaoAtivo, type Cenario, type Horizonte } from "@/lib/cripto/projecoes";
import { CRYPTO_ASSETS, formatQtd } from "@/lib/cripto/constants";
import { cn } from "@/lib/cn";

type Item = {
  cryptoId: string;
  symbol: string;
  nome: string;
  color: string;
  precoAtualBrl: number;
  precoAtualUsd: number | null;
  variacao24h: number | null;
  offline: boolean;
  analise: Analise | null;
  projecao: ProjecaoAtivo | null;
  sparkline: { t: number; p: number }[];
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

export function OportunidadesCriptoClient({ itens }: { itens: Item[] }) {
  const [cenarioFocal, setCenarioFocal] = useState<Cenario | "TODAS">("TODAS");
  const refProj = useRef<Record<string, HTMLDivElement | null>>({});

  // Permite navegar direto com hash (#opp-bitcoin) — usado pelos atalhos do dashboard
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Oportunidades</h1>
        <p className="text-xs text-zinc-500 mt-1">Ordenado por score (mais atrativo primeiro).</p>
      </div>

      {/* PARTE 1: Análise atual */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400">Análise atual</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {itens.map((it) => <CardAnalise key={it.cryptoId} item={it} />)}
        </div>
      </section>

      {/* PARTE 2: Projeção futura */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-zinc-400">Projeção futura</h2>
          <div className="flex gap-1 text-[11px]">
            {(["PESSIMISTA","CONSERVADORA","OTIMISTA","TODAS"] as const).map((c) => (
              <button key={c} onClick={() => setCenarioFocal(c)}
                className={cn(
                  "px-2 py-1 rounded border",
                  cenarioFocal === c
                    ? c === "PESSIMISTA" ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                    : c === "OTIMISTA" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : c === "CONSERVADORA" ? "border-zinc-500/40 bg-zinc-500/10 text-zinc-200"
                    : "border-sky-500/40 bg-sky-500/10 text-sky-300"
                    : "border-zinc-800 text-zinc-500"
                )}>
                {c === "TODAS" ? "Todas" : c === "PESSIMISTA" ? "🔴 Pessimista" : c === "CONSERVADORA" ? "⚪ Conservadora" : "🟢 Otimista"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {itens.map((it) => (
            <div key={it.cryptoId} id={`proj-${it.cryptoId}`} ref={(el) => { refProj.current[it.cryptoId] = el; }}>
              <CardProjecao item={it} cenarioFocal={cenarioFocal} />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 italic">
          Projeções baseadas em dados históricos e análise qualitativa.
          Não são recomendação de investimento. Cripto tem alto risco.
        </p>
      </section>

      {/* PARTE 3: Calculadora */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400">Calculadora pessoal de projeção</h2>
        <Calculadora itens={itens} />
      </section>
    </div>
  );
}

// ============================================================================
// Card de análise (Parte 1)
// ============================================================================

function CardAnalise({ item }: { item: Item }) {
  const [aberto, setAberto] = useState(false);
  const ana = item.analise;
  const sinal = ana ? sinalLabel(ana.sinal) : { texto: "Sem dados", cor: "zinc", emoji: "⚪" };
  const score = ana?.score ?? 0;

  return (
    <div id={`opp-${item.cryptoId}`} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: item.color }} />
          <div>
            <div className="font-semibold">{item.symbol} <span className="text-xs text-zinc-500">{item.nome}</span></div>
            <div className="text-lg font-semibold">
              <Money brl={item.precoAtualBrl} usd={item.precoAtualUsd} />
            </div>
            {item.variacao24h !== null && (
              <div className={item.variacao24h >= 0 ? "text-emerald-400 text-xs" : "text-rose-400 text-xs"}>
                {item.variacao24h >= 0 ? "+" : ""}{item.variacao24h.toFixed(2)}% 24h
              </div>
            )}
          </div>
        </div>
        <div className="text-right space-y-1">
          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded border ${CORES_SINAL[sinal.cor]}`}>
            {sinal.emoji} {sinal.texto}
          </span>
          <div className="flex items-center gap-2 justify-end">
            <TendenciaBadge tendencia={ana?.indicadores?.tendencia.valor} />
            {item.offline && <span className="text-[9px] text-amber-300">offline</span>}
          </div>
        </div>
      </div>

      <Sparkline pontos={item.sparkline} cor="auto" largura={400} altura={48} />

      <div>
        <div className="flex items-end justify-between mb-1">
          <span className="text-xs text-zinc-400">Score</span>
          <span className="text-xs font-mono">{score}/100</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div className={`h-full ${CORES_BARRA[sinal.cor]}`} style={{ width: `${score}%` }} />
        </div>
      </div>

      <p className="text-sm text-zinc-300">{ana?.resumo ?? "Histórico insuficiente."}</p>

      {ana?.indicadores && (
        <>
          <button onClick={() => setAberto((v) => !v)}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
            {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {aberto ? "Ocultar" : "Ver"} indicadores
          </button>
          {aberto && (
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800">
              <Ind label="Tendência" valor={ana.indicadores.tendencia.valor} />
              <Ind label="Percentil" valor={`${ana.indicadores.percentil.valor.toFixed(0)} (${ana.indicadores.percentil.faixa})`} />
              <Ind label="Momentum"
                valor={`7d ${ana.indicadores.momentum.d7.toFixed(1)}% / 30d ${ana.indicadores.momentum.d30.toFixed(1)}% / 90d ${ana.indicadores.momentum.d90.toFixed(1)}%`} />
              <Ind label="Suporte/Resistência" valor={ana.indicadores.suporteResistencia.proximidade} />
              <Ind label="Volatilidade (30d)" valor={`${ana.indicadores.volatilidade.valor.toFixed(2)}% (${ana.indicadores.volatilidade.nivel})`} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Ind({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded p-2">
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
      <div className="text-zinc-200">{valor}</div>
    </div>
  );
}

// ============================================================================
// Card de projeção (Parte 2)
// ============================================================================

function CardProjecao({ item, cenarioFocal }: { item: Item; cenarioFocal: Cenario | "TODAS" }) {
  const proj = item.projecao;
  if (!proj) return null;
  const usdRate = item.precoAtualUsd != null && item.precoAtualBrl > 0 ? item.precoAtualUsd / item.precoAtualBrl : null;
  const toUsd = (brl: number) => usdRate != null ? brl * usdRate : null;

  function cellClass(c: Cenario) {
    if (cenarioFocal === "TODAS") return "";
    return cenarioFocal === c ? "" : "opacity-30";
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: item.color }} />
          <span className="font-semibold">{item.symbol}</span>
          <span className="text-xs text-zinc-500">{item.nome}</span>
        </div>
        <div className="text-xs text-zinc-400">
          Preço atual: <span className="text-zinc-100"><Money brl={item.precoAtualBrl} usd={item.precoAtualUsd} /></span>
        </div>
        {proj.historicoLimitado && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Estimativa com histórico limitado
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="text-left py-1.5"></th>
              {proj.horizontes.map((h) => (
                <th key={h.anos} className="text-right py-1.5">{h.anos} ano{h.anos > 1 ? "s" : ""}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            <tr className={cn("border-t border-zinc-800", cellClass("PESSIMISTA"))}>
              <td className="py-1.5 text-rose-300">🔴 Pessimista</td>
              {proj.horizontes.map((h) => (
                <td key={h.anos} className="text-right py-1.5">
                  <Money brl={h.pessimista} usd={toUsd(h.pessimista)} compacto />
                </td>
              ))}
            </tr>
            <tr className={cn("border-t border-zinc-800", cellClass("CONSERVADORA"))}>
              <td className="py-1.5 text-zinc-300">⚪ Conservadora</td>
              {proj.horizontes.map((h) => (
                <td key={h.anos} className="text-right py-1.5">
                  <Money brl={h.conservadora} usd={toUsd(h.conservadora)} compacto />
                </td>
              ))}
            </tr>
            <tr className={cn("border-t border-zinc-800", cellClass("OTIMISTA"))}>
              <td className="py-1.5 text-emerald-300">🟢 Otimista</td>
              {proj.horizontes.map((h) => (
                <td key={h.anos} className="text-right py-1.5">
                  <Money brl={h.otimista} usd={toUsd(h.otimista)} compacto />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-xs text-zinc-400 leading-relaxed">
        <strong className="text-zinc-300">Premissas:</strong> {proj.premissas}
        {" "}<span className="text-zinc-600">
          Taxa anual usada: pess {(proj.taxas.pessimistaAA * 100).toFixed(1)}% /
          cons {(proj.taxas.conservadoraAA * 100).toFixed(1)}% /
          ot {(proj.taxas.otimistaAA * 100).toFixed(1)}%.
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Calculadora (Parte 3)
// ============================================================================

function Calculadora({ itens }: { itens: Item[] }) {
  const [cryptoId, setCryptoId] = useState<string>(itens[0]?.cryptoId ?? "bitcoin");
  const [qtd, setQtd] = useState<string>("");
  const [anos, setAnos] = useState<Horizonte>(3);
  const [cenario, setCenario] = useState<Cenario>("CONSERVADORA");

  const item = itens.find((i) => i.cryptoId === cryptoId);
  const proj = item?.projecao;
  const ativoMeta = CRYPTO_ASSETS.find((a) => a.id === cryptoId);

  const qtdNum = useMemo(() => {
    const n = Number(qtd.replace(",", "."));
    return isNaN(n) ? 0 : n;
  }, [qtd]);

  const horizonteEscolhido = proj?.horizontes.find((h) => h.anos === anos);
  const precoProjetado =
    horizonteEscolhido
      ? cenario === "PESSIMISTA" ? horizonteEscolhido.pessimista
      : cenario === "OTIMISTA"   ? horizonteEscolhido.otimista
      : horizonteEscolhido.conservadora
      : 0;

  const valorFuturoBrl = qtdNum * precoProjetado;
  const valorAtualBrl = qtdNum * (item?.precoAtualBrl ?? 0);
  const lucroEstimado = valorFuturoBrl - valorAtualBrl;
  const usdRate = item?.precoAtualUsd != null && item.precoAtualBrl > 0 ? item.precoAtualUsd / item.precoAtualBrl : null;
  const valorFuturoUsd = usdRate != null ? valorFuturoBrl * usdRate : null;
  const lucroUsd = usdRate != null ? lucroEstimado * usdRate : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Calculator size={16} className="text-zinc-500" />
        <span className="text-zinc-300">Se eu tiver…</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <label className="flex flex-col text-xs gap-1">
          <span className="text-zinc-500">Ativo</span>
          <select value={cryptoId} onChange={(e) => setCryptoId(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm">
            {itens.map((i) => <option key={i.cryptoId} value={i.cryptoId}>{i.symbol}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs gap-1">
          <span className="text-zinc-500">Quantidade ({ativoMeta?.decimals ?? 8} casas)</span>
          <input type="text" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)}
            placeholder="0" className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm font-mono" />
        </label>
        <label className="flex flex-col text-xs gap-1">
          <span className="text-zinc-500">Horizonte</span>
          <select value={anos} onChange={(e) => setAnos(Number(e.target.value) as Horizonte)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm">
            <option value={1}>1 ano</option>
            <option value={3}>3 anos</option>
            <option value={5}>5 anos</option>
          </select>
        </label>
        <label className="flex flex-col text-xs gap-1">
          <span className="text-zinc-500">Cenário</span>
          <select value={cenario} onChange={(e) => setCenario(e.target.value as Cenario)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm">
            <option value="PESSIMISTA">🔴 Pessimista</option>
            <option value="CONSERVADORA">⚪ Conservadora</option>
            <option value="OTIMISTA">🟢 Otimista</option>
          </select>
        </label>
      </div>

      {qtdNum > 0 && proj && (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-3 space-y-1 text-sm">
          <div className="text-zinc-400 text-xs">
            {qtd} {ativoMeta?.symbol} em {anos} ano{anos > 1 ? "s" : ""} no cenário <strong>{cenario.toLowerCase()}</strong>:
          </div>
          <div className="text-xl font-semibold text-zinc-100">
            <Money brl={valorFuturoBrl} usd={valorFuturoUsd} />
          </div>
          <div className={lucroEstimado >= 0 ? "text-emerald-400 text-xs" : "text-rose-400 text-xs"}>
            Lucro/prejuízo vs preço atual:{" "}
            <Money brl={lucroEstimado} usd={lucroUsd} />
            {" "}({valorAtualBrl > 0 ? ((lucroEstimado / valorAtualBrl) * 100).toFixed(1) : "0"}%)
          </div>
        </div>
      )}
      <p className="text-[10px] text-zinc-600 italic">
        Estimativa baseada em dados históricos. Não é recomendação de investimento.
      </p>
    </div>
  );
}
