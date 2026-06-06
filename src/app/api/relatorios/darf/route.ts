import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { toCent, toReais, multiplicar } from "@/lib/money";

/**
 * Calcula DARF mensal sobre lucro de venda de FIIs.
 * Alíquota: 20% sobre o lucro de cada operação de venda.
 * Não há isenção para FII em ganho de capital (diferente de ações).
 *
 * Query: ?ano=2026&mes=5  (default: mês atual)
 * Isola por carteira ativa e calcula o PM em centavos (sem drift de float).
 */
export async function GET(req: NextRequest) {
  const hoje = new Date();
  const ano = Number(req.nextUrl.searchParams.get("ano") ?? hoje.getFullYear());
  const mes = Number(req.nextUrl.searchParams.get("mes") ?? hoje.getMonth() + 1);

  const ini = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 1);
  const carteiraId = await getCarteiraAtivaId();

  const vendas = await prisma.lancamento.findMany({
    where: { tipo: "VENDA", carteiraId, data: { gte: ini, lt: fim } },
    include: { ativo: true },
    orderBy: { data: "asc" },
  });

  // Precisamos do PM ATÉ a data da venda (na MESMA carteira, em centavos).
  const detalhes: {
    data: string; ticker: string; qtd: number; valorVenda: number; pm: number; lucro: number;
  }[] = [];
  let lucroTotalCent = 0;

  for (const v of vendas) {
    if (!v.ativoId) continue;
    const lancsAnteriores = await prisma.lancamento.findMany({
      where: { ativoId: v.ativoId, carteiraId, data: { lt: v.data } },
      orderBy: { data: "asc" },
    });
    let cotas = 0, custoCent = 0;
    for (const l of lancsAnteriores) {
      if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") {
        cotas += l.quantidade ?? 0;
        custoCent += toCent(l.valorTotal);
      } else if (l.tipo === "VENDA" && cotas > 0) {
        const pmParcial = toReais(custoCent) / cotas;
        const q = l.quantidade ?? 0;
        cotas -= q;
        custoCent -= toCent(multiplicar(pmParcial, q));
      }
    }
    const pm = cotas > 0 ? toReais(custoCent) / cotas : 0;
    const qtdVendida = v.quantidade ?? 0;
    const custoCentBaixa = toCent(multiplicar(pm, qtdVendida));
    const lucroCent = toCent(v.valorTotal) - custoCentBaixa;
    lucroTotalCent += lucroCent;

    detalhes.push({
      data: v.data.toLocaleDateString("pt-BR"),
      ticker: v.ativo?.ticker ?? "",
      qtd: qtdVendida,
      valorVenda: v.valorTotal,
      pm,
      lucro: toReais(lucroCent),
    });
  }

  const lucroTotal = toReais(lucroTotalCent);
  const darf = lucroTotal > 0 ? Math.round(lucroTotal * 0.20 * 100) / 100 : 0;

  return NextResponse.json({
    ano, mes,
    operacoes: detalhes,
    lucroTotal,
    aliquota: 0.20,
    darf,
    obs: darf > 0
      ? "DARF deve ser paga até o último dia útil do mês seguinte. Código DARF: 6015."
      : "Sem lucro de venda no período. Nenhum DARF devido.",
  });
}
