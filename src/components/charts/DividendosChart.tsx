"use client";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brl } from "@/lib/format";

export function DividendosChart({ data }: { data: { mes: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="mes" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false}
               tickFormatter={(v) => brl(v).replace("R$ ", "R$")} width={80} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12 }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(v: number) => [brl(v), "Dividendos"]}
        />
        <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fill="url(#g1)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
