import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ ativos: [], lancamentos: [] });

  const upper = q.toUpperCase();

  const [ativos, lancamentos] = await Promise.all([
    prisma.ativo.findMany({
      where: {
        OR: [
          { ticker: { contains: upper } },
          { nome: { contains: q } },
          { segmento: { contains: q } },
        ],
      },
      take: 8,
      orderBy: { ticker: "asc" },
    }),
    prisma.lancamento.findMany({
      where: {
        OR: [
          { tipo: { contains: upper } },
          { observacao: { contains: q } },
          { ativo: { ticker: { contains: upper } } },
        ],
      },
      include: { ativo: true },
      take: 8,
      orderBy: { data: "desc" },
    }),
  ]);

  return NextResponse.json({ ativos, lancamentos });
}
