import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { recalcularAtivo, eventosVenda, type LancamentoInput } from "@/lib/domain/portfolio";
import { somarLista } from "@/lib/money";
import { brl } from "@/lib/format";
import { ImprimirBtn } from "./ImprimirBtn";

export const dynamic = "force-dynamic";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function RelatorioIrPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano ?? new Date().getFullYear());
  const ini = new Date(ano, 0, 1);
  const fim = new Date(ano + 1, 0, 1);
  const carteiraId = await getCarteiraAtivaId();

  // Uma busca: ativos com seus lançamentos da carteira até o fim do ano.
  const ativos = await prisma.ativo.findMany({
    include: {
      lancamentos: { where: { carteiraId, data: { lt: fim } }, orderBy: { data: "asc" } },
    },
  });

  // (1) Bens e Direitos — posição em 31/12 (custo declarado), via engine.
  const bens = ativos
    .filter((a) => a.lancamentos.length > 0)
    .map((a) => {
      const e = recalcularAtivo(
        { id: a.id, ticker: a.ticker, nome: a.nome, segmento: a.segmento, precoAtual: a.precoAtual },
        a.lancamentos as LancamentoInput[],
      );
      return { ticker: a.ticker, nome: a.nome ?? "", cotas: e.cotas, pm: e.precoMedio, valor: e.custoTotal };
    })
    .filter((b) => b.cotas > 0)
    .sort((a, b) => b.valor - a.valor);
  const totalBens = somarLista(bens, (b) => b.valor);

  // (2) Proventos isentos recebidos no ano — por ticker.
  const proventosPorTicker = ativos
    .map((a) => {
      const recebido = somarLista(
        a.lancamentos.filter((l) => l.tipo === "DIVIDENDO" && l.data >= ini && l.data < fim),
        (l) => l.valorTotal,
      );
      return { ticker: a.ticker, nome: a.nome ?? "", recebido };
    })
    .filter((p) => p.recebido > 0)
    .sort((a, b) => b.recebido - a.recebido);
  const totalProventos = somarLista(proventosPorTicker, (p) => p.recebido);

  // (3) Ganho de capital / DARF por mês (FII: 20%, sem isenção).
  const lucroMesCent = Array(12).fill(0);
  for (const a of ativos) {
    const eventos = eventosVenda(a.lancamentos as LancamentoInput[]);
    for (const e of eventos) {
      if (e.data < ini || e.data >= fim) continue;
      lucroMesCent[e.data.getMonth()] += Math.round(e.lucro * 100);
    }
  }
  const linhasGanho = lucroMesCent
    .map((cent, i) => {
      const lucro = cent / 100;
      const darf = lucro > 0 ? Math.round(lucro * 0.2 * 100) / 100 : 0;
      return { mes: MESES[i], lucro, darf };
    })
    .filter((l) => l.lucro !== 0);
  const totalLucro = somarLista(linhasGanho, (l) => l.lucro);
  const totalDarf = somarLista(linhasGanho, (l) => l.darf);

  const anos = [ano, ano - 1, ano - 2, ano + 1].filter((x) => x <= new Date().getFullYear()).sort((a, b) => b - a);

  return (
    <div className="space-y-5 md:space-y-6 print:space-y-4">
      <header className="flex justify-between items-end gap-3 flex-wrap print:block">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Relatório de IR — {ano}</h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
            Posição em 31/12, proventos isentos e ganho de capital. Confira sempre com seu contador.
          </p>
        </div>
        <div className="flex gap-2 items-center print:hidden">
          {anos.map((a) => (
            <a
              key={a}
              href={`/relatorios/ir?ano=${a}`}
              className={`px-2.5 py-1 text-xs rounded-md border ${a === ano ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 text-zinc-400"}`}
            >
              {a}
            </a>
          ))}
          <ImprimirBtn />
        </div>
      </header>

      {/* (1) Bens e Direitos */}
      <section className="card print:border print:border-zinc-300">
        <h2 className="font-semibold mb-1">Bens e Direitos — posição em 31/12/{ano}</h2>
        <p className="text-xs text-zinc-500 mb-3">Grupo 07 (fundos) · valor declarado = custo de aquisição.</p>
        {bens.length === 0 ? (
          <p className="text-sm text-zinc-500">Sem posição em aberto no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table min-w-[480px]">
              <thead>
                <tr>
                  <th>Ticker</th><th>Nome</th>
                  <th className="text-right">Cotas</th>
                  <th className="text-right">PM</th>
                  <th className="text-right">Valor declarado</th>
                </tr>
              </thead>
              <tbody>
                {bens.map((b) => (
                  <tr key={b.ticker}>
                    <td className="font-medium">{b.ticker}</td>
                    <td className="text-zinc-400">{b.nome}</td>
                    <td className="text-right tabular-nums">{b.cotas}</td>
                    <td className="text-right tabular-nums">{brl(b.pm)}</td>
                    <td className="text-right tabular-nums">{brl(b.valor)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td colSpan={4} className="text-right">Total</td>
                  <td className="text-right tabular-nums">{brl(totalBens)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* (2) Proventos isentos */}
      <section className="card print:border print:border-zinc-300">
        <h2 className="font-semibold mb-1">Rendimentos isentos — proventos recebidos em {ano}</h2>
        <p className="text-xs text-zinc-500 mb-3">Ficha &quot;Rendimentos Isentos e Não Tributáveis&quot; · rendimentos de FII.</p>
        {proventosPorTicker.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum provento recebido no ano.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table min-w-[360px]">
              <thead>
                <tr><th>Ticker</th><th>Nome</th><th className="text-right">Recebido</th></tr>
              </thead>
              <tbody>
                {proventosPorTicker.map((p) => (
                  <tr key={p.ticker}>
                    <td className="font-medium">{p.ticker}</td>
                    <td className="text-zinc-400">{p.nome}</td>
                    <td className="text-right tabular-nums text-emerald-400">{brl(p.recebido)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td colSpan={2} className="text-right">Total</td>
                  <td className="text-right tabular-nums">{brl(totalProventos)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* (3) Ganho de capital / DARF */}
      <section className="card print:border print:border-zinc-300">
        <h2 className="font-semibold mb-1">Ganho de capital — vendas de FII em {ano}</h2>
        <p className="text-xs text-zinc-500 mb-3">FII paga 20% sobre o lucro de venda (sem isenção). DARF código 6015, mensal.</p>
        {linhasGanho.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma venda com resultado no ano.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table min-w-[360px]">
              <thead>
                <tr><th>Mês</th><th className="text-right">Lucro/Prejuízo</th><th className="text-right">DARF (20%)</th></tr>
              </thead>
              <tbody>
                {linhasGanho.map((l) => (
                  <tr key={l.mes}>
                    <td>{l.mes}</td>
                    <td className={`text-right tabular-nums ${l.lucro >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{brl(l.lucro)}</td>
                    <td className="text-right tabular-nums">{l.darf > 0 ? brl(l.darf) : "—"}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="text-right">Total</td>
                  <td className="text-right tabular-nums">{brl(totalLucro)}</td>
                  <td className="text-right tabular-nums">{brl(totalDarf)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[10px] text-zinc-500 print:text-zinc-600">
        Gerado por Fundos em {new Date().toLocaleDateString("pt-BR")}. Valores conferem com a carteira ativa.
        Este relatório é um apoio — a responsabilidade pela declaração é sua.
      </p>
    </div>
  );
}
