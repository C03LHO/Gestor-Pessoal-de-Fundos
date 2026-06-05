import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buscarCotacao } from "@/lib/mercado/yahoo";
import { parseBody } from "@/lib/api";

const schema = z.object({ ticker: z.string().min(2).max(10) });

/**
 * Garante que existe um Ativo com aquele ticker. Se não existe,
 * busca no Yahoo (nome + cotação atual) e cria. Retorna o ativo.
 */
export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const ticker = parsed.data.ticker.trim().toUpperCase();

  const existente = await prisma.ativo.findUnique({ where: { ticker } });
  if (existente) return NextResponse.json(existente);

  const cot = await buscarCotacao(ticker);
  if (!cot) {
    return new NextResponse(`Ticker ${ticker} não encontrado no Yahoo Finance`, { status: 404 });
  }

  const a = await prisma.ativo.create({
    data: {
      ticker,
      nome: cot.nome,
      precoAtual: cot.preco,
      atualizadoEm: new Date(),
    },
  });
  return NextResponse.json(a, { status: 201 });
}
