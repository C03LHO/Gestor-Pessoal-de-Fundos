import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api";

const schema = z.object({
  dyEstimadoAA: z.number().min(0).max(1).optional(),
  cenarioConservador: z.number().min(0).max(1).optional(),
  cenarioModerado: z.number().min(0).max(1).optional(),
  cenarioOtimista: z.number().min(0).max(1).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const atual = await prisma.configuracao.findFirst();
  const cfg = atual
    ? await prisma.configuracao.update({ where: { id: atual.id }, data: body })
    : await prisma.configuracao.create({ data: body });
  return NextResponse.json(cfg);
}
