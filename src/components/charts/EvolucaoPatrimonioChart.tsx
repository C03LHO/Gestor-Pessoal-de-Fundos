"use client";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  CartesianGrid, Legend, ReferenceDot,
} from "recharts";
import { brl, pct } from "@/lib/format";
import {
  CHART_COLORS, AXIS_STYLE, AXIS_LABEL_TICK, GRID_PROPS,
  TOOLTIP_CONTENT_STYLE, LINE_PROPS, ACTIVE_DOT_PROPS, LEGEND_WRAPPER_STYLE,
  REF_DOT_HIGHLIGHT, gradientStops,
} from "@/lib/chart-theme";
import type { PontoPatrimonio } from "@/lib/domain/dashboard-extras";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PontoPatrimonio;
  const diff = p.valor - p.investido;
  return (
    <div style={TOOLTIP_CONTENT_STYLE} className="space-y-0.5 min-w-[180px]">
      <div className="font-semibold mb-1" style={{ color: CHART_COLORS.text, fontSize: 13 }}>
        {label}
      </div>
      <Row label="Mercado"   valor={brl(p.valor)}     cor={CHART_COLORS.primary} bold />
      <Row label="Investido" valor={brl(p.investido)} cor={CHART_COLORS.textMuted} />
      <hr className="border-zinc-800 my-1" />
      <Row
        label="Diferença"
        valor={`${diff >= 0 ? "+" : ""}${brl(diff)}`}
        cor={diff >= 0 ? CHART_COLORS.primary : CHART_COLORS.danger}
        bold
      />
      <Row
        label="Rentabilidade"
        valor={`${p.rentabilidade >= 0 ? "+" : ""}${pct(p.rentabilidade)}`}
        cor={p.rentabilidade >= 0 ? CHART_COLORS.primary : CHART_COLORS.danger}
      />
      {p.ehMaiorPatrimonio && (
        <div className="text-[10px] mt-1" style={{ color: CHART_COLORS.primary }}>★ Maior patrimônio</div>
      )}
      {p.ehMaiorQueda && (
        <div className="text-[10px] mt-1" style={{ color: CHART_COLORS.danger }}>▼ Maior queda mensal</div>
      )}
    </div>
  );
}

function Row({ label, valor, cor, bold }: { label: string; valor: string; cor?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span style={{ color: CHART_COLORS.textMuted }}>{label}</span>
      <span
        className="tabular-nums"
        style={{ color: cor ?? CHART_COLORS.text, fontWeight: bold ? 600 : 500 }}
      >
        {valor}
      </span>
    </div>
  );
}

export function EvolucaoPatrimonioChart({
  data, altura,
}: { data: PontoPatrimonio[]; altura?: number }) {
  const maiorPatr = data.find((d) => d.ehMaiorPatrimonio);
  const maiorQueda = data.find((d) => d.ehMaiorQueda);

  return (
    <ResponsiveContainer width="100%" height={altura ?? 260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="evol-valor" x1="0" y1="0" x2="0" y2="1">
            {gradientStops(CHART_COLORS.primary).map((s, i) => (
              <stop key={i} {...s} />
            ))}
          </linearGradient>
          <linearGradient id="evol-investido" x1="0" y1="0" x2="0" y2="1">
            {gradientStops(CHART_COLORS.neutral).map((s, i) => (
              <stop key={i} {...s} />
            ))}
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="rotulo"
          {...AXIS_STYLE}
          tick={AXIS_LABEL_TICK}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          {...AXIS_STYLE}
          tick={AXIS_LABEL_TICK}
          width={72}
          tickFormatter={(v) => brl(v).replace("R$ ", "R$")}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={9} />
        <Area
          type="monotone"
          dataKey="investido"
          name="Investido"
          stroke={CHART_COLORS.neutral}
          fill="url(#evol-investido)"
          strokeDasharray="4 4"
          strokeWidth={1.8}
          activeDot={{ ...ACTIVE_DOT_PROPS, r: 4, fill: CHART_COLORS.neutral }}
          isAnimationActive
          animationDuration={400}
        />
        <Area
          type="monotone"
          dataKey="valor"
          name="Mercado"
          stroke={CHART_COLORS.primary}
          fill="url(#evol-valor)"
          activeDot={{ ...ACTIVE_DOT_PROPS, fill: CHART_COLORS.primary }}
          {...LINE_PROPS}
        />
        {maiorPatr && (
          <ReferenceDot
            x={maiorPatr.rotulo}
            y={maiorPatr.valor}
            fill={CHART_COLORS.primary}
            {...REF_DOT_HIGHLIGHT}
            ifOverflow="extendDomain"
          />
        )}
        {maiorQueda && (
          <ReferenceDot
            x={maiorQueda.rotulo}
            y={maiorQueda.valor}
            fill={CHART_COLORS.danger}
            r={5}
            stroke="#fff"
            strokeWidth={1.8}
            ifOverflow="extendDomain"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
