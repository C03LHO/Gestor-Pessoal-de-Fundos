"use client";
import { useMemo } from "react";
import { brl, dataBR } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CalendarClock, Check } from "lucide-react";

type Lanc = {
  id: string; data: string; valorTotal: number;
  ativo: { ticker: string } | null;
};
type Previsao = {
  total: number;
  itens: { ticker: string; previsao: number; tendencia: string; metodo: string }[];
};
type Proximo = {
  ticker: string;
  dataEstimada: string;
  valorEstimado: number;
  valorPorCotaEstimado: number;
  cotas: number;
  fonte: "historico-proprio" | "yahoo" | "indisponivel";
  confianca: "alta" | "media" | "baixa";
  diasAteEvento: number;
};

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function CalendarioClient({
  lancamentos, previsao, proximos,
}: { lancamentos: Lanc[]; previsao: Previsao; proximos: Proximo[] }) {

  const heatmap = useMemo(() => construirHeatmap(lancamentos), [lancamentos]);
  const distDia = useMemo(() => distribuicaoPorDia(lancamentos), [lancamentos]);
  const max = Math.max(...Object.values(heatmap.cells).map((v) => v ?? 0), 1);

  const totalProximos = proximos.reduce((s, p) => s + p.valorEstimado, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Calendário</h1>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">Quando seus proventos costumam cair.</p>
      </header>

      {/* Próximos dividendos estimados — destaque principal */}
      <section className="card">
        <div className="flex justify-between items-baseline mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-emerald-400" />
            <h2 className="font-semibold">Próximos pagamentos estimados</h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Total estimado</div>
            <div className="text-lg md:text-xl font-semibold text-emerald-400 tabular-nums">{brl(totalProximos)}</div>
          </div>
        </div>
        {proximos.length === 0 ? (
          <p className="text-sm text-zinc-500">Sem ativos suficientes para estimar.</p>
        ) : (
          <div className="space-y-2">
            {proximos.map((p) => (
              <ProximoCard key={p.ticker} p={p} />
            ))}
          </div>
        )}
      </section>

      {/* Heatmap */}
      <section className="card">
        <h2 className="font-semibold mb-3">Heatmap — quando você recebe</h2>
        <p className="text-xs text-zinc-500 mb-3">Cada quadrado = um pagamento real. Quanto mais escuro/verde, maior o valor.</p>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(31, minmax(14px, 1fr))` }}>
              <div />
              {Array.from({ length: 31 }, (_, i) => (
                <div key={i} className="text-[8px] text-zinc-600 text-center">{i + 1}</div>
              ))}
              {heatmap.meses.map((m) => (
                <Linha key={m} mes={m} cells={heatmap.cells} max={max} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Distribuição por dia */}
      <section className="card">
        <h2 className="font-semibold mb-3">Distribuição por dia do mês</h2>
        <p className="text-xs text-zinc-500 mb-3">Total acumulado por dia ao longo de todo o histórico.</p>
        <div className="space-y-1">
          {distDia.map((d) => {
            const w = (d.valor / distDia[0].valor) * 100;
            return (
              <div key={d.dia} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-zinc-500 text-right">{d.dia}</span>
                <div className="flex-1 bg-zinc-900 rounded h-5 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-emerald-500/60"
                       style={{ width: `${w}%` }} />
                  <span className="absolute inset-0 flex items-center justify-end pr-2 tabular-nums font-medium">
                    {brl(d.valor)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Histórico recente */}
      <section className="card">
        <h2 className="font-semibold mb-3">Últimos recebimentos</h2>
        <div className="space-y-2">
          {lancamentos.slice(0, 15).map((l) => (
            <div key={l.id} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
              <div>
                <div className="font-medium text-sm">{l.ativo?.ticker ?? "—"}</div>
                <div className="text-[10px] text-zinc-500">{dataBR(l.data)}</div>
              </div>
              <span className="text-emerald-400 font-medium tabular-nums text-sm">{brl(l.valorTotal)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProximoCard({ p }: { p: Proximo }) {
  const data = new Date(p.dataEstimada);
  const hoje = new Date();
  const ehHoje = p.diasAteEvento === 0;
  const ehAmanha = p.diasAteEvento === 1;
  const ehProximaSemana = p.diasAteEvento <= 7;

  const labelData =
    ehHoje ? "Hoje" :
    ehAmanha ? "Amanhã" :
    ehProximaSemana ? `Em ${p.diasAteEvento} dias` :
    `Em ${p.diasAteEvento} dias`;

  const cor =
    ehHoje ? "text-emerald-400" :
    ehProximaSemana ? "text-amber-300" :
    "text-zinc-400";

  return (
    <div className="flex justify-between items-center py-3 border-b border-zinc-800 last:border-0 gap-3">
      {/* Bloco data — visual de calendário */}
      <div className="shrink-0 w-12 text-center">
        <div className="text-[9px] uppercase text-zinc-500 leading-none">
          {DIAS_SEMANA[data.getDay()]}
        </div>
        <div className="text-2xl font-bold tabular-nums leading-tight mt-0.5">
          {data.getDate()}
        </div>
        <div className="text-[9px] uppercase text-zinc-500 leading-none">
          {MESES[data.getMonth()]}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{p.ticker}</span>
          <span className={cn("text-[10px] uppercase font-medium", cor)}>
            {labelData}
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 mt-0.5">
          {p.cotas} cotas × {brl(p.valorPorCotaEstimado)}
          <span className="ml-2">
            {p.fonte === "historico-proprio" && "(seu histórico)"}
            {p.fonte === "yahoo" && "(padrão do mercado)"}
          </span>
          <span className="ml-2">
            {p.confianca === "alta" && "·  confiança alta"}
            {p.confianca === "media" && "·  confiança média"}
            {p.confianca === "baixa" && "·  confiança baixa"}
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-emerald-400 font-semibold tabular-nums">{brl(p.valorEstimado)}</div>
      </div>
    </div>
  );
}

function Linha({ mes, cells, max }: { mes: string; cells: Record<string, number>; max: number }) {
  return (
    <>
      <div className="text-[10px] text-zinc-500 pr-2 self-center">{mes.slice(2)}</div>
      {Array.from({ length: 31 }, (_, i) => {
        const v = cells[`${mes}-${String(i + 1).padStart(2, "0")}`] ?? 0;
        const intensity = v > 0 ? Math.min(1, v / max) : 0;
        return (
          <div
            key={i}
            className="aspect-square rounded-sm"
            style={{
              background: v > 0
                ? `rgba(16, 185, 129, ${0.2 + intensity * 0.8})`
                : "rgba(63, 63, 70, 0.3)",
            }}
            title={v > 0 ? `${mes}-${i + 1}: ${brl(v)}` : ""}
          />
        );
      })}
    </>
  );
}

function construirHeatmap(lancs: Lanc[]) {
  const cells: Record<string, number> = {};
  const meses = new Set<string>();
  for (const l of lancs) {
    const d = new Date(l.data);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    const chave = `${y}-${m}-${dia}`;
    const mes = `${y}-${m}`;
    cells[chave] = (cells[chave] ?? 0) + l.valorTotal;
    meses.add(mes);
  }
  return {
    cells,
    meses: Array.from(meses).sort().reverse().slice(0, 6),
  };
}

function distribuicaoPorDia(lancs: Lanc[]) {
  const map = new Map<number, number>();
  for (const l of lancs) {
    const dia = new Date(l.data).getDate();
    map.set(dia, (map.get(dia) ?? 0) + l.valorTotal);
  }
  return Array.from(map.entries())
    .map(([dia, valor]) => ({ dia, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);
}
