import { DividendosChart } from "@/components/charts/DividendosChart";
import { AlocacaoChart } from "@/components/charts/AlocacaoChart";
import { PatrimonioChart } from "@/components/charts/PatrimonioChart";
import { brl, formatarMeses, pct } from "@/lib/format";
import { calcularPosicoes, resumoCarteira } from "@/lib/domain/posicao";
import { mesesAteMeta } from "@/lib/domain/projecao";
import { dividendosDoMes, dividendosPorMes } from "@/lib/domain/insights";
import { previsaoProximoMes } from "@/lib/domain/previsao";
import { historicoAportes } from "@/lib/domain/historico";
import { gerarAlertas } from "@/lib/domain/alertas";
import { calcularAderencia } from "@/lib/domain/aderencia";
import { patrimonioHistorico } from "@/lib/domain/patrimonio-historico";
import { sugerirRebalanceamento, ALOCACAO_ALVO_DEFAULT } from "@/lib/domain/rebalanceamento";
import { gerarInsights } from "@/lib/domain/insights-smart";
import { calcularOportunidades } from "@/lib/domain/watchlist";
import { aporteDoMesAtual } from "@/lib/domain/aporte-mes";
import { proximosDividendos } from "@/lib/domain/proximos-dividendos";
import {
  rendaAcumuladaMensal,
  topPerformersDoMes,
  evolucaoPatrimonio,
} from "@/lib/domain/dashboard-extras";
import { EvolucaoPerformance } from "@/components/dashboard/EvolucaoPerformance";
import { CalendarClock, Activity, Calendar as CalendarIcon, Award } from "lucide-react";
import { FiltroPeriodo } from "@/components/layout/FiltroPeriodo";
import { mesesDoPeriodo, type PeriodoId } from "@/lib/periodo";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { AlertTriangle, Info, TrendingUp, Sparkles, Trophy, Target as TargetIcon, TrendingDown, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: PeriodoId }>;
}) {
  const sp = await searchParams;
  const periodo: PeriodoId = sp.periodo ?? "12m";
  const periodoMeses = mesesDoPeriodo(periodo);

  const carteiraId = await getCarteiraAtivaId();
  const mesAtualInicio = (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })();
  const mesAnteriorInicio = (() => { const d = new Date(mesAtualInicio); d.setMonth(d.getMonth() - 1); return d; })();

  const [
    posicoes, meta, cfg, divMes, serie, previsao, hist, patrSerie, insights, oportunidades, aporteMes, proximos,
    rendaAcum, perfAtual, perfAnterior, evolucao,
  ] = await Promise.all([
    calcularPosicoes(carteiraId),
    prisma.meta.findFirst({ where: { ativa: true } }),
    prisma.configuracao.findFirst(),
    dividendosDoMes(carteiraId),
    dividendosPorMes(Math.min(periodoMeses, 24) - 1, carteiraId),
    previsaoProximoMes(carteiraId),
    historicoAportes(Math.min(periodoMeses, 24), carteiraId),
    patrimonioHistorico(Math.min(periodoMeses, 24), carteiraId),
    gerarInsights(carteiraId),
    calcularOportunidades(carteiraId).catch(() => []),
    aporteDoMesAtual(carteiraId),
    proximosDividendos(carteiraId).catch(() => []),
    rendaAcumuladaMensal(carteiraId),
    topPerformersDoMes(carteiraId, mesAtualInicio),
    topPerformersDoMes(carteiraId, mesAnteriorInicio),
    evolucaoPatrimonio(carteiraId, 120), // série máxima (até 10a) — UI fatia
  ]);

  // Stats extras
  const primeiroLanc = await prisma.lancamento.findFirst({
    where: { carteiraId },
    orderBy: { data: "asc" },
    select: { data: true },
  });
  const mesesInvestindo = primeiroLanc
    ? Math.max(1, Math.round(
        (Date.now() - primeiroLanc.data.getTime()) / (1000 * 60 * 60 * 24 * 30),
      ))
    : 0;
  const mesesRecebendo = serie.filter((s) => s.total > 0).length;
  const melhorMes = serie.reduce((m, s) => s.total > m.total ? s : m,
    { mes: "", total: 0 } as { mes: string; total: number });
  const top3Oportunidades = [...oportunidades]
    .sort((a, b) => b.scoreOportunidade - a.scoreOportunidade)
    .slice(0, 3);

  let alocAlvo: Record<string, number> = ALOCACAO_ALVO_DEFAULT;
  if (cfg?.alocacaoAlvo) {
    try { alocAlvo = JSON.parse(cfg.alocacaoAlvo); } catch {}
  }

  const resumo = resumoCarteira(posicoes);
  const y = cfg?.dyEstimadoAA ?? 0.09;
  const rendaAtual = resumo.mediaMensal;
  const variacao = resumo.investido > 0 ? resumo.valorAtual / resumo.investido - 1 : 0;
  const ganhoCapital = resumo.valorAtual - resumo.investido;

  const meses = meta ? mesesAteMeta({
    patrimonio: resumo.valorAtual,
    aporteMensal: hist.mediaMensal12m || 0,
    yieldAnual: y, metaMensal: meta.rendaMensalAlvo,
  }) : null;
  const progresso = meta ? Math.min(1, rendaAtual / meta.rendaMensalAlvo) : 0;

  const aderencia = meta ? calcularAderencia({
    patrimonio: resumo.valorAtual,
    aporteMensalReal: hist.mediaMensal12m,
    yieldAnual: y,
    metaMensal: meta.rendaMensalAlvo,
    prazoIdealAnos: cfg?.prazoMetaAnos ?? 10,
  }) : null;

  const alertas = await gerarAlertas(posicoes, resumo.valorAtual);

  const rebalanceamento = sugerirRebalanceamento(posicoes, hist.mediaMensal12m, alocAlvo);

  const porSegmento = new Map<string, number>();
  for (const p of posicoes) {
    const k = p.segmento ?? "Outros";
    porSegmento.set(k, (porSegmento.get(k) ?? 0) + p.valorAtual);
  }
  const aloc = Array.from(porSegmento.entries()).map(([nome, valor]) => ({ nome, valor }));
  const topPagadores = [...posicoes].sort((a, b) => b.dividendos12m - a.dividendos12m).slice(0, 5);
  const proximoMesNome = mesAtualMaisN(1);

  return (
    <div className="space-y-5 md:space-y-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Visão geral</h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-0.5">Sua carteira e o caminho até a meta.</p>
        </div>
        <FiltroPeriodo atual={periodo} />
      </header>

      {/* Oportunidades agora — destaque para os 3 mais baratos */}
      {top3Oportunidades.length > 0 && (
        <section className="card">
          <div className="flex justify-between items-baseline gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-emerald-400" />
              <h2 className="font-semibold text-sm md:text-base">Oportunidades agora</h2>
            </div>
            <Link href="/oportunidades" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
              Ver tudo <ChevronRight size={12} />
            </Link>
          </div>
          <p className="text-[10px] md:text-xs text-zinc-500 mb-3">
            Mais baratos em relação ao histórico de 52 semanas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {top3Oportunidades.map((o) => (
              <Link
                key={o.ticker}
                href={`/oportunidades`}
                className={cn(
                  "rounded-xl border p-3 transition active:scale-[0.98]",
                  o.scoreOportunidade >= 60
                    ? "border-emerald-500/40 bg-emerald-950/20"
                    : o.scoreOportunidade >= 35
                      ? "border-amber-500/30 bg-amber-950/10"
                      : "border-zinc-800 bg-zinc-900/40",
                )}
              >
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-semibold">{o.ticker}</span>
                  <span className={cn(
                    "text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded",
                    o.scoreOportunidade >= 60 && "bg-emerald-500/20 text-emerald-300",
                    o.scoreOportunidade >= 35 && o.scoreOportunidade < 60 && "bg-amber-500/20 text-amber-300",
                    o.scoreOportunidade < 35 && "bg-zinc-700/40 text-zinc-400",
                  )}>
                    {o.scoreOportunidade >= 60 ? "BARATO" : o.scoreOportunidade >= 35 ? "OK" : "CARO"}
                  </span>
                </div>
                <div className="text-lg font-semibold tabular-nums mt-1">{brl(o.precoAtual)}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  ↓ {pct(o.drawdown)} da máxima · faltam {brl(o.faltaInvestir)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Aporte do mês */}
      {aporteMes.metaMinima > 0 && (
        <section className={cn(
          "card border-2",
          aporteMes.progresso >= 1 ? "border-emerald-500/40 bg-emerald-950/10" :
          aporteMes.estaAdiantado ? "border-emerald-500/30" :
          aporteMes.diasRestantesNoMes < 5 ? "border-rose-500/40 bg-rose-950/10" :
          "border-amber-500/30 bg-amber-950/5",
        )}>
          <div className="flex justify-between items-baseline gap-2 flex-wrap mb-2">
            <div className="flex items-center gap-2">
              <TargetIcon size={16} className={
                aporteMes.progresso >= 1 ? "text-emerald-400" :
                aporteMes.estaAdiantado ? "text-emerald-400" :
                "text-amber-400"
              } />
              <h2 className="font-semibold text-sm md:text-base">Aporte deste mês</h2>
            </div>
            <span className={cn(
              "text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded",
              aporteMes.progresso >= 1 ? "bg-emerald-500/20 text-emerald-300" :
              aporteMes.estaAdiantado ? "bg-emerald-500/15 text-emerald-300" :
              aporteMes.diasRestantesNoMes < 5 ? "bg-rose-500/20 text-rose-300" :
              "bg-amber-500/20 text-amber-300",
            )}>
              {aporteMes.progresso >= 1 ? "✓ meta batida"
                : aporteMes.estaAdiantado ? "no ritmo"
                : "abaixo do ritmo"}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-2xl md:text-3xl font-semibold tabular-nums">
              {brl(aporteMes.investidoNoMes)}
            </span>
            <span className="text-sm md:text-base text-zinc-500 tabular-nums">
              / {brl(aporteMes.metaMinima)}
            </span>
            <span className={cn(
              "text-xs md:text-sm font-medium tabular-nums ml-2",
              aporteMes.progresso >= 1 ? "text-emerald-400" : "text-zinc-400",
            )}>
              {pct(aporteMes.progresso)}
            </span>
          </div>
          <div className="text-[11px] md:text-xs text-zinc-500 mt-1">
            {aporteMes.faltaInvestir > 0 ? (
              <>Faltam <span className="text-amber-300 font-medium">{brl(aporteMes.faltaInvestir)}</span> · {aporteMes.diasRestantesNoMes} {aporteMes.diasRestantesNoMes === 1 ? "dia" : "dias"} restantes no mês</>
            ) : (
              <>Meta deste mês batida. Mês anterior: {brl(aporteMes.investidoMesAnterior)}</>
            )}
          </div>
          <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden relative">
            <div
              className={cn(
                "h-full transition-all",
                aporteMes.progresso >= 1
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-300"
                  : aporteMes.estaAdiantado
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                    : "bg-gradient-to-r from-amber-600 to-amber-400",
              )}
              style={{ width: `${Math.min(100, aporteMes.progresso * 100)}%` }}
            />
            {/* Marca do ritmo ideal */}
            {aporteMes.metaMinima > 0 && (
              <div
                className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-zinc-300"
                style={{ left: `${Math.min(100, (aporteMes.ritmoIdeal / aporteMes.metaMinima) * 100)}%` }}
                title="ritmo ideal hoje"
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 mt-1.5">
            <span>R$ 0</span>
            <span>ritmo ideal hoje</span>
            <span>{brl(aporteMes.metaMinima)}</span>
          </div>
        </section>
      )}

      {/* Insights automáticos */}
      {insights.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {insights.slice(0, 4).map((ins) => (
            <div key={ins.id} className={cn(
              "rounded-xl border p-3 flex items-start gap-3",
              ins.tipo === "vitoria" && "border-emerald-500/30 bg-emerald-950/20",
              ins.tipo === "marco"   && "border-violet-500/30 bg-violet-950/20",
              ins.tipo === "atencao" && "border-amber-500/30 bg-amber-950/20",
              ins.tipo === "info"    && "border-zinc-700 bg-zinc-900/40",
            )}>
              {ins.tipo === "vitoria" && <Trophy size={16} className="text-emerald-400 shrink-0 mt-0.5" />}
              {ins.tipo === "marco"   && <TargetIcon size={16} className="text-violet-400 shrink-0 mt-0.5" />}
              {ins.tipo === "atencao" && <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />}
              {ins.tipo === "info"    && <Sparkles size={16} className="text-zinc-400 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <div className="font-medium text-sm">{ins.titulo}</div>
                {ins.detalhe && <div className="text-xs text-zinc-400 mt-0.5">{ins.detalhe}</div>}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Alertas inteligentes */}
      {alertas.length > 0 && (
        <section className="space-y-2">
          {alertas.slice(0, 4).map((a) => (
            <div key={a.id} className={cn(
              "rounded-xl border p-3 flex items-start gap-3",
              a.nivel === "atenção" && "border-rose-500/40 bg-rose-950/20",
              a.nivel === "alerta"  && "border-amber-500/40 bg-amber-950/20",
              a.nivel === "info"    && "border-sky-500/40 bg-sky-950/20",
            )}>
              {a.nivel === "atenção" || a.nivel === "alerta"
                ? <AlertTriangle size={16} className={a.nivel === "atenção" ? "text-rose-400 shrink-0 mt-0.5" : "text-amber-400 shrink-0 mt-0.5"} />
                : <Info size={16} className="text-sky-400 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <div className="font-medium text-sm">{a.titulo}</div>
                <div className="text-xs text-zinc-400 mt-0.5">{a.descricao}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Hero patrimônio */}
      <section className="card">
        <div className="kpi-label">Patrimônio total</div>
        <div className="flex items-baseline gap-2 mt-1 flex-wrap">
          <div className="text-3xl md:text-4xl font-semibold tracking-tight tabular-nums">{brl(resumo.valorAtual)}</div>
          <div className={cn("text-sm font-medium tabular-nums", variacao >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {variacao >= 0 ? "+" : ""}{pct(variacao)}
          </div>
        </div>
        <div className="text-[11px] md:text-xs text-zinc-500 mt-1">
          Investido {brl(resumo.investido)} · {ganhoCapital >= 0 ? "+" : ""}{brl(ganhoCapital)}
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <KpiCompact label="Recebido no mês"      value={brl(divMes)}                  accent="emerald" />
        <KpiCompact label="Previsto próximo mês" value={brl(previsao.total)}          hint={proximoMesNome} accent="emerald" />
        <KpiCompact label="Média mensal 12m"     value={brl(resumo.mediaMensal)}      hint={`YoC ${pct(resumo.yieldOnCost)}`} />
        <KpiCompact label="Recebido 12m"          value={brl(resumo.dividendos12m)}    hint={`Aportes ${brl(hist.totalUltimos12m)}`} />
      </div>

      {/* Meta + aderência */}
      {meta && (
        <section className="card">
          <div className="flex justify-between items-baseline mb-2 gap-2 flex-wrap">
            <div className="kpi-label">Progresso da meta</div>
            {aderencia && (
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded",
                aderencia.status === "adiantado" && "bg-emerald-500/15 text-emerald-300",
                aderencia.status === "no ritmo"  && "bg-zinc-700/40 text-zinc-300",
                aderencia.status === "atrasado"  && "bg-amber-500/15 text-amber-300",
              )}>
                {aderencia.status}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-2xl md:text-3xl font-semibold tabular-nums">{brl(rendaAtual)}</span>
            <span className="text-sm md:text-base text-zinc-500 tabular-nums">/ {brl(meta.rendaMensalAlvo)}</span>
          </div>
          <div className="text-[11px] md:text-xs text-zinc-500 mt-1">
            {pct(progresso)} · ETA {formatarMeses(meses ?? Infinity)}
          </div>
          <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all"
                 style={{ width: `${progresso * 100}%` }} />
          </div>
        </section>
      )}

      {/* Próximos pagamentos (top 3) */}
      {proximos.length > 0 && (
        <section className="card">
          <div className="flex justify-between items-baseline mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarClock size={16} className="text-emerald-400" />
              <h2 className="font-semibold text-sm md:text-base">Próximos pagamentos</h2>
            </div>
            <Link href="/calendario" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
              Ver calendário <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {proximos.slice(0, 3).map((p) => {
              const data = new Date(p.dataEstimada);
              const dias = p.diasAteEvento;
              const labelDia =
                dias === 0 ? "hoje" :
                dias === 1 ? "amanhã" :
                dias <= 7 ? `em ${dias} dias` :
                `em ${dias} dias`;
              const corDia = dias <= 1 ? "text-emerald-400" :
                             dias <= 7 ? "text-amber-300" : "text-zinc-500";
              return (
                <div key={p.ticker} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0 gap-3">
                  <div className="shrink-0 w-11 text-center">
                    <div className="text-[8px] uppercase text-zinc-500 leading-none">
                      {["dom","seg","ter","qua","qui","sex","sáb"][data.getDay()]}
                    </div>
                    <div className="text-xl font-bold tabular-nums leading-tight mt-0.5">
                      {data.getDate()}
                    </div>
                    <div className="text-[8px] uppercase text-zinc-500 leading-none">
                      {["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][data.getMonth()]}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{p.ticker}</span>
                      <span className={cn("text-[10px] uppercase font-medium", corDia)}>{labelDia}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {p.cotas} cotas · {p.fonte === "historico-proprio" ? "seu histórico" : "mercado"}
                    </div>
                  </div>
                  <div className="text-right text-emerald-400 font-semibold tabular-nums text-sm">
                    {brl(p.valorEstimado)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Estatísticas */}
      {mesesInvestindo > 0 && (
        <section className="card">
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} className="text-violet-400" />
            <h2 className="font-semibold text-sm md:text-base">Estatísticas da jornada</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox
              icon={<CalendarIcon size={14} />}
              label="Meses investindo"
              valor={mesesInvestindo.toString()}
              hint={mesesInvestindo === 1 ? "começou agora" : `${(mesesInvestindo / 12).toFixed(1)} anos`}
            />
            <StatBox
              icon={<Activity size={14} />}
              label="Meses recebendo"
              valor={mesesRecebendo.toString()}
              hint={mesesRecebendo > 0 ? "consistência ↗" : "—"}
            />
            <StatBox
              icon={<Award size={14} />}
              label="Melhor mês"
              valor={melhorMes.total > 0 ? brl(melhorMes.total) : "—"}
              hint={melhorMes.mes || ""}
              accent="emerald"
            />
            <StatBox
              icon={<TargetIcon size={14} />}
              label="Total acumulado"
              valor={brl(serie.reduce((s, x) => s + x.total, 0) + divMes)}
              hint={`em ${mesesRecebendo} meses`}
              accent="emerald"
            />
          </div>
        </section>
      )}

      {/* Patrimônio histórico (legado — versão simples) */}
      {patrSerie.length > 0 && (
        <section className="card">
          <h2 className="font-semibold text-sm md:text-base mb-1">Patrimônio recente</h2>
          <p className="text-[11px] md:text-xs text-zinc-500 mb-3">Mês a mês — últimos 12 meses</p>
          <PatrimonioChart data={patrSerie} />
        </section>
      )}

      {/* ===== Nova seção: Evolução & Performance ===== */}
      <EvolucaoPerformance
        renda={rendaAcum}
        performersAtual={perfAtual}
        performersAnterior={perfAnterior}
        evolucao={evolucao}
        evolucaoMaxMeses={evolucao.serie.length}
      />
      {/* ============================================ */}

      {/* Previsão */}
      {previsao.itens.length > 0 && (
        <section className="card">
          <div className="flex justify-between items-baseline mb-3 gap-2 flex-wrap">
            <div>
              <h2 className="font-semibold text-sm md:text-base">Próximos proventos</h2>
              <p className="text-[10px] md:text-xs text-zinc-500 mt-0.5">{proximoMesNome}</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] md:text-xs uppercase tracking-wider text-zinc-500">Total</div>
              <div className="text-base md:text-xl font-semibold text-emerald-400 tabular-nums">{brl(previsao.total)}</div>
            </div>
          </div>
          <div className="space-y-2">
            {previsao.itens.map((i) => (
              <div key={i.ticker} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{i.ticker}</div>
                  <div className="text-[10px] text-zinc-500">
                    {i.metodo === "regressao" ? "regressão" : i.metodo === "media" ? "média 3m" : "último"}
                    <span className={cn(
                      "ml-1",
                      i.tendencia === "crescente" && "text-emerald-400",
                      i.tendencia === "decrescente" && "text-rose-400",
                    )}>
                      {i.tendencia === "crescente" ? "↗" : i.tendencia === "decrescente" ? "↘" : "→"}
                    </span>
                  </div>
                </div>
                <div className="font-semibold text-emerald-400 tabular-nums text-sm whitespace-nowrap">
                  {i.previsao > 0 ? brl(i.previsao) : "—"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rebalanceamento */}
      {rebalanceamento.length > 0 && (
        <section className="card">
          <h2 className="font-semibold text-sm md:text-base mb-1 flex items-center gap-2">
            <TrendingUp size={14} /> Sugestão de aporte
          </h2>
          <p className="text-[11px] md:text-xs text-zinc-500 mb-3">
            Considerando seu aporte médio de {brl(hist.mediaMensal12m)}/mês
          </p>
          <div className="space-y-2">
            {rebalanceamento.filter((s) => s.aporteSugerido > 1).map((s) => (
              <div key={s.segmento} className="flex justify-between items-center py-1.5 border-b border-zinc-800 last:border-0">
                <div>
                  <div className="text-sm font-medium">{s.segmento}</div>
                  <div className="text-[10px] text-zinc-500">{pct(s.pesoAtual)} → alvo {pct(s.pesoAlvo)}</div>
                </div>
                <span className="text-sm font-medium tabular-nums text-emerald-400">{brl(s.aporteSugerido)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gráfico dividendos */}
      <section className="card">
        <div className="flex justify-between items-baseline mb-3 gap-2 flex-wrap">
          <h2 className="font-semibold text-sm md:text-base">Dividendos 12m</h2>
          <span className="text-[10px] md:text-xs text-zinc-500">Total {brl(resumo.dividendos12m)}</span>
        </div>
        <DividendosChart data={serie} />
      </section>

      {aloc.length > 0 && (
        <section className="card">
          <h2 className="font-semibold text-sm md:text-base mb-1">Alocação por segmento</h2>
          <AlocacaoChart data={aloc} />
          <div className="mt-3 space-y-1">
            {aloc.map((a) => (
              <div key={a.nome} className="flex justify-between text-[11px] md:text-xs text-zinc-400">
                <span className="truncate">{a.nome}</span>
                <span className="tabular-nums whitespace-nowrap ml-2">
                  {brl(a.valor)} · {pct(a.valor / (resumo.valorAtual || 1))}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {topPagadores.length > 0 && (
        <section className="card">
          <h2 className="font-semibold text-sm md:text-base mb-3">Top pagadores 12m</h2>
          <div className="space-y-2">
            {topPagadores.map((p) => (
              <div key={p.ativoId} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
                <div>
                  <div className="font-medium text-sm">{p.ticker}</div>
                  <div className="text-[10px] text-zinc-500">
                    {pct(p.valorAtual / (resumo.valorAtual || 1))} da carteira · YoC {pct(p.yieldOnCost)}
                  </div>
                </div>
                <div className="text-emerald-400 font-medium text-sm tabular-nums whitespace-nowrap">
                  {brl(p.dividendos12m)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCompact({ label, value, hint, accent }: {
  label: string; value: string; hint?: string; accent?: "emerald" | "rose";
}) {
  return (
    <div className="card">
      <div className="text-[10px] md:text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={cn(
        "text-lg md:text-2xl font-semibold tabular-nums tracking-tight mt-1 truncate",
        accent === "emerald" && "text-emerald-400",
        accent === "rose" && "text-rose-400",
      )}>{value}</div>
      {hint && <div className="text-[10px] md:text-xs text-zinc-500 mt-1 truncate">{hint}</div>}
    </div>
  );
}

function mesAtualMaisN(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  const mes = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return mes.charAt(0).toUpperCase() + mes.slice(1);
}

function StatBox({ icon, label, valor, hint, accent }: {
  icon: React.ReactNode; label: string; valor: string;
  hint?: string; accent?: "emerald";
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn(
        "text-lg md:text-xl font-semibold tabular-nums mt-1 truncate",
        accent === "emerald" && "text-emerald-400",
      )}>{valor}</div>
      {hint && <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{hint}</div>}
    </div>
  );
}
