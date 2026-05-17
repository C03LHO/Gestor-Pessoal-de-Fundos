import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ehOutlier } from "@/lib/domain/estatistica";

/**
 * Verifica se um preço está fora do padrão histórico do ativo (evita
 * erros de digitação tipo R$ 100 em vez de R$ 10).
 */
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.toUpperCase();
  const precoStr = req.nextUrl.searchParams.get("preco");
  if (!ticker || !precoStr) return NextResponse.json({ outlier: false });

  const preco = parseFloat(precoStr);
  if (isNaN(preco) || preco <= 0) return NextResponse.json({ outlier: false });

  const ativo = await prisma.ativo.findUnique({
    where: { ticker },
    include: {
      lancamentos: {
        where: { tipo: { in: ["COMPRA", "REINVESTIMENTO"] }, precoUnit: { not: null } },
        select: { precoUnit: true },
        take: 50,
      },
    },
  });
  if (!ativo) return NextResponse.json({ outlier: false });

  const amostra = ativo.lancamentos.map((l) => l.precoUnit!).filter((p) => p > 0);
  if (amostra.length < 3 && ativo.precoAtual) amostra.push(ativo.precoAtual);

  const out = ehOutlier(preco, amostra, 3.5);
  const mediana = [...amostra].sort((a, b) => a - b)[Math.floor(amostra.length / 2)];

  return NextResponse.json({
    outlier: out,
    mediana,
    sugestao: out ? `Padrão histórico é ~R$ ${mediana?.toFixed(2)}. Confira se o valor está correto.` : null,
  });
}
