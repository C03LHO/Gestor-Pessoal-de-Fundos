import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  rendaMensalAlvo: z.number().positive().optional(),
  aporteMensal: z.number().min(0).optional(),
  salarioMensal: z.number().min(0).optional(),
  percentualAporte: z.number().min(0).max(1).optional(),
});

export async function POST(req: NextRequest) {
  const body = schema.parse(await req.json());
  const atual = await prisma.meta.findFirst({ where: { ativa: true } });
  const meta = atual
    ? await prisma.meta.update({ where: { id: atual.id }, data: body })
    : await prisma.meta.create({ data: { ...body, rendaMensalAlvo: body.rendaMensalAlvo ?? 10000, ativa: true } });
  return NextResponse.json(meta);
}
