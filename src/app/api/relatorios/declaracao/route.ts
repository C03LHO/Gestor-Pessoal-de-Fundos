import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { toCent, toReais, multiplicar } from "@/lib/money";

/**
 * Relatório "Bens e Direitos" para IR. Para cada ativo, calcula a posição
 * em 31/12/ano: quantidade × preço médio (custo declarado), em centavos.
 *
 * Query: ?ano=2026 — isola pela carteira ativa.
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
    let cotas = 0, custoCent = 0;
    for (const l of a.lancamentos) {
      if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") {
        cotas += l.quantidade ?? 0;
        custoCent += toCent(l.valorTotal);
      } else if (l.tipo === "VENDA" && cotas > 0) {
        const pm = toReais(custoCent) / cotas;
        const q = l.quantidade ?? 0;
        cotas -= q;
        custoCent -= toCent(multiplicar(pm, q));
      }
    }
    if (cotas <= 0) continue;
    const investido = toReais(custoCent);
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
