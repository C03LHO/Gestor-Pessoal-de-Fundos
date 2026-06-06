import { prisma } from "@/lib/prisma";
import { calcularPosicoes, resumoCarteira } from "@/lib/domain/posicao";
import { previsaoProximoMes } from "@/lib/domain/previsao";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { brl, dataBR, pct } from "@/lib/format";
import { rentabilidadeIfix, rentabilidadeCdi, rentabilidadeIbov, rentabilidadeBtc } from "@/lib/mercado/benchmark";
import { patrimonioHistorico } from "@/lib/domain/patrimonio-historico";
import { calcularMetricas } from "@/lib/domain/metricas";
import { somarLista } from "@/lib/money";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export default async function ResumoPage() {
  const carteiraId = await getCarteiraAtivaId();
  const hoje = new Date();
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  const [divs, compras, posicoes, previsao, ifix, cdi, ibov, btc, patrSerie] = await Promise.all([
    prisma.lancamento.findMany({
      where: { tipo: "DIVIDENDO", data: { gte: seteDiasAtras }, carteiraId },
      include: { ativo: true },
      orderBy: { data: "desc" },
    }),
    prisma.lancamento.findMany({
      where: { tipo: { in: ["COMPRA", "REINVESTIMENTO"] }, data: { gte: seteDiasAtras }, carteiraId },
      include: { ativo: true },
      orderBy: { data: "desc" },
    }),
    calcularPosicoes(carteiraId),
    previsaoProximoMes(carteiraId),
    rentabilidadeIfix(12),
    rentabilidadeCdi(12),
    rentabilidadeIbov(12),
    rentabilidadeBtc(12),
    patrimonioHistorico(12, carteiraId),
  ]);

  const resumoP = resumoCarteira(posicoes);
  const totalDiv = somarLista(divs, (d) => d.valorTotal);
  const totalAportado = somarLista(compras, (c) => c.valorTotal);

  const rentCarteira12m = resumoP.investido > 0
    ? (resumoP.valorAtual + resumoP.dividendos12m) / resumoP.investido - 1
    : 0;

  // Métricas de risco/retorno (12m), com CDI como taxa livre de risco.
  const metricas = calcularMetricas(
    patrSerie.map((p) => ({ valor: p.valor, investido: p.investido })),
    cdi,
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Resumo da semana</h1>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
          {dataBR(seteDiasAtras)} → {dataBR(hoje)}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Dividendos da semana"  valor={brl(totalDiv)}      accent="emerald" hint={`${divs.length} eventos`} />
        <Kpi label="Aportado na semana"   valor={brl(totalAportado)} hint={`${compras.length} compras`} />
      </div>

      <section className="card">
        <h2 className="font-semibold text-sm md:text-base mb-3">Sua carteira vs benchmarks (12m)</h2>
        <div className="space-y-2">
          <BenchRow nome="Minha carteira" valor={rentCarteira12m} destaque />
          <BenchRow nome="IFIX"           valor={ifix} />
          <BenchRow nome="CDI"            valor={cdi} />
          <BenchRow nome="Ibovespa"       valor={ibov} />
          <BenchRow nome="Bitcoin"        valor={btc} />
        </div>
        {(ifix == null || cdi == null || ibov == null || btc == null) && (
          <p className="text-[10px] text-zinc-500 mt-3">
            Algum benchmark indisponível agora. Tente recarregar mais tarde.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="font-semibold text-sm md:text-base mb-3">Métricas de risco/retorno (12m)</h2>
        {metricas.meses < 2 ? (
          <p className="text-xs text-zinc-500">Histórico insuficiente para calcular métricas.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Metrica
                label="CAGR"
                valor={`${metricas.cagr >= 0 ? "+" : ""}${pct(metricas.cagr)}`}
                cor={metricas.cagr >= 0 ? "text-emerald-400" : "text-rose-400"}
                hint="retorno anualizado"
              />
              <Metrica
                label="Máx. queda"
                valor={`-${pct(metricas.maxDrawdown)}`}
                cor="text-rose-400"
                hint="pico → vale"
              />
              <Metrica
                label="Sharpe"
                valor={metricas.sharpe.toFixed(2)}
                cor={metricas.sharpe >= 1 ? "text-emerald-400" : metricas.sharpe >= 0 ? "text-zinc-200" : "text-rose-400"}
                hint="vs CDI, anualiz."
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-3">
              Retorno ajustado por aportes (Dietz). Drawdown sobre o índice acumulado de {metricas.meses} meses.
            </p>
          </>
        )}
      </section>

      <section className="card">
        <h2 className="font-semibold text-sm md:text-base mb-3">Próximo mês</h2>
        <div className="text-xl md:text-2xl font-semibold tabular-nums text-emerald-400 mb-3">
          {brl(previsao.total)}
        </div>
        <div className="space-y-2">
          {previsao.itens.map((i) => (
            <div key={i.ticker} className="flex justify-between text-sm">
              <span>{i.ticker}</span>
              <span className="tabular-nums">{brl(i.previsao)}</span>
            </div>
          ))}
        </div>
      </section>

      {divs.length > 0 && (
        <section className="card">
          <h2 className="font-semibold text-sm md:text-base mb-3">Recebimentos desta semana</h2>
          <div className="space-y-2">
            {divs.map((d) => (
              <div key={d.id} className="flex justify-between py-2 border-b border-zinc-800 last:border-0">
                <div>
                  <div className="font-medium text-sm">{d.ativo?.ticker}</div>
                  <div className="text-[10px] text-zinc-500">{dataBR(d.data)}</div>
                </div>
                <span className="text-emerald-400 tabular-nums font-medium text-sm">{brl(d.valorTotal)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {compras.length > 0 && (
        <section className="card">
          <h2 className="font-semibold text-sm md:text-base mb-3">Compras desta semana</h2>
          <div className="space-y-2">
            {compras.map((c) => (
              <div key={c.id} className="flex justify-between py-2 border-b border-zinc-800 last:border-0">
                <div>
                  <div className="font-medium text-sm">{c.ativo?.ticker}</div>
                  <div className="text-[10px] text-zinc-500">
                    {dataBR(c.data)} · {c.quantidade} × {c.precoUnit != null ? brl(c.precoUnit) : "—"}
                  </div>
                </div>
                <span className="tabular-nums font-medium text-sm">{brl(c.valorTotal)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, valor, accent, hint }: {
  label: string; valor: string; accent?: "emerald"; hint?: string;
}) {
  return (
    <div className="card">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={cn("text-xl font-semibold tabular-nums mt-1 truncate", accent === "emerald" && "text-emerald-400")}>
        {valor}
      </div>
      {hint && <div className="text-[10px] text-zinc-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function Metrica({ label, valor, cor, hint }: { label: string; valor: string; cor: string; hint: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={cn("text-lg md:text-xl font-semibold tabular-nums mt-1", cor)}>{valor}</div>
      <div className="text-[10px] text-zinc-500 mt-0.5">{hint}</div>
    </div>
  );
}

function BenchRow({ nome, valor, destaque }: { nome: string; valor: number | null; destaque?: boolean }) {
  const display = valor == null ? "—" : `${valor >= 0 ? "+" : ""}${pct(valor)}`;
  const cor = valor == null ? "text-zinc-500" :
              valor >= 0    ? "text-emerald-400" : "text-rose-400";
  return (
    <div className={cn("flex justify-between items-baseline", destaque && "pb-2 border-b border-zinc-800")}>
      <span className={destaque ? "font-medium" : "text-zinc-400 text-sm"}>{nome}</span>
      <span className={cn("font-semibold tabular-nums", cor, destaque && "text-lg")}>{display}</span>
    </div>
  );
}
