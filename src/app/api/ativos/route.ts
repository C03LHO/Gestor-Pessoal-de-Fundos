import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  ticker: z.string().min(1).transform((s) => s.trim().toUpperCase()),
  nome: z.string().nullable().optional(),
  segmento: z.string().nullable().optional(),
  precoAtual: z.number().nullable().optional(),
});

export async function GET() {
  const ativos = await prisma.ativo.findMany({ orderBy: { ticker: "asc" } });
  return NextResponse.json(ativos);
}

export async function POST(req: NextRequest) {
  const body = schema.parse(await req.json());
  try {
    const a = await prisma.ativo.create({
      data: { ...body, atualizadoEm: body.precoAtual != null ? new Date() : null },
    });
    return NextResponse.json(a, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return new NextResponse("Ticker já cadastrado", { status: 409 });
    throw e;
  }
}
