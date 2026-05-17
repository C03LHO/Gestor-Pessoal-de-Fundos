import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";

export const dynamic = "force-dynamic";

/**
 * Corrige DIVIDENDOs órfãos (sem carteiraId) atribuindo-os à carteira ativa.
 * Era o bug que escondia os dividendos importados da página Lançamentos.
 *
 * POST /api/debug/adotar-dividendos
 */
export async function POST() {
  const carteiraId = await getCarteiraAtivaId();
  const r = await prisma.lancamento.updateMany({
    where: { tipo: "DIVIDENDO", carteiraId: null },
    data: { carteiraId },
  });
  return NextResponse.json({ adotados: r.count, carteiraId });
}

export async function GET() {
  const orfaos = await prisma.lancamento.count({
    where: { tipo: "DIVIDENDO", carteiraId: null },
  });
  return NextResponse.json({ orfaos });
}
