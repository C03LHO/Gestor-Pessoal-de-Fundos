import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";

export const dynamic = "force-dynamic";

/**
 * Remove DIVIDENDOs duplicados no mesmo mês para o mesmo ativo.
 * Yahoo (ex-date) e Fundamentus (data de pagamento) gravavam duas linhas
 * para a mesma distribuição. Mantém a mais antiga (geralmente o ex-date).
 *
 * POST /api/debug/dedup-dividendos
 */
export async function POST() {
  const carteiraId = await getCarteiraAtivaId();

  const divs = await prisma.lancamento.findMany({
    where: { tipo: "DIVIDENDO", carteiraId },
    orderBy: { data: "asc" },
  });

  const visto = new Map<string, string>(); // chave -> id que fica
  const aRemover: string[] = [];

  for (const d of divs) {
    if (!d.ativoId) continue;
    const mes = d.data.toISOString().slice(0, 7);
    const chave = `${d.ativoId}|${mes}`;
    if (visto.has(chave)) {
      aRemover.push(d.id);
    } else {
      visto.set(chave, d.id);
    }
  }

  if (aRemover.length === 0) {
    return NextResponse.json({ removidos: 0, mantidos: visto.size });
  }

  const r = await prisma.lancamento.deleteMany({
    where: { id: { in: aRemover } },
  });

  return NextResponse.json({
    removidos: r.count,
    mantidos: visto.size,
    carteiraId,
  });
}

export async function GET() {
  const carteiraId = await getCarteiraAtivaId();
  const divs = await prisma.lancamento.findMany({
    where: { tipo: "DIVIDENDO", carteiraId },
    select: { ativoId: true, data: true },
  });
  const contagem = new Map<string, number>();
  for (const d of divs) {
    if (!d.ativoId) continue;
    const k = `${d.ativoId}|${d.data.toISOString().slice(0, 7)}`;
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
  }
  const duplicados = [...contagem.entries()].filter(([, n]) => n > 1).length;
  return NextResponse.json({ duplicados, total: divs.length });
}
