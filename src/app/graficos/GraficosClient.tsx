"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  ReferenceLine, ReferenceDot, CartesianGrid,
} from "recharts";
import { brl, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ChevronRight, Loader2, Maximize2, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  CHART_COLORS, GRID_PROPS, TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE,
  TOOLTIP_ITEM_STYLE, TOOLTIP_CURSOR, ACTIVE_DOT_PROPS, REF_DOT_HIGHLIGHT,
  gradientStops,
} from "@/lib/chart-theme";

type Serie = {
  ticker: string;
  intervalo: string;
  range: string;
  precoAtual: number;
  variacao: number;
  pontos: { t: number; p: number }[];
};

type Item = {
  ticker: string;
  ordem: number;
  notas: string | null;
  serie: Serie | null;
};

const PERIODOS = [
  { id: "1d",  label: "1 dia",     curto: "1D" },
  { id: "5d",  label: "1 semana",  curto: "1S" },
  { id: "1mo", label: "1 mês",     curto: "1M" },
  { id: "6mo", label: "6 meses",   curto: "6M" },
  { id: "1y",  label: "1 ano",     curto: "1A" },
] as const;

type RangeId = typeof PERIODOS[number]["id"];

export function GraficosClient() {
  const [range, setRange] = useState<RangeId>("1mo");
  const [items, setItems] = useState<Item[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [zoom, setZoom] = useState<Item | null>(null);

  async function carregar(r: string) {
    setCarregando(true);
    try {
      const resp = await fetch(`/api/historico/watchlist?range=${r}`);
      const j = await resp.json();
      setItems(j.series);
    } finally { setCarregando(false); }
  }

  useEffect(() => { carregar(range); }, [range]);

  const ranking = items
    ? [...items].sort((a, b) => (b.serie?.variacao ?? -99) - (a.serie?.variacao ?? -99))
    : null;

  return (
    <div className="space-y-5 md:space-y-6">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Gráficos da watchlist</h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
            Toque num card para abrir em tela cheia com indicadores.
          </p>
        </div>
        <SeletorPeriodo atual={range} onChange={setRange} />
      </header>

      {carregando && !items && (
        <div className="flex items-center justify-center py-12 text-zinc-500 text-sm gap-2">
          <Loader2 size={16} className="animate-spin" /> Carregando cotações...
        </div>
      )}

      {ranking && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {ranking.map((item) => (
            <CardGrafico
              key={item.ticker}
              item={item} rangeId={range}
              onZoom={() => setZoom(item)}
            />
          ))}
        </div>
      )}

      {zoom && (
        <ZoomModal
          item={zoom} rangeAtual={range}
          onClose={() => setZoom(null)}
          onTrocarRange={(r) => setRange(r)}
        />
      )}
    </div>
  );
}

function SeletorPeriodo({
  atual, onChange,
}: { atual: string; onChange: (v: any) => void }) {
  return (
    <div className="inline-flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
      {PERIODOS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded transition whitespace-nowrap",
            atual === p.id ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-100",
          )}
        >
          <span className="md:hidden">{p.curto}</span>
          <span className="hidden md:inline">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

function CardGrafico({
  item, rangeId, onZoom,
}: { item: Item; rangeId: string; onZoom: () => void }) {
  const s = item.serie;
  if (!s) {
    return (
      <div className="card">
        <div className="flex justify-between items-baseline mb-2">
          <span className="font-semibold">{item.ticker}</span>
          <span className="text-xs text-zinc-500">sem dados</span>
        </div>
        {item.notas && <p className="text-[10px] text-zinc-500">{item.notas}</p>}
      </div>
    );
  }

  const stats = useMemo(() => calcularStats(s.pontos), [s.pontos]);
  const positivo = s.variacao >= 0;
  const cor = positivo ? "#10b981" : "#f43f5e";
  const Icon = positivo ? TrendingUp : s.variacao < -0.001 ? TrendingDown : Minus;

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-2 gap-2">
        <Link href={`/carteira/${item.ticker}`} className="min-w-0 group">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-base group-hover:text-emerald-300 transition">
              {item.ticker}
            </span>
            <ChevronRight size={12} className="text-zinc-600" />
          </div>
          {item.notas && (
            <p className="text-[10px] text-zinc-500 truncate max-w-[260px]">{item.notas}</p>
          )}
        </Link>
        <div className="text-right flex items-start gap-2">
          <div>
            <div className="text-lg font-semibold tabular-nums">{brl(s.precoAtual)}</div>
            <div className="flex items-center justify-end gap-1 text-xs font-medium tabular-nums"
                 style={{ color: cor }}>
              <Icon size={11} />
              {positivo ? "+" : ""}{pct(s.variacao)}
            </div>
          </div>
          <button
            onClick={onZoom}
            className="text-zinc-500 hover:text-zinc-200 p-1.5 -mt-1 -mr-1"
            aria-label="Ampliar"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Gráfico com eixos compactos */}
      <div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={s.pontos} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${item.ticker}`} x1="0" y1="0" x2="0" y2="1">
                {gradientStops(cor).map((sp, i) => <stop key={i} {...sp} />)}
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={ticksX(s.pontos, 3)}
              tickFormatter={(t: number) => formatarData(t, rangeId, true)}
              stroke={CHART_COLORS.textFaint}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_COLORS.textMuted }}
            />
            <YAxis
              domain={["dataMin - dataMin*0.005", "dataMax + dataMax*0.005"]}
              ticks={[stats.min, stats.max]}
              tickFormatter={(v: number) => brl(v).replace("R$ ", "")}
              stroke={CHART_COLORS.textFaint}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              orientation="right"
              width={50}
              tick={{ fill: CHART_COLORS.textMuted }}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelFormatter={(t: number) => formatarData(t, rangeId)}
              formatter={(v: number) => [brl(v), "Preço"]}
              cursor={{ ...TOOLTIP_CURSOR, stroke: cor, strokeOpacity: 0.6 }}
            />
            <Area
              type="monotone" dataKey="p"
              stroke={cor} strokeWidth={2.5}
              fill={`url(#g-${item.ticker})`}
              activeDot={{ ...ACTIVE_DOT_PROPS, fill: cor }}
              isAnimationActive={false}
            />
            <ReferenceLine y={s.precoAtual} stroke={cor} strokeDasharray="2 4" strokeOpacity={0.55} strokeWidth={1.2} />
            <ReferenceDot x={stats.tMax} y={stats.max}
                          r={4} fill={CHART_COLORS.primary} stroke="#fff" strokeWidth={1.5} />
            <ReferenceDot x={stats.tMin} y={stats.min}
                          r={4} fill={CHART_COLORS.danger} stroke="#fff" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Min / Max / Período — mobile fix: 1col em <md */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 pt-2 border-t border-zinc-800 text-[10px]">
        <div>
          <div className="text-zinc-500">Mín {rangeId.toUpperCase()}</div>
          <div className="text-rose-400 tabular-nums font-medium">{brl(stats.min)}</div>
        </div>
        <div className="text-center">
          <div className="text-zinc-500">Período</div>
          <div className="text-zinc-300 tabular-nums">
            {formatarData(s.pontos[0].t, rangeId, true)} → {formatarData(s.pontos[s.pontos.length-1].t, rangeId, true)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-zinc-500">Máx {rangeId.toUpperCase()}</div>
          <div className="text-emerald-400 tabular-nums font-medium">{brl(stats.max)}</div>
        </div>
      </div>
    </div>
  );
}

function ticksX(pontos: { t: number; p: number }[], n: number): number[] {
  if (pontos.length === 0) return [];
  if (pontos.length <= n) return pontos.map((p) => p.t);
  const step = (pontos.length - 1) / (n - 1);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(pontos[Math.round(i * step)].t);
  }
  return out;
}

function ZoomModal({
  item, rangeAtual, onClose, onTrocarRange,
}: {
  item: Item; rangeAtual: RangeId; onClose: () => void; onTrocarRange: (r: RangeId) => void;
}) {
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const s = item.serie;
  if (!s) return null;
  const stats = calcularStats(s.pontos);
  const positivo = s.variacao >= 0;
  const cor = positivo ? "#10b981" : "#f43f5e";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 border-b border-zinc-800 shrink-0 bg-zinc-950"
           style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "0.75rem" }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-zinc-300 -ml-2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={22} />
          </button>
          <div>
            <div className="font-semibold text-lg">{item.ticker}</div>
            {item.notas && <div className="text-[10px] text-zinc-500 truncate max-w-[280px]">{item.notas}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums">{brl(s.precoAtual)}</div>
          <div className="text-sm tabular-nums" style={{ color: cor }}>
            {positivo ? "+" : ""}{pct(s.variacao)}
          </div>
        </div>
      </div>

      {/* Seletor de período dentro do modal */}
      <div className="px-4 md:px-6 py-3 border-b border-zinc-800 shrink-0 overflow-x-auto">
        <div className="inline-flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
          {PERIODOS.map((p) => (
            <button
              key={p.id} onClick={() => onTrocarRange(p.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap",
                rangeAtual === p.id ? "bg-zinc-700 text-white" : "text-zinc-400",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico grande */}
      <div className="flex-1 p-4 md:p-6 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={s.pontos} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id={`gz-${item.ticker}`} x1="0" y1="0" x2="0" y2="1">
                {gradientStops(cor).map((sp, i) => <stop key={i} {...sp} />)}
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_PROPS} />
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
              minTickGap={32}
            />
            <YAxis
              stroke={CHART_COLORS.textFaint}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_COLORS.textMuted }}
              width={76}
              domain={["dataMin - dataMin*0.01", "dataMax + dataMax*0.01"]}
              tickFormatter={(v: number) => brl(v).replace("R$ ", "R$")}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelFormatter={(t: number) => formatarData(t, rangeAtual)}
              formatter={(v: number) => [brl(v), "Preço"]}
              cursor={{ ...TOOLTIP_CURSOR, stroke: cor, strokeOpacity: 0.7 }}
            />
            <ReferenceLine
              y={s.precoAtual}
              stroke={cor} strokeDasharray="4 4" strokeOpacity={0.7} strokeWidth={1.3}
              label={{ value: "Atual", fill: cor, fontSize: 11, position: "right", fontWeight: 600 }}
            />
            <ReferenceLine
              y={stats.max}
              stroke={CHART_COLORS.primary} strokeDasharray="2 5" strokeOpacity={0.5} strokeWidth={1.2}
              label={{
                value: `Máx ${brl(stats.max)}`,
                fill: CHART_COLORS.primary, fontSize: 10, position: "right",
              }}
            />
            <ReferenceLine
              y={stats.min}
              stroke={CHART_COLORS.danger} strokeDasharray="2 5" strokeOpacity={0.5} strokeWidth={1.2}
              label={{
                value: `Mín ${brl(stats.min)}`,
                fill: CHART_COLORS.danger, fontSize: 10, position: "right",
              }}
            />
            <Area
              type="monotone" dataKey="p"
              stroke={cor} strokeWidth={3}
              fill={`url(#gz-${item.ticker})`}
              activeDot={{ ...ACTIVE_DOT_PROPS, r: 6, fill: cor }}
              isAnimationActive
              animationDuration={400}
            />
            <ReferenceDot
              x={stats.tMax} y={stats.max}
              fill={CHART_COLORS.primary} {...REF_DOT_HIGHLIGHT}
            />
            <ReferenceDot
              x={stats.tMin} y={stats.min}
              fill={CHART_COLORS.danger} {...REF_DOT_HIGHLIGHT}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats no rodapé — mobile fix: 2col em mobile, 4col desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-zinc-800 shrink-0 bg-zinc-950"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <StatCell label="Atual" valor={brl(s.precoAtual)} />
        <StatCell label="Mín" valor={brl(stats.min)} cor="text-rose-400" />
        <StatCell label="Máx" valor={brl(stats.max)} cor="text-emerald-400" />
        <StatCell label="Variação"
                  valor={`${positivo ? "+" : ""}${pct(s.variacao)}`}
                  cor={positivo ? "text-emerald-400" : "text-rose-400"} />
      </div>
    </div>
  );
}

function StatCell({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div className="text-center py-3 border-r border-zinc-800 last:border-r-0">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={cn("text-sm font-semibold tabular-nums mt-0.5", cor)}>{valor}</div>
    </div>
  );
}

function calcularStats(pontos: { t: number; p: number }[]) {
  let max = -Infinity, min = Infinity, tMax = 0, tMin = 0;
  for (const pt of pontos) {
    if (pt.p > max) { max = pt.p; tMax = pt.t; }
    if (pt.p < min) { min = pt.p; tMin = pt.t; }
  }
  return { max, min, tMax, tMin };
}

function formatarData(t: number, range: string, curto = false): string {
  const d = new Date(t);
  if (range === "1d") {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  if (range === "5d") {
    return curto
      ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
      : d.toLocaleDateString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }
  if (range === "1mo" || range === "6mo") {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}
