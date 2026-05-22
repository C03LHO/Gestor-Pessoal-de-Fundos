import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { quantidadeAtual } from "@/lib/cripto/carteira";
import { isCryptoId, isEntradaGratuita } from "@/lib/cripto/constants";
import { parseBody } from "@/lib/cripto/zod-helper";

const schema = z.object({
  tipo: z.enum(["COMPRA", "VENDA", "MINERACAO", "TRANSFERENCIA"]),
  data: z.coerce.date(),
  cryptoId: z.string().refine(isCryptoId, { message: "cryptoId inválido" }),
  quantidade: z.number().positive(),
  precoUnit: z.number().nonnegative().optional().nullable(),
  valorTotal: z.number().nonnegative().optional(),
  observacao: z.string().max(500).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const carteiraId = await getCarteiraAtivaId();
  const cryptoId = req.nextUrl.searchParams.get("cryptoId");
  const data = await prisma.cryptoTransaction.findMany({
    where: { carteiraId, cryptoId: cryptoId ?? undefined },
    orderBy: { data: "desc" },
    take: 500,
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const carteiraId = await getCarteiraAtivaId();

  const entradaGratuita = isEntradaGratuita(body.tipo);
  const precoUnit = entradaGratuita ? 0 : (body.precoUnit ?? 0);
  const valorTotal = entradaGratuita ? 0 : (body.valorTotal ?? body.quantidade * precoUnit);

  if (!entradaGratuita && precoUnit <= 0) {
    return NextResponse.json({ erro: "Preço unitário obrigatório para compras/vendas" }, { status: 422 });
  }

  if (body.tipo === "VENDA") {
    const saldo = await quantidadeAtual(carteiraId, body.cryptoId);
    if (body.quantidade > saldo + 1e-12) {
      return NextResponse.json(
        { erro: `Saldo insuficiente. Disponível: ${saldo}` },
        { status: 422 },
      );
    }
  }

  const novo = await prisma.cryptoTransaction.create({
    data: {
      tipo: body.tipo,
      data: body.data,
      cryptoId: body.cryptoId,
      carteiraId,
      quantidade: body.quantidade,
      precoUnit,
      valorTotal,
      observacao: body.observacao ?? null,
    },
  });
  return NextResponse.json(novo, { status: 201 });
}
