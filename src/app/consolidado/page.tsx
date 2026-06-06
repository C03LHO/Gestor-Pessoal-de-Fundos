import { prisma } from "@/lib/prisma";
import { calcularPosicoes, resumoCarteira } from "@/lib/domain/posicao";
import { recalcularCripto, resumoCarteiraCripto } from "@/lib/cripto/carteira";
import { getPrecos } from "@/lib/cripto/coingecko";
import { somar } from "@/lib/money";
import { brl, pct } from "@/lib/format";
import { AlocacaoChart } from "@/components/charts/AlocacaoChart";

export const dynamic = "force-dynamic";

type LinhaCarteira = {
  id: string;
  nome: string;
  cor: string | null;
  tipo: "FII" | "CRIPTO";
  valor: number;
  investido: number;
  dividendos12m: number;
};

export default async function ConsolidadoPage() {
  const [carteiras, precos, cryptoTxs] = await Promise.all([
    prisma.carteira.findMany({ orderBy: { criadaEm: "asc" } }),
    getPrecos(),
    prisma.cryptoTransaction.findMany({ orderBy: { data: "asc" } }),
  ]);

  // Agrega cada carteira pela engine correta (FII ou cripto).
  const linhas: LinhaCarteira[] = await Promise.all(
    carteiras.map(async (c): Promise<LinhaCarteira> => {
      if (c.tipo === "CRIPTO") {
        const txs = cryptoTxs.filter((t) => t.carteiraId === c.id);
        const pos = recalcularCripto(txs, precos);
        const r = resumoCarteiraCripto(pos, precos);
        return { id: c.id, nome: c.nome, cor: c.cor, tipo: "CRIPTO", valor: r.valorTotal, investido: r.custoTotal, dividendos12m: 0 };
      }
      const pos = await calcularPosicoes(c.id);
      const r = resumoCarteira(pos);
      return { id: c.id, nome: c.nome, cor: c.cor, tipo: "FII", valor: r.valorAtual, investido: r.investido, dividendos12m: r.dividendos12m };
    }),
  );

  const valorFii = somar(...linhas.filter((l) => l.tipo === "FII").map((l) => l.valor));
  const valorCripto = somar(...linhas.filter((l) => l.tipo === "CRIPTO").map((l) => l.valor));
  const patrimonioTotal = somar(valorFii, valorCripto);
  const investidoTotal = somar(...linhas.map((l) => l.investido));
  const dividendos12m = somar(...linhas.map((l) => l.dividendos12m));
  const plTotal = patrimonioTotal - investidoTotal;
  const plPct = investidoTotal > 0 ? plTotal / investidoTotal : 0;

  const distribuicao = [
    { nome: "FII", valor: valorFii },
    { nome: "Cripto", valor: valorCripto },
  ].filter((d) => d.valor > 0);

  const linhasOrdenadas = [...linhas].sort((a, b) => b.valor - a.valor);

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Patrimônio consolidado</h1>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
          FII + Cripto somados, todas as carteiras.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Patrimônio total" valor={brl(patrimonioTotal)} />
        <Kpi label="Total investido" valor={brl(investidoTotal)} />
        <Kpi
          label="P/L não realizado"
          valor={`${plTotal >= 0 ? "+" : ""}${brl(plTotal)}`}
          sub={`${plPct >= 0 ? "+" : ""}${pct(plPct)}`}
          cor={plTotal >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
        <Kpi label="Renda passiva 12m" valor={brl(dividendos12m)} sub={`~${brl(dividendos12m / 12)}/mês`} cor="text-emerald-400" />
      </div>

      {patrimonioTotal <= 0 ? (
        <section className="card">
          <p className="text-sm text-zinc-500">Sem posições para consolidar ainda.</p>
        </section>
      ) : (
        <>
          <section className="card">
            <h2 className="font-semibold text-sm md:text-base mb-3">Distribuição por classe</h2>
            <div className="grid md:grid-cols-2 gap-4 items-center">
              <AlocacaoChart data={distribuicao} />
              <div className="space-y-3">
                <ClasseBar nome="FII" valor={valorFii} total={patrimonioTotal} cor="#10b981" />
                <ClasseBar nome="Cripto" valor={valorCripto} total={patrimonioTotal} cor="#f59e0b" />
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="font-semibold text-sm md:text-base mb-3">Por carteira</h2>
            <div className="space-y-3">
              {linhasOrdenadas.map((l) => {
                const peso = patrimonioTotal > 0 ? l.valor / patrimonioTotal : 0;
                const pl = l.valor - l.investido;
                return (
                  <div key={l.id} className="space-y-1">
                    <div className="flex justify-between items-baseline gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.cor ?? "#10b981" }} />
                        <span className="font-medium text-sm truncate">{l.nome}</span>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 border border-zinc-800 rounded px-1 py-[1px]">
                          {l.tipo}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold tabular-nums">{brl(l.valor)}</div>
                        <div className={`text-[10px] tabular-nums ${pl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {pl >= 0 ? "+" : ""}{brl(pl)}
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(peso * 100).toFixed(1)}%`, background: l.cor ?? "#10b981" }} />
                    </div>
                    <div className="text-[10px] text-zinc-500">{pct(peso)} do patrimônio</div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, valor, sub, cor }: { label: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div className="card">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-lg md:text-2xl font-semibold tabular-nums mt-1 truncate ${cor ?? ""}`}>{valor}</div>
      {sub && <div className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">{sub}</div>}
    </div>
  );
}

function ClasseBar({ nome, valor, total, cor }: { nome: string; valor: number; total: number; cor: string }) {
  const peso = total > 0 ? valor / total : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: cor }} />
          {nome}
        </span>
        <span className="tabular-nums">{brl(valor)} · {pct(peso)}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(peso * 100).toFixed(1)}%`, background: cor }} />
      </div>
    </div>
  );
}
