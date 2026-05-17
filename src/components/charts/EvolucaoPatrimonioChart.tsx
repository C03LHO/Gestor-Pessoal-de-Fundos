"use client";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  CartesianGrid, Legend, ReferenceDot,
} from "recharts";
import { brl, pct } from "@/lib/format";
import type { PontoPatrimonio } from "@/lib/domain/dashboard-extras";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PontoPatrimonio;
  const diff = p.valor - p.investido;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs space-y-0.5 shadow-xl">
      <div className="font-medium text-zinc-200 mb-1">{label}</div>
      <div className="flex justify-between gap-3">
        <span className="text-zinc-500">Mercado</span>
        <span className="tabular-nums text-emerald-400">{brl(p.valor)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-zinc-500">Investido</span>
        <span className="tabular-nums text-zinc-300">{brl(p.investido)}</span>
      </div>
      <div className="flex justify-between gap-3 border-t border-zinc-800 pt-1 mt-1">
        <span className="text-zinc-500">Diferença</span>
        <span className={`tabular-nums font-medium ${diff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {diff >= 0 ? "+" : ""}{brl(diff)}
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-zinc-500">Rentabilidade</span>
        <span className={`tabular-nums font-medium ${p.rentabilidade >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {p.rentabilidade >= 0 ? "+" : ""}{pct(p.rentabilidade)}
        </span>
      </div>
      {p.ehMaiorPatrimonio && <div className="text-[10px] text-emerald-300 mt-1">★ Maior patrimônio do período</div>}
      {p.ehMaiorQueda && <div className="text-[10px] text-rose-300 mt-1">▼ Maior queda mensal do período</div>}
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
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="evol-valor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="evol-investido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#71717a" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          stroke="#52525b"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => brl(v).replace("R$ ", "R$")}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area
          type="monotone"
          dataKey="investido"
          name="Investido"
          stroke="#71717a"
          strokeWidth={1.5}
          fill="url(#evol-investido)"
          strokeDasharray="4 4"
        />
        <Area
          type="monotone"
          dataKey="valor"
          name="Mercado"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#evol-valor)"
        />
        {maiorPatr && (
          <ReferenceDot
            x={maiorPatr.rotulo}
            y={maiorPatr.valor}
            r={5}
            fill="#10b981"
            stroke="#fff"
            strokeWidth={2}
            ifOverflow="extendDomain"
          />
        )}
        {maiorQueda && (
          <ReferenceDot
            x={maiorQueda.rotulo}
            y={maiorQueda.valor}
            r={4}
            fill="#f43f5e"
            stroke="#fff"
            strokeWidth={1.5}
            ifOverflow="extendDomain"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
