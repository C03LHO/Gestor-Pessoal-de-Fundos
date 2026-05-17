import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Retorna a lista de ativos cadastrados enriquecida com:
 * - ultimoPrecoCompra: precoUnit da compra/reinvestimento mais recente
 *   (preço sugerido ao registrar novo lançamento)
 */
export async function GET() {
  const ativos = await prisma.ativo.findMany({
    include: {
      lancamentos: {
        where: { tipo: { in: ["COMPRA", "REINVESTIMENTO"] }, precoUnit: { not: null } },
        orderBy: { data: "desc" },
        take: 1,
        select: { precoUnit: true, data: true },
      },
    },
    orderBy: { ticker: "asc" },
  });

  return NextResponse.json(
    ativos.map((a) => ({
      id: a.id,
      ticker: a.ticker,
      nome: a.nome,
      segmento: a.segmento,
      precoAtual: a.precoAtual,
      ultimoPrecoCompra: a.lancamentos[0]?.precoUnit ?? null,
    })),
  );
}
