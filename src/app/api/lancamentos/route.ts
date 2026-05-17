import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sincronizarDividendosDoAtivo } from "@/lib/domain/sync-dividendos";
import { getCarteiraAtivaId } from "@/lib/carteira";

const schema = z.object({
  tipo: z.enum(["COMPRA", "VENDA", "APORTE", "DIVIDENDO", "REINVESTIMENTO"]),
  data: z.coerce.date(),
  ativoId: z.string().nullable().optional(),
  quantidade: z.number().nullable().optional(),
  precoUnit: z.number().nullable().optional(),
  valorTotal: z.number(),
  observacao: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get("tipo");
  const ativoId = req.nextUrl.searchParams.get("ativoId");
  const data = await prisma.lancamento.findMany({
    where: { tipo: tipo ?? undefined, ativoId: ativoId ?? undefined },
    include: { ativo: true },
    orderBy: { data: "desc" },
    take: 500,
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = schema.parse(await req.json());
  const carteiraId = await getCarteiraAtivaId();
  const novo = await prisma.lancamento.create({ data: { ...body, carteiraId } });

  // Inteligência: ao registrar compra/reinvestimento, dispara re-import de dividendos
  // do ativo em background. Datas onde o usuário PASSA a ter cotas geram lançamentos.
  if (body.ativoId && (body.tipo === "COMPRA" || body.tipo === "REINVESTIMENTO")) {
    sincronizarDividendosDoAtivo(body.ativoId, 10).catch((e) => {
      console.error("[sync-divs] erro:", e?.message);
    });
  }

  return NextResponse.json(novo, { status: 201 });
}
