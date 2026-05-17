"use client";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend, ReferenceLine,
} from "recharts";
import { brl, formatarMeses, pct } from "@/lib/format";
import { cenariosPadrao } from "@/lib/domain/simulacao";
import { mesesAteMeta } from "@/lib/domain/projecao";

type Historico = {
  serie: { mes: string; valor: number }[];
  totalUltimos12m: number;
  mediaMensal12m: number;
  mediaMensal6m: number;
  mediaMensal3m: number;
};

type Base = "12m" | "6m" | "3m" | "manual";

export function SimuladorClient({
  patrimonio, yieldRealizado, metaMensal, historico, cenarios,
}: {
  patrimonio: number;
  yieldRealizado: number;
  metaMensal: number;
  historico: Historico;
  cenarios: { conservador: number; moderado: number; otimista: number };
}) {
  const [base, setBase] = useState<Base>(historico.mediaMensal12m > 0 ? "12m" : "manual");
  const [aporteManual, setAporteManual] = useState(historico.mediaMensal12m || 3000);
  const [anos, setAnos] = useState(15);
  const [reinvestir, setReinvestir] = useState(true);

  const aporteUsado = base === "12m" ? historico.mediaMensal12m
                    : base === "6m"  ? historico.mediaMensal6m
                    : base === "3m"  ? historico.mediaMensal3m
                    : aporteManual;

  const series = useMemo(
    () => cenariosPadrao({
      patrimonio,
      aporteMensal: aporteUsado,
      meses: anos * 12,
      reinvestir,
      ...cenarios,
    }),
    [patrimonio, aporteUsado, anos, reinvestir, cenarios],
  );

  const dados = series.moderado.map((p, i) => ({
    mes: i,
    Conservador: series.conservador[i]?.renda ?? 0,
    Moderado: series.moderado[i]?.renda ?? 0,
    Otimista: series.otimista[i]?.renda ?? 0,
  }));

  const cards = [
    { nome: "Conservador", y: cenarios.conservador, cor: "text-zinc-300", serie: series.conservador },
    { nome: "Moderado",    y: cenarios.moderado,    cor: "text-emerald-400", serie: series.moderado },
    { nome: "Otimista",    y: cenarios.otimista,    cor: "text-cyan-400", serie: series.otimista },
  ];

  const opcoesBase: { id: Base; label: string; valor: number; hint: string }[] = [
    { id: "3m",  label: "Média 3 meses",  valor: historico.mediaMensal3m,  hint: "trimestre recente" },
    { id: "6m",  label: "Média 6 meses",  valor: historico.mediaMensal6m,  hint: "semestre" },
    { id: "12m", label: "Média 12 meses", valor: historico.mediaMensal12m, hint: "padrão histórico" },
    { id: "manual", label: "Manual", valor: aporteManual, hint: "informe um valor" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Simulador</h1>
        <p className="text-zinc-400 mt-1">
          Projeção baseada no seu histórico real de aportes e reinvestimentos.
        </p>
      </header>

      <section className="card">
        <h2 className="font-semibold mb-1">Seu histórico de aportes (12m)</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Considera compras, reinvestimentos e aportes em dinheiro novo.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="Total 12m"   valor={brl(historico.totalUltimos12m)} />
          <Stat label="Média 12m/mês" valor={brl(historico.mediaMensal12m)} accent />
          <Stat label="Média 6m/mês"  valor={brl(historico.mediaMensal6m)} />
          <Stat label="Média 3m/mês"  valor={brl(historico.mediaMensal3m)} />
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={historico.serie}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="mes" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false}
                   tickFormatter={(v) => brl(v).replace("R$ ", "R$")} width={80} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12 }}
              formatter={(v: number) => [brl(v), "Aporte"]}
            />
            <ReferenceLine y={historico.mediaMensal12m} stroke="#10b981" strokeDasharray="3 3" />
            <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold">Aporte projetado</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Use uma base do seu histórico ou defina um valor manual.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {opcoesBase.map((o) => (
            <button
              key={o.id}
              onClick={() => setBase(o.id)}
              className={`text-left p-3 rounded-xl border transition ${
                base === o.id
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="text-xs text-zinc-400">{o.label}</div>
              <div className="text-lg font-semibold mt-1">
                {o.id === "manual" ? brl(aporteManual) : brl(o.valor)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">{o.hint}</div>
            </button>
          ))}
        </div>
        {base === "manual" && (
          <Slider label="Valor manual" value={aporteManual} min={0} max={30000} step={100}
                  onChange={setAporteManual} format={brl} />
        )}

        <div className="grid md:grid-cols-3 gap-4 pt-2 border-t border-zinc-800">
          <Slider label="Horizonte (anos)" value={anos} min={1} max={40} step={1} onChange={setAnos}
                  format={(v) => `${v} anos`} />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={reinvestir} onChange={(e) => setReinvestir(e.target.checked)} />
              Reinvestir dividendos
            </label>
          </div>
          <div className="text-right text-xs text-zinc-500 flex items-end justify-end">
            DY realizado da carteira: <span className="text-emerald-400 ml-1 font-medium">{pct(yieldRealizado)}</span>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const m = mesesAteMeta({
            patrimonio, aporteMensal: aporteUsado, yieldAnual: c.y, metaMensal, reinvestir,
          });
          const ultimo = c.serie.at(-1);
          return (
            <div key={c.nome} className="card">
              <div className="flex justify-between items-baseline">
                <h3 className={`font-semibold ${c.cor}`}>{c.nome}</h3>
                <span className="text-xs text-zinc-500">{pct(c.y)} a.a.</span>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <Row label={`Renda em ${anos}a`} value={brl(ultimo?.renda ?? 0)} />
                <Row label={`Patrimônio em ${anos}a`} value={brl(ultimo?.patrimonio ?? 0)} />
                <Row label="Tempo até meta" value={formatarMeses(m)} accent />
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-1">Renda mensal projetada</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Aporte mensal usado: <span className="text-zinc-300 font-medium">{brl(aporteUsado)}</span> ·
          Meta: <span className="text-zinc-300 font-medium">{brl(metaMensal)}</span>
        </p>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="mes" stroke="#52525b" fontSize={11}
                   tickFormatter={(m) => `${Math.round(m / 12)}a`} />
            <YAxis stroke="#52525b" fontSize={11} tickFormatter={(v) => brl(v).replace("R$ ", "R$")} width={80} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12 }}
              labelFormatter={(m) => `Mês ${m}`}
              formatter={(v: number) => brl(v)}
            />
            <Legend />
            <ReferenceLine y={metaMensal} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Meta", fill: "#f59e0b", fontSize: 11, position: "right" }} />
            <Line type="monotone" dataKey="Conservador" stroke="#a1a1aa" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Moderado"    stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Otimista"    stroke="#22d3ee" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, valor, accent }: { label: string; valor: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${accent ? "text-emerald-400" : ""}`}>{valor}</div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={accent ? "font-semibold text-emerald-400" : "font-medium"}>{value}</span>
    </div>
  );
}

function Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs uppercase tracking-wider text-zinc-400">{label}</span>
        <span className="text-sm font-medium">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={(e) => onChange(parseFloat(e.target.value))}
             className="w-full accent-emerald-500" />
    </div>
  );
}
