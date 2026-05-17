import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  nome: z.string().nullable().optional(),
  segmento: z.string().nullable().optional(),
  precoAtual: z.number().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = patchSchema.parse(await req.json());
  const a = await prisma.ativo.update({
    where: { id },
    data: {
      ...body,
      atualizadoEm: body.precoAtual !== undefined ? new Date() : undefined,
    },
  });
  return NextResponse.json(a);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.ativo.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
