import { calcularOportunidades } from "@/lib/domain/watchlist";
import { calcularPosicoes, resumoCarteira } from "@/lib/domain/posicao";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { brl, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Check, Circle, ArrowRight, Shield, TrendingUp, Globe, Coins, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlanoPage() {
  const carteiraId = await getCarteiraAtivaId();
  const [posicoes, oportunidades] = await Promise.all([
    calcularPosicoes(carteiraId),
    calcularOportunidades(carteiraId).catch(() => []),
  ]);
  const resumo = resumoCarteira(posicoes);

  const totalInvestidoFIIs = oportunidades.reduce((s, o) => s + o.investido, 0);
  const totalMetaFIIs = oportunidades.reduce((s, o) => s + o.metaInvestimento, 0);
  const progressoFase1 = totalMetaFIIs > 0 ? totalInvestidoFIIs / totalMetaFIIs : 0;
  const concluidos = oportunidades.filter((o) => o.investido >= o.metaInvestimento).length;

  // Renda passiva estimada com R$ 100k em FIIs com DY médio 9.6%
  const dyMedio = 0.096;
  const rendaProjetada100k = (totalMetaFIIs * dyMedio) / 12;

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Plano de investimentos</h1>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
          O caminho completo, do zero até a independência financeira.
        </p>
      </header>

      <section className="card">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Onde você está</span>
          <span className="text-xs text-emerald-400 font-medium">
            Fase 1 · {concluidos}/10 FIIs concluídos
          </span>
        </div>
        <div className="text-2xl md:text-3xl font-semibold tabular-nums">
          {brl(totalInvestidoFIIs)}{" "}
          <span className="text-zinc-500 text-base">/ {brl(totalMetaFIIs)}</span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-1">
          {pct(progressoFase1)} da Fase 1 · faltam {brl(Math.max(0, totalMetaFIIs - totalInvestidoFIIs))}
        </div>
        <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300"
               style={{ width: `${Math.min(100, progressoFase1 * 100)}%` }} />
        </div>
      </section>

      {/* Fase 1 */}
      <Fase
        numero={1}
        titulo="Construir as 10 posições de FII"
        valorAlvo={brl(totalMetaFIIs)}
        prazo="6-24 meses"
        concluida={progressoFase1 >= 1}
        atual={progressoFase1 < 1}
        icon={TrendingUp}
        cor="emerald"
        objetivo={`Atingir ${brl(10000)} em cada um dos 10 FIIs da watchlist. Renda esperada: ~${brl(rendaProjetada100k)}/mês.`}
        passos={[
          { texto: "Compre os FIIs que estão mais BARATOS conforme a página Oportunidades", feito: concluidos > 0 },
          { texto: "Aporte mensal recorrente até completar R$ 10k em cada", feito: false },
          { texto: "Reinvista 100% dos dividendos enquanto monta as posições", feito: false },
          { texto: "Não troque de FII no meio do caminho (custo de transação)", feito: false },
        ]}
      />

      {/* Fase 2 */}
      <Fase
        numero={2}
        titulo="Reserva de emergência sólida"
        valorAlvo={brl(50000)}
        prazo="3-6 meses após Fase 1"
        concluida={false}
        atual={progressoFase1 >= 1}
        icon={Shield}
        cor="sky"
        objetivo="6 meses do seu custo de vida em ativos de liquidez diária. Não mexer. Só para emergência real."
        passos={[
          { texto: "Tesouro Selic 2029 ou 2031 (40-50% da reserva)", feito: false },
          { texto: "CDB liquidez diária 100%+ CDI em banco grande (40%)", feito: false },
          { texto: "Caixa imediato em conta remunerada (10%)", feito: false },
        ]}
        instrumentos={[
          { nome: "Tesouro Selic", desc: "Liquidez D+1, IR regressivo, sem risco de crédito" },
          { nome: "CDB liquidez diária", desc: "Procure 100-110% do CDI, FGC até R$ 250k por instituição" },
          { nome: "LCI/LCA liquidez diária", desc: "Mesma segurança do CDB, isento de IR" },
        ]}
      />

      {/* Fase 3 */}
      <Fase
        numero={3}
        titulo="Renda fixa indexada (crescimento real)"
        valorAlvo={brl(100000)}
        prazo="12-24 meses após Fase 2"
        concluida={false}
        atual={false}
        icon={Coins}
        cor="violet"
        objetivo="Proteger poder de compra (IPCA+) e travar taxas reais altas. Construir um colchão pós-aposentadoria."
        passos={[
          { texto: "Tesouro IPCA+ 2035 (50%) — capitalização de longo prazo", feito: false },
          { texto: "Tesouro IPCA+ 2045 (30%) — vencimento longo, juros compostos", feito: false },
          { texto: "LCI/LCA pré-fixadas > IPCA + 6% (20%) — sem IR", feito: false },
        ]}
        instrumentos={[
          { nome: "Tesouro IPCA+ 2035", desc: "Garante taxa real (acima da inflação) por 10+ anos" },
          { nome: "Tesouro IPCA+ 2045", desc: "Mesmo conceito, prazo maior, marcação a mercado oscila" },
          { nome: "LCI/LCA pré", desc: "Bancos médios, isento IR, FGC R$ 250k por instituição" },
        ]}
      />

      {/* Fase 4 */}
      <Fase
        numero={4}
        titulo="Diversificação internacional"
        valorAlvo="10-20% do patrimônio"
        prazo="Quando passar de R$ 250k total"
        concluida={false}
        atual={false}
        icon={Globe}
        cor="cyan"
        objetivo="Reduzir risco-Brasil. Exposição a dólar e ao mercado americano de longo prazo."
        passos={[
          { texto: "IVVB11 (S&P 500 hedgeado em BRL) — começo simples", feito: false },
          { texto: "Conta nos EUA (Avenue, Inter, Nomad) para acesso direto a ETFs", feito: false },
          { texto: "VOO ou IVV (S&P 500) — base do portfólio internacional", feito: false },
          { texto: "SCHD (dividendos US qualidade) ou O/VICI (REITs dividendos)", feito: false },
        ]}
        instrumentos={[
          { nome: "IVVB11", desc: "ETF brasileiro do S&P 500, simples, com hedge cambial parcial" },
          { nome: "VOO / IVV", desc: "S&P 500 direto, taxa <0.05%, comprado em USD" },
          { nome: "SCHD", desc: "ETF de dividendos qualidade, ~3.5% DY em USD" },
        ]}
      />

      {/* Fase 5 */}
      <Fase
        numero={5}
        titulo="Ações pagadoras de dividendos"
        valorAlvo="15-20% do patrimônio"
        prazo="Junto com Fase 4"
        concluida={false}
        atual={false}
        icon={Activity}
        cor="amber"
        objetivo="Empresas perenes que distribuem lucro. Eleva o DY total da carteira e diversifica vs FII."
        passos={[
          { texto: "Foco em setores defensivos: energia, saneamento, seguros, bancos sólidos", feito: false },
          { texto: "Máx 5% em uma única ação", feito: false },
          { texto: "JCP (juros sobre capital próprio) reinvestir sempre", feito: false },
        ]}
        instrumentos={[
          { nome: "TAEE11", desc: "Transmissão de energia (Taesa), DY histórico ~9%, baixa volatilidade" },
          { nome: "BBSE3", desc: "BB Seguridade, payout altíssimo, recorrência" },
          { nome: "ITSA4", desc: "Itaúsa (holding Itaú), diversificada, JCP recorrente" },
          { nome: "TRPL4", desc: "Transmissão Paulista, setor regulado, RBSE histórico" },
          { nome: "BBAS3", desc: "Banco do Brasil, DY ~10%, valuation conservador" },
        ]}
      />

      <section className="card">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Activity size={16} className="text-emerald-400" />
          Quando dizer "cheguei lá"
        </h2>
        <div className="space-y-2 text-sm">
          <Linha label="Renda passiva ≥ custo de vida" desc="Independência financeira plena" />
          <Linha label="Renda passiva ≥ 50% do custo" desc="Semi-aposentadoria, opção de trabalhar menos" />
          <Linha label="Patrimônio total ≥ 25x gasto anual" desc="Regra dos 4% — sustentável indefinidamente" />
        </div>
        <p className="text-[11px] text-zinc-500 mt-4">
          Nada aqui é recomendação personalizada. Avalie sua tolerância a risco, prazo, situação fiscal.
        </p>
      </section>
    </div>
  );
}

function Fase({
  numero, titulo, valorAlvo, prazo, concluida, atual, icon: Icon, cor,
  objetivo, passos, instrumentos,
}: {
  numero: number;
  titulo: string;
  valorAlvo: string;
  prazo: string;
  concluida: boolean;
  atual: boolean;
  icon: any;
  cor: "emerald" | "sky" | "violet" | "cyan" | "amber";
  objetivo: string;
  passos: { texto: string; feito: boolean }[];
  instrumentos?: { nome: string; desc: string }[];
}) {
  const cores = {
    emerald: "border-emerald-500/30 bg-emerald-950/10 text-emerald-300",
    sky:     "border-sky-500/30 bg-sky-950/10 text-sky-300",
    violet:  "border-violet-500/30 bg-violet-950/10 text-violet-300",
    cyan:    "border-cyan-500/30 bg-cyan-950/10 text-cyan-300",
    amber:   "border-amber-500/30 bg-amber-950/10 text-amber-300",
  };

  return (
    <section className={cn(
      "card",
      atual && "border-emerald-500/40 ring-1 ring-emerald-500/20",
    )}>
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("rounded-xl border p-2", cores[cor])}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Fase {numero}</span>
            {concluida && <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">✓ Concluída</span>}
            {atual && !concluida && <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Atual</span>}
          </div>
          <h2 className="font-semibold text-base mt-0.5">{titulo}</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">{valorAlvo} · {prazo}</p>
        </div>
      </div>

      <p className="text-sm text-zinc-300 mb-3">{objetivo}</p>

      <div className="space-y-1.5 mb-3">
        {passos.map((p, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            {p.feito
              ? <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              : <Circle size={14} className="text-zinc-600 shrink-0 mt-0.5" />}
            <span className={p.feito ? "text-zinc-400 line-through" : "text-zinc-300"}>{p.texto}</span>
          </div>
        ))}
      </div>

      {instrumentos && (
        <div className="border-t border-zinc-800 pt-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Instrumentos sugeridos</div>
          {instrumentos.map((i) => (
            <div key={i.nome} className="flex justify-between items-baseline gap-3">
              <span className="font-medium text-sm whitespace-nowrap">{i.nome}</span>
              <span className="text-[11px] text-zinc-500 text-right">{i.desc}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Linha({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <ArrowRight size={12} className="text-zinc-500 shrink-0" />
      <div>
        <span className="font-medium">{label}</span>
        <span className="text-zinc-500 text-xs ml-2">{desc}</span>
      </div>
    </div>
  );
}
