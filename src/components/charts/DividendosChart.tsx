"use client";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { brl } from "@/lib/format";
import {
  CHART_COLORS, AXIS_STYLE, AXIS_LABEL_TICK, GRID_PROPS,
  TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_CURSOR,
  LINE_PROPS, ACTIVE_DOT_PROPS, gradientStops,
} from "@/lib/chart-theme";

export function DividendosChart({ data }: { data: { mes: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dividendos-area" x1="0" y1="0" x2="0" y2="1">
            {gradientStops(CHART_COLORS.primary).map((s, i) => (
              <stop key={i} {...s} />
            ))}
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="mes"
          {...AXIS_STYLE}
          tick={AXIS_LABEL_TICK}
          minTickGap={20}
        />
        <YAxis
          {...AXIS_STYLE}
          tick={AXIS_LABEL_TICK}
          width={80}
          tickFormatter={(v) => brl(v).replace("R$ ", "R$")}
        />
        <Tooltip
          contentStyle={TOOLTIP_CONTENT_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          cursor={TOOLTIP_CURSOR}
          formatter={(v: number) => [brl(v), "Dividendos"]}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke={CHART_COLORS.primary}
          fill="url(#dividendos-area)"
          activeDot={{ ...ACTIVE_DOT_PROPS, fill: CHART_COLORS.primary }}
          {...LINE_PROPS}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
