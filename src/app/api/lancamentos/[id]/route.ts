import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sincronizarDividendosDoAtivo } from "@/lib/domain/sync-dividendos";

const patchSchema = z.object({
  tipo: z.enum(["COMPRA", "VENDA", "APORTE", "DIVIDENDO", "REINVESTIMENTO"]).optional(),
  data: z.coerce.date().optional(),
  ativoId: z.string().nullable().optional(),
  quantidade: z.number().nullable().optional(),
  precoUnit: z.number().nullable().optional(),
  valorTotal: z.number().optional(),
  observacao: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = patchSchema.parse(await req.json());
  const atualizado = await prisma.lancamento.update({ where: { id }, data: body });

  if (atualizado.ativoId && (atualizado.tipo === "COMPRA" || atualizado.tipo === "REINVESTIMENTO")) {
    sincronizarDividendosDoAtivo(atualizado.ativoId, 10).catch(() => {});
  }

  return NextResponse.json(atualizado);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.lancamento.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
