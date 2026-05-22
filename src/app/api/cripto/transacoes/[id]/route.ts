import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const carteiraId = await getCarteiraAtivaId();
  const lanc = await prisma.cryptoTransaction.findUnique({ where: { id } });
  if (!lanc || lanc.carteiraId !== carteiraId) {
    return new NextResponse("não encontrado", { status: 404 });
  }
  await prisma.cryptoTransaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
