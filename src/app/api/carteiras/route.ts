import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/cripto/zod-helper";

const schema = z.object({
  nome: z.string().min(1).max(40),
  cor: z.string().optional().nullable(),
  tipo: z.enum(["FII", "CRIPTO"]).optional(),
});

export async function GET() {
  return NextResponse.json(await prisma.carteira.findMany({ orderBy: { criadaEm: "asc" } }));
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  try {
    const tipo = body.tipo ?? "FII";
    const corPadrao = tipo === "CRIPTO" ? "#f59e0b" : "#10b981";
    const c = await prisma.carteira.create({ data: { nome: body.nome, cor: body.cor ?? corPadrao, tipo } });
    return NextResponse.json(c, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return new NextResponse("Já existe carteira com esse nome", { status: 409 });
    throw e;
  }
}
