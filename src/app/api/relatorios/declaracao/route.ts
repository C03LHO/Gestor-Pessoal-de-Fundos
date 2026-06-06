import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { recalcularAtivo, type LancamentoInput } from "@/lib/domain/portfolio";

/**
 * Relatório "Bens e Direitos" para IR. Para cada ativo, calcula a posição
 * em 31/12/ano: quantidade × preço médio (custo declarado).
 *
 * Query: ?ano=2026 — isola pela carteira ativa e usa a engine de carteira
 * (preço médio em centavos) em vez de recalcular à mão.
 */
export async function GET(req: NextRequest) {
  const ano = Number(req.nextUrl.searchParams.get("ano") ?? new Date().getFullYear());
  const ate = new Date(ano + 1, 0, 1);
  const carteiraId = await getCarteiraAtivaId();

  const ativos = await prisma.ativo.findMany({
    include: {
      lancamentos: { where: { carteiraId, data: { lt: ate } }, orderBy: { data: "asc" } },
    },
  });

  type Linha = { ticker: string; nome: string; cotas: number; precoMedio: number; valor: number };
  const linhas: Linha[] = [];
  for (const a of ativos) {
    if (a.lancamentos.length === 0) continue;
    const estado = recalcularAtivo(
      { id: a.id, ticker: a.ticker, nome: a.nome, segmento: a.segmento, precoAtual: a.precoAtual },
      a.lancamentos as LancamentoInput[],
    );
    if (estado.cotas <= 0) continue;
    linhas.push({
      ticker: a.ticker,
      nome: a.nome ?? "",
      cotas: estado.cotas,
      precoMedio: estado.precoMedio,
      valor: estado.custoTotal,
    });
  }

  const csv = [
    ["Ticker", "Nome", "Cotas", "Preço médio (R$)", "Valor declarado (R$)"].join(";"),
    ...linhas.map((l) => [
      l.ticker, l.nome, l.cotas.toFixed(0),
      l.precoMedio.toFixed(2).replace(".", ","),
      l.valor.toFixed(2).replace(".", ","),
    ].join(";")),
  ].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=bens-e-direitos-${ano}.csv`,
    },
  });
}
