"use client";
import {
  Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
  CartesianGrid, Legend, Cell,
} from "recharts";
import { brl } from "@/lib/format";
import type { PontoRenda } from "@/lib/domain/dashboard-extras";

export function RendaAcumuladaChart({ data }: { data: PontoRenda[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="rotulo"
          stroke="#52525b"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={20}
        />
        <YAxis
          yAxisId="left"
          stroke="#52525b"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v) => brl(v).replace("R$ ", "R$")}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#52525b"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v) => brl(v).replace("R$ ", "R$")}
        />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(v: number, name: string) => [brl(v), name]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar
          yAxisId="left"
          dataKey="mensal"
          name="Mensal"
          fill="#10b981"
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.ehMesAtual ? "#34d399" : "#10b981"} fillOpacity={entry.ehMesAtual ? 1 : 0.75} />
          ))}
        </Bar>
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="acumulado"
          name="Acumulado"
          stroke="#a78bfa"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
