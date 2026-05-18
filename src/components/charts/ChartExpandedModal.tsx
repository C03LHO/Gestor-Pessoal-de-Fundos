"use client";

/**
 * Modal de gráfico expandido — tela focada de análise de ativo.
 *
 * Princípios de implementação:
 *  - Portal em document.body (escapa de qualquer containing block/stacking
 *    context do <main>)
 *  - Backdrop opaco e painel com background distinto do app (zinc-900 vs
 *    zinc-950 do body) → contraste real, sem vazamento visual
 *  - Animação de entrada para sensação premium
 *  - Chart area com `min-height` explícito + `min-h-0` para o flex funcionar
 *    (Recharts ResponsiveContainer não desenha se o pai não tem altura real)
 *  - Remount via `key` ao trocar período (evita estado de animação fantasma)
 *  - Body scroll lock + ESC + clique no backdrop + botão × fecham
 *  - Mobile: fullscreen verdadeiro, tabs sticky, KPIs compactos
 *  - Desktop: painel centralizado com max 1200×820, border + shadow forte
 */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceDot, ResponsiveContainer,
} from "recharts";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { brl, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  CHART_COLORS, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE,
} from "@/lib/chart-theme";

// Cores vibrantes específicas desta tela de análise
const COR_UP   = "#22cc88";
const COR_DOWN = "#ff4466";

export type PeriodoConfig = { id: string; label: string; curto: string };
export type Ponto = { t: number; p: number };

export type ChartExpandedModalProps = {
  open: boolean;
  onClose: () => void;
  ticker: string;
  subtitulo?: string | null;
  precoAtual: number;
  variacao: number;
  pontos: Ponto[];
  periodos: PeriodoConfig[];
  rangeAtual: string;
  onTrocarRange: (id: string) => void;
  formatarData: (t: number, range: string, curto?: boolean) => string;
};

export function ChartExpandedModal(props: ChartExpandedModalProps) {
  const { open, onClose } = props;
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!open) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!montado || !open) return null;
  return createPortal(<ModalContent {...props} />, document.body);
}

// ============================================================================
// Conteúdo do modal
// ============================================================================

function ModalContent({
  ticker, subtitulo, precoAtual, variacao, pontos,
  periodos, rangeAtual, onTrocarRange, formatarData, onClose,
}: ChartExpandedModalProps) {
  const positivo = variacao >= 0;
  const cor = positivo ? COR_UP : COR_DOWN;
  const stats = useMemo(() => calcularStats(pontos), [pontos]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-stretch md:items-center justify-center">
      {/* ---------------------------------------------------------------- */}
      {/* Backdrop: opaco no mobile, escuro+blur no desktop                */}
      {/* ---------------------------------------------------------------- */}
      <div
        className={cn(
          "absolute inset-0 chart-modal-backdrop",
          // Mobile: 100% opaco (panel ocupa tudo, mas garantimos isolamento total)
          "bg-zinc-950",
          // Desktop: backdrop visível com blur para esconder o app
          "md:bg-black/85 md:backdrop-blur-md",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ---------------------------------------------------------------- */}
      {/* Painel principal                                                  */}
      {/* ---------------------------------------------------------------- */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative flex flex-col w-full h-full",
          // Background distinto do body (#09090b) para contraste
          "bg-zinc-900",
          // Desktop: painel centralizado com proporção premium
          "md:w-[min(94vw,1200px)] md:h-[min(86vh,820px)]",
          "md:rounded-2xl md:border md:border-zinc-700/60",
          "md:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.85),0_8px_24px_-4px_rgba(0,0,0,0.5)]",
          "overflow-hidden",
          // Animação de entrada
          "chart-modal-panel",
        )}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <Header
          ticker={ticker}
          subtitulo={subtitulo ?? undefined}
          precoAtual={precoAtual}
          variacao={variacao}
          cor={cor}
          positivo={positivo}
          onClose={onClose}
        />

        <PeriodoTabs
          periodos={periodos}
          atual={rangeAtual}
          onTrocar={onTrocarRange}
        />

        {/* Chart area: flex-1 + min-h é o que garante o desenho do Recharts */}
        <div
          className="flex-1 px-2 md:px-5 pt-3 pb-2 min-h-[320px] md:min-h-[420px]"
          style={{ minHeight: 0 }}
        >
          <ChartCanvas
            // Remount ao trocar período evita estado fantasma
            key={`${ticker}-${rangeAtual}`}
            pontos={pontos}
            cor={cor}
            precoAtual={precoAtual}
            stats={stats}
            formatarData={formatarData}
            rangeAtual={rangeAtual}
          />
        </div>

        <Kpis
          atual={precoAtual}
          min={stats.min}
          max={stats.max}
          variacao={variacao}
          corVariacao={cor}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Header
// ============================================================================

function Header({
  ticker, subtitulo, precoAtual, variacao, cor, positivo, onClose,
}: {
  ticker: string;
  subtitulo?: string;
  precoAtual: number;
  variacao: number;
  cor: string;
  positivo: boolean;
  onClose: () => void;
}) {
  return (
    <header
      className="flex items-center gap-3 px-3 md:px-6 py-3 md:py-4 border-b border-zinc-800 shrink-0 bg-zinc-900/95 backdrop-blur"
    >
      <button
        onClick={onClose}
        aria-label="Fechar"
        className={cn(
          "shrink-0 -ml-1.5 rounded-lg",
          "min-w-[44px] min-h-[44px] flex items-center justify-center",
          "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/70 active:bg-zinc-800",
          "transition",
        )}
      >
        <X size={22} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg md:text-xl tracking-tight truncate">
            {ticker}
          </h2>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] md:text-xs font-semibold tabular-nums",
            )}
            style={{ color: cor, background: `${cor}1f` }}
          >
            {positivo ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {positivo ? "+" : ""}{pct(variacao)}
          </span>
        </div>
        {subtitulo && (
          <p className="text-[11px] md:text-xs text-zinc-500 truncate mt-0.5">
            {subtitulo}
          </p>
        )}
      </div>

      <div className="text-right shrink-0">
        <div className="text-xl md:text-2xl font-semibold tabular-nums leading-tight">
          {brl(precoAtual)}
        </div>
        <div className="text-[9px] md:text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">
          preço atual
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// Tabs de período (sticky)
// ============================================================================

function PeriodoTabs({
  periodos, atual, onTrocar,
}: {
  periodos: PeriodoConfig[];
  atual: string;
  onTrocar: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 shrink-0",
        "px-3 md:px-6 py-2.5",
        "border-b border-zinc-800 bg-zinc-900/95 backdrop-blur",
        "overflow-x-auto",
      )}
    >
      <div className="inline-flex gap-1 p-1 bg-zinc-950/70 border border-zinc-800 rounded-lg">
        {periodos.map((p) => (
          <button
            key={p.id}
            onClick={() => onTrocar(p.id)}
            className={cn(
              "px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md whitespace-nowrap transition",
              "min-w-[56px] md:min-w-[72px]",
              atual === p.id
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50",
            )}
          >
            <span className="md:hidden">{p.curto}</span>
            <span className="hidden md:inline">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Chart
// ============================================================================

function ChartCanvas({
  pontos, cor, precoAtual, stats, formatarData, rangeAtual,
}: {
  pontos: Ponto[];
  cor: string;
  precoAtual: number;
  stats: { min: number; max: number; tMin: number; tMax: number };
  formatarData: (t: number, range: string, curto?: boolean) => string;
  rangeAtual: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={pontos} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="exp-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={cor} stopOpacity={0.4} />
            <stop offset="50%"  stopColor={cor} stopOpacity={0.14} />
            <stop offset="100%" stopColor={cor} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 6"
          stroke={CHART_COLORS.divider}
          strokeOpacity={0.22}
          vertical={false}
        />

        <XAxis
          dataKey="t"
          type="number"
          domain={["dataMin", "dataMax"]}
          stroke={CHART_COLORS.textFaint}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tick={{ fill: CHART_COLORS.textMuted }}
          tickFormatter={(t: number) => formatarData(t, rangeAtual, true)}
          minTickGap={40}
          padding={{ left: 6, right: 6 }}
        />

        <YAxis
          stroke={CHART_COLORS.textFaint}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tick={{ fill: CHART_COLORS.textMuted }}
          width={56}
          domain={["dataMin - dataMin*0.008", "dataMax + dataMax*0.008"]}
          tickFormatter={(v: number) => brl(v).replace("R$ ", "")}
        />

        <Tooltip
          contentStyle={{
            background: "#0c0c0f",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 10,
            padding: "10px 14px",
            boxShadow: "0 12px 28px rgba(0,0,0,0.55)",
            color: CHART_COLORS.text,
          }}
          labelStyle={{ ...TOOLTIP_LABEL_STYLE, fontSize: 11 }}
          itemStyle={{ ...TOOLTIP_ITEM_STYLE, color: cor, fontSize: 14 }}
          cursor={{ stroke: cor, strokeWidth: 1, strokeDasharray: "3 4", strokeOpacity: 0.6 }}
          labelFormatter={(t: number) => formatarData(t, rangeAtual)}
          formatter={(v: number) => [brl(v), "Preço"]}
          allowEscapeViewBox={{ x: false, y: false }}
          wrapperStyle={{ outline: "none" }}
          isAnimationActive={false}
        />

        <ReferenceLine
          y={precoAtual}
          stroke={cor}
          strokeDasharray="4 4"
          strokeOpacity={0.55}
          strokeWidth={1.2}
        />
        <ReferenceLine
          y={stats.max}
          stroke={COR_UP}
          strokeDasharray="2 6"
          strokeOpacity={0.35}
          strokeWidth={1}
        />
        <ReferenceLine
          y={stats.min}
          stroke={COR_DOWN}
          strokeDasharray="2 6"
          strokeOpacity={0.35}
          strokeWidth={1}
        />

        <Area
          type="monotone"
          dataKey="p"
          stroke={cor}
          strokeWidth={3}
          fill="url(#exp-area)"
          activeDot={{
            r: 6, fill: cor, stroke: "#fff", strokeWidth: 2,
          }}
          isAnimationActive
          animationDuration={350}
          animationEasing="ease-out"
        />

        <ReferenceDot
          x={stats.tMax} y={stats.max}
          r={5} fill={COR_UP} stroke="#fff" strokeWidth={2}
          ifOverflow="extendDomain"
        />
        <ReferenceDot
          x={stats.tMin} y={stats.min}
          r={5} fill={COR_DOWN} stroke="#fff" strokeWidth={2}
          ifOverflow="extendDomain"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// KPIs no rodapé
// ============================================================================

function Kpis({
  atual, min, max, variacao, corVariacao,
}: {
  atual: number; min: number; max: number; variacao: number; corVariacao: string;
}) {
  return (
    <footer
      className={cn(
        "grid grid-cols-2 md:grid-cols-4 shrink-0",
        "border-t border-zinc-800 bg-zinc-900/95 backdrop-blur",
      )}
    >
      <Kpi label="Atual"    valor={brl(atual)} />
      <Kpi label="Mínima"   valor={brl(min)} cor={COR_DOWN} divisor />
      <Kpi label="Máxima"   valor={brl(max)} cor={COR_UP} divisor />
      <Kpi
        label="Variação"
        valor={`${variacao >= 0 ? "+" : ""}${pct(variacao)}`}
        cor={corVariacao}
        divisor
      />
    </footer>
  );
}

function Kpi({
  label, valor, cor, divisor,
}: { label: string; valor: string; cor?: string; divisor?: boolean }) {
  return (
    <div
      className={cn(
        "text-center py-3 md:py-4",
        divisor && "md:border-l border-zinc-800/80",
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div
        className="text-base md:text-lg font-semibold tabular-nums mt-1"
        style={cor ? { color: cor } : undefined}
      >
        {valor}
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function calcularStats(pontos: Ponto[]) {
  let max = -Infinity, min = Infinity, tMax = 0, tMin = 0;
  for (const pt of pontos) {
    if (pt.p > max) { max = pt.p; tMax = pt.t; }
    if (pt.p < min) { min = pt.p; tMin = pt.t; }
  }
  return {
    max: max === -Infinity ? 0 : max,
    min: min === Infinity ? 0 : min,
    tMax, tMin,
  };
}
