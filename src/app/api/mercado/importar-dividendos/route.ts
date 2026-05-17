import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sincronizarDividendosDoAtivo } from "@/lib/domain/sync-dividendos";
import { getCarteiraAtivaId } from "@/lib/carteira";

const schema = z.object({
  ativoId: z.string().optional(),
  anos: z.number().optional(),
});

/**
 * Re-sincroniza dividendos. Sem `ativoId`, percorre todos os ativos com
 * posição ativa na carteira e retorna o detalhamento por ticker.
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = req.body ? schema.parse(await req.json()) : {}; } catch {}
  const anos = body.anos ?? 10;

  if (body.ativoId) {
    const importados = await sincronizarDividendosDoAtivo(body.ativoId, anos);
    return NextResponse.json({ importados, detalhes: null });
  }

  const carteiraId = await getCarteiraAtivaId();
  const ativos = await prisma.ativo.findMany({
    where: { lancamentos: { some: { carteiraId } } },
    select: { id: true, ticker: true },
    orderBy: { ticker: "asc" },
  });

  const detalhes: { ticker: string; importados: number; erro?: string }[] = [];
  let total = 0;
  for (const a of ativos) {
    try {
      const n = await sincronizarDividendosDoAtivo(a.id, anos);
      detalhes.push({ ticker: a.ticker, importados: n });
      total += n;
    } catch (e: any) {
      detalhes.push({ ticker: a.ticker, importados: 0, erro: e?.message ?? "falha" });
    }
  }
  return NextResponse.json({ importados: total, detalhes });
}
