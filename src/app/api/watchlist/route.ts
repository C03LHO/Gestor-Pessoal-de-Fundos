import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buscarCotacao } from "@/lib/mercado/yahoo";
import { garantirWatchlistInicial } from "@/lib/domain/watchlist";
import { parseBody } from "@/lib/api";

const schema = z.object({
  ticker: z.string().transform((s) => s.trim().toUpperCase()),
  metaInvestimento: z.number().min(0).optional(),
  notas: z.string().optional(),
});

export async function GET() {
  await garantirWatchlistInicial();
  const items = await prisma.watchlistAtivo.findMany({ orderBy: { ordem: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const max = await prisma.watchlistAtivo.aggregate({ _max: { ordem: true } });
  const cot = await buscarCotacao(body.ticker).catch(() => null);
  if (cot && !(await prisma.ativo.findUnique({ where: { ticker: body.ticker } }))) {
    await prisma.ativo.create({
      data: { ticker: body.ticker, nome: cot.nome, precoAtual: cot.preco, atualizadoEm: new Date() },
    });
  }
  try {
    const novo = await prisma.watchlistAtivo.create({
      data: {
        ticker: body.ticker,
        metaInvestimento: body.metaInvestimento ?? 10000,
        notas: body.notas,
        ordem: (max._max.ordem ?? 0) + 1,
      },
    });
    return NextResponse.json(novo, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return new NextResponse("Já está na watchlist", { status: 409 });
    throw e;
  }
}
