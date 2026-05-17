import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sincronizarDividendosDoAtivo } from "@/lib/domain/sync-dividendos";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { log } from "@/lib/log";

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

  // Em compra/reinvestimento: AGUARDA o import de dividendos (síncrono)
  // para que o usuário veja imediatamente todos os proventos retroativos
  // dos meses em que ele tinha cotas.
  let dividendosImportados = 0;
  let sincErro: string | null = null;
  if (body.ativoId && (body.tipo === "COMPRA" || body.tipo === "REINVESTIMENTO")) {
    try {
      dividendosImportados = await sincronizarDividendosDoAtivo(body.ativoId, 10);
      log.info("lancamento.dividendos_importados", {
        ativoId: body.ativoId, count: dividendosImportados,
      });
    } catch (e: any) {
      sincErro = e?.message ?? "falha desconhecida";
      log.error("lancamento.sync_divs_falhou", { ativoId: body.ativoId, erro: sincErro });
    }
  }

  return NextResponse.json({ ...novo, dividendosImportados, sincErro }, { status: 201 });
}
