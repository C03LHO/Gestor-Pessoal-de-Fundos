"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { brl } from "@/lib/format";
import {
  CHART_COLORS, TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE,
  TOOLTIP_ITEM_STYLE, LEGEND_WRAPPER_STYLE,
} from "@/lib/chart-theme";

export function AlocacaoChart({ data }: { data: { nome: string; valor: number }[] }) {
  const total = data.reduce((s, d) => s + d.valor, 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valor"
          nameKey="nome"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          stroke={CHART_COLORS.bg}
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={CHART_COLORS.categorical[i % CHART_COLORS.categorical.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_CONTENT_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          formatter={(v: number, n) => {
            const p = total > 0 ? (v / total) * 100 : 0;
            return [`${brl(v)} · ${p.toFixed(1)}%`, n as string];
          }}
        />
        <Legend
          wrapperStyle={LEGEND_WRAPPER_STYLE}
          iconType="circle"
          iconSize={9}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
