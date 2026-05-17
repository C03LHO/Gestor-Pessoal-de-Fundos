"use client";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { brl } from "@/lib/format";

export function PatrimonioChart({ data }: { data: { mes: string; investido: number; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="patr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="mes" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} width={70}
               tickFormatter={(v) => brl(v).replace("R$ ", "R$")} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12 }}
          formatter={(v: number) => brl(v)}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="valor"     name="Valor"     stroke="#10b981" strokeWidth={2} fill="url(#patr)" />
        <Area type="monotone" dataKey="investido" name="Investido" stroke="#71717a" strokeWidth={1.5} fill="transparent" strokeDasharray="3 3" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
