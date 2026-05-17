import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fonteCotacao: z.enum(["yahoo", "brapi"]).optional(),
  brapiToken: z.string().nullable().optional(),
  intervaloSyncMin: z.number().int().min(5).max(1440).optional(),
  prazoMetaAnos: z.number().min(1).max(50).optional(),
  dyEstimadoAA: z.number().min(0).max(1).optional(),
  alocacaoAlvo: z.string().nullable().optional(),
  iaProvedor: z.enum(["gemini", "groq"]).nullable().optional(),
  iaApiKey: z.string().nullable().optional(),
  iaModelo: z.string().nullable().optional(),
});

export async function GET() {
  const cfg = await prisma.configuracao.findFirst();
  return NextResponse.json(cfg);
}

export async function POST(req: NextRequest) {
  const body = schema.parse(await req.json());
  const atual = await prisma.configuracao.findFirst();
  if (!atual) return new NextResponse("sem configuração", { status: 500 });
  const cfg = await prisma.configuracao.update({ where: { id: atual.id }, data: body });
  return NextResponse.json(cfg);
}
