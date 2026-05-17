"use client";
import {
  Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
  CartesianGrid, Legend, Cell,
} from "recharts";
import { brl } from "@/lib/format";
import {
  CHART_COLORS, AXIS_STYLE, AXIS_LABEL_TICK, GRID_PROPS,
  TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_CURSOR,
  LINE_PROPS, ACTIVE_DOT_PROPS, LEGEND_WRAPPER_STYLE,
} from "@/lib/chart-theme";
import type { PontoRenda } from "@/lib/domain/dashboard-extras";

export function RendaAcumuladaChart({ data }: { data: PontoRenda[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="rotulo"
          {...AXIS_STYLE}
          tick={AXIS_LABEL_TICK}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          yAxisId="left"
          {...AXIS_STYLE}
          tick={AXIS_LABEL_TICK}
          width={60}
          tickFormatter={(v) => brl(v).replace("R$ ", "R$")}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          {...AXIS_STYLE}
          tick={AXIS_LABEL_TICK}
          width={60}
          tickFormatter={(v) => brl(v).replace("R$ ", "R$")}
        />
        <Tooltip
          contentStyle={TOOLTIP_CONTENT_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          cursor={{ fill: CHART_COLORS.surfaceAlt, fillOpacity: 0.35 }}
          formatter={(v: number, name: string) => [brl(v), name]}
        />
        <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={9} />
        <Bar
          yAxisId="left"
          dataKey="mensal"
          name="Mensal"
          radius={[5, 5, 0, 0]}
          maxBarSize={32}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.ehMesAtual ? CHART_COLORS.primaryAlt : CHART_COLORS.primary}
            />
          ))}
        </Bar>
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="acumulado"
          name="Acumulado"
          stroke={CHART_COLORS.secondary}
          dot={false}
          activeDot={{ ...ACTIVE_DOT_PROPS, fill: CHART_COLORS.secondary }}
          {...LINE_PROPS}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
