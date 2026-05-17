import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patch = z.object({
  nome: z.string().min(1).max(40).optional(),
  cor: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = patch.parse(await req.json());
  try {
    const c = await prisma.carteira.update({ where: { id }, data: body });
    return NextResponse.json(c);
  } catch (e: any) {
    if (e?.code === "P2002") return new NextResponse("Já existe carteira com esse nome", { status: 409 });
    throw e;
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restante = await prisma.carteira.count({ where: { id: { not: id } } });
  if (restante === 0) return new NextResponse("Não pode excluir a única carteira", { status: 400 });
  await prisma.carteira.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
