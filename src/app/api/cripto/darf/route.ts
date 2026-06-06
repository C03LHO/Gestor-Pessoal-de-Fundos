import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { apurarCriptoMes } from "@/lib/cripto/fiscal";

/**
 * Apuração fiscal de cripto do mês (isenção R$ 35k + IR 15% sobre o lucro).
 * Query: ?ano=2026&mes=5 (default: mês atual). Isola pela carteira ativa.
 */
export async function GET(req: NextRequest) {
  const hoje = new Date();
  const ano = Number(req.nextUrl.searchParams.get("ano") ?? hoje.getFullYear());
  const mes = Number(req.nextUrl.searchParams.get("mes") ?? hoje.getMonth() + 1);

  const carteiraId = await getCarteiraAtivaId();
  const txs = await prisma.cryptoTransaction.findMany({
    where: { carteiraId },
    orderBy: { data: "asc" },
  });

  return NextResponse.json(apurarCriptoMes(txs, ano, mes));
}
