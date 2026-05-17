import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Relatório "Bens e Direitos" para IR. Para cada ativo, calcula a posição
 * em 31/12/ano: quantidade × preço médio, com CNPJ se conhecido.
 *
 * Query: ?ano=2026
 */
export async function GET(req: NextRequest) {
  const ano = Number(req.nextUrl.searchParams.get("ano") ?? new Date().getFullYear());
  const ate = new Date(ano + 1, 0, 1);

  const ativos = await prisma.ativo.findMany({
    include: { lancamentos: { where: { data: { lt: ate } }, orderBy: { data: "asc" } } },
  });

  type Linha = { ticker: string; nome: string; cotas: number; precoMedio: number; valor: number };
  const linhas: Linha[] = [];
  for (const a of ativos) {
    let cotas = 0, investido = 0;
    for (const l of a.lancamentos) {
      if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") {
        cotas += l.quantidade ?? 0;
        investido += l.valorTotal;
      } else if (l.tipo === "VENDA" && cotas > 0) {
        const pm = investido / cotas;
        cotas -= l.quantidade ?? 0;
        investido -= (l.quantidade ?? 0) * pm;
      }
    }
    if (cotas <= 0) continue;
    linhas.push({
      ticker: a.ticker,
      nome: a.nome ?? "",
      cotas,
      precoMedio: investido / cotas,
      valor: investido,
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
