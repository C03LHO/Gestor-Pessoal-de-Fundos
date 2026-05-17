"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Medal, AlertTriangle, Coins,
  Trophy, BarChart3, ArrowUpRight,
} from "lucide-react";
import { brl, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { RendaAcumuladaChart } from "@/components/charts/RendaAcumuladaChart";
import { EvolucaoPatrimonioChart } from "@/components/charts/EvolucaoPatrimonioChart";
import type {
  RendaAcumulada, TopPerformers, EvolucaoPatrimonio, Performer, PontoPatrimonio,
} from "@/lib/domain/dashboard-extras";

type Props = {
  renda: RendaAcumulada;
  performersAtual: TopPerformers;
  performersAnterior: TopPerformers;
  evolucao: EvolucaoPatrimonio;     // série completa
  evolucaoMaxMeses: number;          // tamanho da série
};

const PERIODOS = [
  { id: "3m",  label: "3m",  meses: 3 },
  { id: "6m",  label: "6m",  meses: 6 },
  { id: "12m", label: "12m", meses: 12 },
  { id: "max", label: "Tudo", meses: Infinity },
] as const;
type PeriodoId = typeof PERIODOS[number]["id"];

export function EvolucaoPerformance({
  renda, performersAtual, performersAnterior, evolucao, evolucaoMaxMeses,
}: Props) {
  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Evolução & Performance</h2>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
          Renda recebida, melhores ativos do mês e evolução do patrimônio.
        </p>
      </header>

      <RendaAcumuladaSection renda={renda} />
      <TopPerformersSection atual={performersAtual} anterior={performersAnterior} />
      <EvolucaoSection evolucao={evolucao} maxMeses={evolucaoMaxMeses} />
    </div>
  );
}

// ========== 1. RENDA ACUMULADA ==========

function RendaAcumuladaSection({ renda }: { renda: RendaAcumulada }) {
  if (renda.serie.length < 2) {
    return (
      <section className="card">
        <h3 className="font-semibold text-sm md:text-base mb-1 flex items-center gap-2">
          <Coins size={16} className="text-emerald-400" /> Renda acumulada
        </h3>
        <p className="text-xs text-zinc-500 mt-2">
          Pelo menos 2 meses de dividendos registrados são necessários para o gráfico.
          Adicione recebimentos ou aguarde os próximos dividendos serem importados.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex justify-between items-baseline gap-2 flex-wrap mb-3">
        <h3 className="font-semibold text-sm md:text-base flex items-center gap-2">
          <Coins size={16} className="text-emerald-400" /> Renda acumulada
        </h3>
        <span className="text-[10px] md:text-xs text-zinc-500">{renda.meses} meses</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <KpiInline
          label="Total acumulado"
          valor={brl(renda.total)}
          hint={`${renda.meses} ${renda.meses === 1 ? "mês" : "meses"}`}
          accent="emerald"
        />
        <KpiInline
          label="Melhor mês"
          valor={renda.melhorMes ? brl(renda.melhorMes.valor) : "—"}
          hint={renda.melhorMes?.rotulo ?? ""}
        />
      </div>

      <div className="h-[180px] md:h-[280px]">
        <RendaAcumuladaChart data={renda.serie} />
      </div>
    </section>
  );
}

// ========== 2. TOP PERFORMERS ==========

function TopPerformersSection({
  atual, anterior,
}: { atual: TopPerformers; anterior: TopPerformers }) {
  const [qual, setQual] = useState<"atual" | "anterior">("atual");
  const dados = qual === "atual" ? atual : anterior;
  const semDados =
    dados.topValorizacao.length === 0 &&
    dados.topDividendos.length === 0 &&
    !dados.topQueda;

  return (
    <section className="card">
      <div className="flex justify-between items-baseline gap-2 flex-wrap mb-3">
        <h3 className="font-semibold text-sm md:text-base flex items-center gap-2">
          <Trophy size={16} className="text-amber-400" /> Top performers
        </h3>
        <div className="flex gap-1.5">
          {(["atual", "anterior"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQual(q)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border",
                qual === q
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 text-zinc-400",
              )}
            >
              {q === "atual" ? atual.mesRotulo : anterior.mesRotulo}
            </button>
          ))}
        </div>
      </div>

      {dados.avisos.length > 0 && (
        <div className="mb-3 text-[10px] text-amber-300/90 flex items-start gap-1.5 bg-amber-950/20 border border-amber-900/30 rounded-md px-2 py-1.5">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <div>{dados.avisos.join(" · ")}</div>
        </div>
      )}

      {semDados ? (
        <p className="text-xs text-zinc-500 py-3">
          Sem dados suficientes para {dados.mesRotulo}. Pelo menos 2 fundos com cotação anterior são necessários.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Valorização */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1">
              <TrendingUp size={12} /> Maior valorização
            </div>
            <div className="space-y-2">
              {dados.topValorizacao.length === 0 ? (
                <div className="text-xs text-zinc-500">Nenhuma alta no mês.</div>
              ) : (
                dados.topValorizacao.map((p, i) => (
                  <PerformerCardValor key={p.ticker} p={p} rank={i + 1} />
                ))
              )}
              {dados.topQueda && (
                <div className="pt-1 mt-1 border-t border-zinc-800">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
                    <TrendingDown size={12} /> Pior queda
                  </div>
                  <PerformerCardValor p={dados.topQueda} rank={null} />
                </div>
              )}
            </div>
          </div>

          {/* Dividendos */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1">
              <Coins size={12} /> Maiores dividendos
            </div>
            <div className="space-y-2">
              {dados.topDividendos.length === 0 ? (
                <div className="text-xs text-zinc-500">Nenhum dividendo pago no mês.</div>
              ) : (
                dados.topDividendos.map((p, i) => (
                  <PerformerCardDiv key={p.ticker} p={p} rank={i + 1} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Medalha({ rank }: { rank: number }) {
  const cor =
    rank === 1 ? "text-amber-300" :
    rank === 2 ? "text-zinc-300" :
    rank === 3 ? "text-orange-400" : "text-zinc-500";
  return <Medal size={14} className={cor} />;
}

function PerformerCardValor({ p, rank }: { p: Performer; rank: number | null }) {
  const positivo = (p.variacaoPct ?? 0) > 0;
  return (
    <Link
      href={`/carteira/${p.ticker}`}
      className={cn(
        "block rounded-lg p-2.5 border transition active:scale-[0.99]",
        positivo
          ? "bg-emerald-500/[0.08] border-emerald-500/20"
          : "bg-rose-500/[0.08] border-rose-500/20",
      )}
    >
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {rank != null && <Medalha rank={rank} />}
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{p.ticker}</div>
            <div className="text-[10px] text-zinc-500 truncate">{p.nome ?? ""}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={cn(
            "text-sm font-semibold tabular-nums",
            positivo ? "text-emerald-300" : "text-rose-300",
          )}>
            {positivo ? "▲" : "▼"} {pct(Math.abs(p.variacaoPct ?? 0))}
          </div>
          <div className="text-[10px] text-zinc-500 tabular-nums">
            {p.variacaoAbs != null && (
              <>{positivo ? "+" : ""}{brl(p.variacaoAbs)}/cota</>
            )}
          </div>
        </div>
      </div>
      {p.precisao === "aproximada" && (
        <div className="text-[9px] text-amber-300/80 mt-1">~ base aproximada</div>
      )}
    </Link>
  );
}

function PerformerCardDiv({ p, rank }: { p: Performer; rank: number }) {
  return (
    <Link
      href={`/carteira/${p.ticker}`}
      className="block rounded-lg p-2.5 border bg-emerald-500/[0.05] border-emerald-500/15 transition active:scale-[0.99]"
    >
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Medalha rank={rank} />
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{p.ticker}</div>
            <div className="text-[10px] text-zinc-500 truncate">{p.nome ?? ""}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold tabular-nums text-emerald-300">
            {brl(p.dividendoPago)}
          </div>
          {p.dyDoMes != null && (
            <div className="text-[10px] text-zinc-500 tabular-nums">
              DY mês {pct(p.dyDoMes)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ========== 3. EVOLUÇÃO DO PATRIMÔNIO ==========

function EvolucaoSection({
  evolucao, maxMeses,
}: { evolucao: EvolucaoPatrimonio; maxMeses: number }) {
  const [periodo, setPeriodo] = useState<PeriodoId>("12m");

  // Slice da série pelo período escolhido
  const serie = useMemo(() => {
    if (evolucao.serie.length === 0) return [];
    const cfg = PERIODOS.find((p) => p.id === periodo)!;
    const n = cfg.meses === Infinity ? evolucao.serie.length : Math.min(cfg.meses, evolucao.serie.length);
    return evolucao.serie.slice(-n);
  }, [evolucao.serie, periodo]);

  // KPIs recalculados pra janela selecionada (último ponto + variação vs anterior dentro da janela)
  const kpis = useMemo(() => calcularKpisSerie(serie, evolucao), [serie, evolucao]);

  if (evolucao.serie.length < 2) {
    return (
      <section className="card">
        <h3 className="font-semibold text-sm md:text-base flex items-center gap-2 mb-2">
          <BarChart3 size={16} className="text-violet-400" /> Evolução do patrimônio
        </h3>
        {evolucao.serie.length === 1 ? (
          <p className="text-xs text-zinc-500">
            Patrimônio estimado: <span className="text-zinc-200 font-medium">{brl(evolucao.serie[0].valor)}</span>.
            Aguarde o próximo mês para ver evolução.
          </p>
        ) : (
          <p className="text-xs text-zinc-500">
            Sem lançamentos suficientes pra reconstruir o histórico de patrimônio.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex justify-between items-baseline gap-2 flex-wrap mb-3">
        <h3 className="font-semibold text-sm md:text-base flex items-center gap-2">
          <BarChart3 size={16} className="text-violet-400" /> Evolução do patrimônio
        </h3>
        <div className="flex gap-1">
          {PERIODOS.map((p) => {
            const desabilitado = p.meses !== Infinity && p.meses > maxMeses;
            return (
              <button
                key={p.id}
                onClick={() => !desabilitado && setPeriodo(p.id)}
                disabled={desabilitado}
                className={cn(
                  "px-2 py-1 text-xs rounded-md border",
                  periodo === p.id
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-800 text-zinc-400",
                  desabilitado && "opacity-30 cursor-not-allowed",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-3">
        <KpiInline label="Valor atual"   valor={brl(kpis.valorAtual)} accent="emerald" />
        <KpiInline label="Investido"     valor={brl(kpis.investido)} />
        <KpiInline
          label="Rentabilidade"
          valor={`${kpis.lucroPct >= 0 ? "+" : ""}${pct(kpis.lucroPct)}`}
          hint={`${kpis.lucro >= 0 ? "+" : ""}${brl(kpis.lucro)}`}
          accent={kpis.lucroPct >= 0 ? "emerald" : "rose"}
        />
        <KpiInline
          label="Variação no mês"
          valor={`${kpis.variacaoMesPct >= 0 ? "+" : ""}${pct(kpis.variacaoMesPct)}`}
          hint={`${kpis.variacaoMes >= 0 ? "+" : ""}${brl(kpis.variacaoMes)}`}
          accent={kpis.variacaoMesPct >= 0 ? "emerald" : "rose"}
        />
      </div>

      {evolucao.avisos.length > 0 && (
        <div className="mb-3 text-[10px] text-amber-300/90 flex items-start gap-1.5 bg-amber-950/20 border border-amber-900/30 rounded-md px-2 py-1.5">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <div>{evolucao.avisos.join(" · ")}</div>
        </div>
      )}

      <div className="h-[200px] md:h-[300px]">
        <EvolucaoPatrimonioChart data={serie} altura={undefined} />
      </div>

      <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Maior patrimônio
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Maior queda mensal
        </span>
      </div>
    </section>
  );
}

function calcularKpisSerie(serie: PontoPatrimonio[], evolucao: EvolucaoPatrimonio) {
  if (serie.length === 0) return evolucao.kpis;
  const ultimo = serie[serie.length - 1];
  const penultimo = serie.length >= 2 ? serie[serie.length - 2] : null;
  return {
    valorAtual: ultimo.valor,
    investido: ultimo.investido,
    lucro: ultimo.valor - ultimo.investido,
    lucroPct: ultimo.rentabilidade,
    variacaoMes: penultimo ? ultimo.valor - penultimo.valor : 0,
    variacaoMesPct: penultimo && penultimo.valor > 0
      ? (ultimo.valor - penultimo.valor) / penultimo.valor : 0,
  };
}

// ========== Helpers ==========

function KpiInline({ label, valor, hint, accent }: {
  label: string; valor: string; hint?: string; accent?: "emerald" | "rose";
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
      <div className="text-[9px] md:text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={cn(
        "text-base md:text-xl font-semibold tabular-nums truncate mt-0.5",
        accent === "emerald" && "text-emerald-400",
        accent === "rose" && "text-rose-400",
      )}>
        {valor}
      </div>
      {hint && <div className="text-[10px] text-zinc-500 truncate">{hint}</div>}
    </div>
  );
}
