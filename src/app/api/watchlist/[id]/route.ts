import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api";

const patchSchema = z.object({
  metaInvestimento: z.number().min(0).optional(),
  notas: z.string().nullable().optional(),
  ordem: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const r = await prisma.watchlistAtivo.update({ where: { id }, data: body });
  return NextResponse.json(r);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.watchlistAtivo.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
