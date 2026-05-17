"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sliders } from "lucide-react";
import { brl, formatarMeses, pct } from "@/lib/format";
import { mesesAteMeta } from "@/lib/domain/projecao";
import { useToast } from "@/components/ux/Toast";

type Meta = {
  id: string;
  rendaMensalAlvo: number;
  aporteMensal: number;
  salarioMensal: number;
  percentualAporte: number;
  ativa: boolean;
} | null;
type Cfg = {
  id: string;
  dyEstimadoAA: number;
  cenarioConservador: number;
  cenarioModerado: number;
  cenarioOtimista: number;
} | null;

export function MetasClient({
  meta, cfg, patrimonio, rendaAtual, yieldRealizado, aporteMedioReal,
}: {
  meta: Meta; cfg: Cfg;
  patrimonio: number; rendaAtual: number; yieldRealizado: number;
  aporteMedioReal: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [rendaAlvo, setRendaAlvo] = useState(meta?.rendaMensalAlvo ?? 10000);
  const [yAnual, setYAnual] = useState(cfg?.dyEstimadoAA ?? 0.09);
  const [reinvestir, setReinvestir] = useState(true);
  const [avancado, setAvancado] = useState(false);
  const [salario, setSalario] = useState(meta?.salarioMensal ?? 0);
  const [percAporte, setPercAporte] = useState((meta?.percentualAporte ?? 0.3) * 100);
  const aporteMinimo = salario * (percAporte / 100);
  const [salvando, setSalvando] = useState(false);

  const [cCon, setCon] = useState(cfg?.cenarioConservador ?? 0.06);
  const [cMod, setMod] = useState(cfg?.cenarioModerado ?? 0.09);
  const [cOti, setOti] = useState(cfg?.cenarioOtimista ?? 0.12);

  const aporte = aporteMedioReal;

  const meses = useMemo(() => mesesAteMeta({
    patrimonio, aporteMensal: aporte, yieldAnual: yAnual, metaMensal: rendaAlvo, reinvestir,
  }), [patrimonio, aporte, yAnual, rendaAlvo, reinvestir]);

  const progresso = Math.min(1, rendaAtual / rendaAlvo);
  const faltam = Math.max(0, rendaAlvo - rendaAtual);

  async function salvar() {
    setSalvando(true);
    try {
      await Promise.all([
        fetch("/api/meta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rendaMensalAlvo: rendaAlvo,
            aporteMensal: aporte,
            salarioMensal: salario,
            percentualAporte: percAporte / 100,
          }),
        }),
        fetch("/api/configuracao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dyEstimadoAA: yAnual,
            cenarioConservador: cCon,
            cenarioModerado: cMod,
            cenarioOtimista: cOti,
          }),
        }),
      ]);
      toast("sucesso", "Meta atualizada");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Meta de renda</h1>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">Defina seu objetivo e veja quanto tempo falta.</p>
      </header>

      <section className="card">
        <div className="flex justify-between items-baseline mb-3 gap-2 flex-wrap">
          <span className="text-[10px] md:text-xs uppercase tracking-wider text-zinc-500">Progresso</span>
          <span className="text-xs md:text-sm font-medium text-emerald-400 whitespace-nowrap">
            {formatarMeses(meses)}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-2xl md:text-3xl font-semibold tabular-nums">{brl(rendaAtual)}</span>
          <span className="text-sm md:text-lg text-zinc-500 tabular-nums">/ {brl(rendaAlvo)}</span>
        </div>
        <div className="text-[11px] md:text-xs text-zinc-500 mt-1">
          Faltam {brl(faltam)}/mês · aporte real {brl(aporte)}/mês
        </div>
        <div className="mt-5 h-3 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all"
               style={{ width: `${progresso * 100}%` }} />
        </div>
      </section>

      {/* Meta mensal de aporte */}
      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold">Aporte mensal mínimo</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Defina seu salário e o percentual mínimo que você quer investir todo mês.
            O Dashboard vai te avisar se você está dentro ou fora dessa meta.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Salário mensal (R$)</label>
            <input
              type="number" min={0} step={100}
              className="input text-lg font-semibold"
              value={salario}
              onChange={(e) => setSalario(Number(e.target.value))}
              placeholder="ex: 5000"
            />
          </div>
          <div>
            <label className="label flex justify-between">
              <span>Percentual mínimo</span>
              <span className="text-emerald-400">{percAporte.toFixed(0)}%</span>
            </label>
            <input
              type="range" min={5} max={80} step={1}
              value={percAporte}
              onChange={(e) => setPercAporte(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
              <span>5%</span><span>30%</span><span>50%</span><span>80%</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Meta mínima por mês
          </div>
          <div className="text-2xl md:text-3xl font-semibold tabular-nums text-emerald-400 mt-1">
            {brl(aporteMinimo)}
          </div>
          {salario > 0 && (
            <div className="text-[11px] text-zinc-500 mt-1">
              {percAporte.toFixed(0)}% de {brl(salario)} de salário
            </div>
          )}
          {salario === 0 && (
            <div className="text-[11px] text-amber-400 mt-1">
              Defina seu salário acima para ativar a meta mensal
            </div>
          )}
        </div>
      </section>

      <section className="card space-y-5">
        <div className="flex justify-between items-baseline">
          <h2 className="font-semibold">Parâmetros</h2>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">automático</span>
        </div>

        <Slider label="Meta mensal" value={rendaAlvo} min={1000} max={50000} step={500}
                onChange={setRendaAlvo} format={brl} />

        <div className="grid md:grid-cols-2 gap-4">
          <Info label="Aporte mensal (12m)" valor={brl(aporte)} hint="média histórica real" accent />
          <Info label="Renda atual (12m)"   valor={brl(rendaAtual)} hint="média dividendos" />
        </div>

        <Slider label="DY anual estimado" value={yAnual} min={0.04} max={0.16} step={0.005}
                onChange={setYAnual} format={(v) => pct(v)} />

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={reinvestir} onChange={(e) => setReinvestir(e.target.checked)} />
          Reinvestir 100% dos dividendos
        </label>

        <div className="border-t border-zinc-800 pt-4">
          <button
            onClick={() => setAvancado(!avancado)}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200"
          >
            <Sliders size={12} />
            Opções avançadas
          </button>
          {avancado && (
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <NumField label="Conservador (% a.a.)" value={cCon * 100} onChange={(v) => setCon(v / 100)} />
              <NumField label="Moderado (% a.a.)"    value={cMod * 100} onChange={(v) => setMod(v / 100)} />
              <NumField label="Otimista (% a.a.)"    value={cOti * 100} onChange={(v) => setOti(v / 100)} />
            </div>
          )}
        </div>

        <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          DY realizado da sua carteira: <span className="text-emerald-400 font-medium">{pct(yieldRealizado)}</span>
        </div>

        <div className="flex justify-end">
          <button className="btn" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Info({ label, valor, hint, accent }: { label: string; valor: string; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-800 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${accent ? "text-emerald-400" : ""}`}>{valor}</div>
      {hint && <div className="text-[10px] text-zinc-500 mt-0.5">{hint}</div>}
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

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input" type="number" step="0.1" value={value.toFixed(1)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
