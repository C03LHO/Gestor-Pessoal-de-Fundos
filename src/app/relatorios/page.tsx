import { brl } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { DarfClient } from "./DarfClient";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual, anoAtual - 1, anoAtual - 2];
  const carteiraId = await getCarteiraAtivaId();

  const totalAno = await prisma.lancamento.aggregate({
    _sum: { valorTotal: true },
    where: {
      tipo: "DIVIDENDO",
      carteiraId,
      data: { gte: new Date(anoAtual, 0, 1), lt: new Date(anoAtual + 1, 0, 1) },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
          Exporte dados para Imposto de Renda e auditoria pessoal.
        </p>
      </header>

      <section className="card">
        <h2 className="font-semibold mb-1">Relatório de IR (imprimível)</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Página única com bens e direitos, proventos isentos e ganho de capital — imprima ou salve em PDF.
        </p>
        <div className="flex flex-wrap gap-2">
          {anos.map((a) => (
            <a key={a} href={`/relatorios/ir?ano=${a}`} className="btn-ghost border border-zinc-800">
              Abrir {a}
            </a>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-1">Proventos recebidos por ano</h2>
        <p className="text-xs text-zinc-500 mb-4">CSV com todos os dividendos do ano, pronto para o IR.</p>
        <div className="text-xs text-zinc-400 mb-3">
          {anoAtual}: <span className="text-emerald-400 font-medium">{brl(totalAno._sum.valorTotal ?? 0)}</span> recebidos
        </div>
        <div className="flex flex-wrap gap-2">
          {anos.map((a) => (
            <a key={a} href={`/api/relatorios/proventos?ano=${a}`}
               className="btn-ghost border border-zinc-800">
              Baixar {a}
            </a>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-1">Bens e Direitos (Declaração)</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Posição em 31/12 com quantidade, preço médio e valor declarado por ativo.
        </p>
        <div className="flex flex-wrap gap-2">
          {anos.map((a) => (
            <a key={a} href={`/api/relatorios/declaracao?ano=${a}`}
               className="btn-ghost border border-zinc-800">
              Baixar {a}
            </a>
          ))}
        </div>
      </section>

      <DarfClient />
    </div>
  );
}
