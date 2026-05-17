"use client";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { brl } from "@/lib/format";
import {
  CHART_COLORS, AXIS_STYLE, AXIS_LABEL_TICK, GRID_PROPS,
  TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_CURSOR,
  LINE_PROPS, ACTIVE_DOT_PROPS, LEGEND_WRAPPER_STYLE, gradientStops,
} from "@/lib/chart-theme";

export function PatrimonioChart({ data }: { data: { mes: string; investido: number; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="patr-valor" x1="0" y1="0" x2="0" y2="1">
            {gradientStops(CHART_COLORS.primary).map((s, i) => (
              <stop key={i} {...s} />
            ))}
          </linearGradient>
          <linearGradient id="patr-invest" x1="0" y1="0" x2="0" y2="1">
            {gradientStops(CHART_COLORS.neutral).map((s, i) => (
              <stop key={i} {...s} />
            ))}
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="mes" {...AXIS_STYLE} tick={AXIS_LABEL_TICK} minTickGap={20} />
        <YAxis
          {...AXIS_STYLE}
          tick={AXIS_LABEL_TICK}
          width={72}
          tickFormatter={(v) => brl(v).replace("R$ ", "R$")}
        />
        <Tooltip
          contentStyle={TOOLTIP_CONTENT_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          cursor={TOOLTIP_CURSOR}
          formatter={(v: number) => brl(v)}
        />
        <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={9} />
        <Area
          type="monotone"
          dataKey="investido"
          name="Investido"
          stroke={CHART_COLORS.neutral}
          fill="url(#patr-invest)"
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
          fill="url(#patr-valor)"
          activeDot={{ ...ACTIVE_DOT_PROPS, fill: CHART_COLORS.primary }}
          {...LINE_PROPS}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
