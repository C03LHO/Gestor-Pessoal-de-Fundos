import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  nome: z.string().min(1).max(40),
  cor: z.string().optional().nullable(),
});

export async function GET() {
  return NextResponse.json(await prisma.carteira.findMany({ orderBy: { criadaEm: "asc" } }));
}

export async function POST(req: NextRequest) {
  const body = schema.parse(await req.json());
  try {
    const c = await prisma.carteira.create({ data: { nome: body.nome, cor: body.cor ?? "#10b981" } });
    return NextResponse.json(c, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return new NextResponse("Já existe carteira com esse nome", { status: 409 });
    throw e;
  }
}
