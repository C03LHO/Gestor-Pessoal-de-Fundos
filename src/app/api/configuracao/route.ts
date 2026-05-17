import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  dyEstimadoAA: z.number().min(0).max(1).optional(),
  cenarioConservador: z.number().min(0).max(1).optional(),
  cenarioModerado: z.number().min(0).max(1).optional(),
  cenarioOtimista: z.number().min(0).max(1).optional(),
});

export async function POST(req: NextRequest) {
  const body = schema.parse(await req.json());
  const atual = await prisma.configuracao.findFirst();
  const cfg = atual
    ? await prisma.configuracao.update({ where: { id: atual.id }, data: body })
    : await prisma.configuracao.create({ data: body });
  return NextResponse.json(cfg);
}
