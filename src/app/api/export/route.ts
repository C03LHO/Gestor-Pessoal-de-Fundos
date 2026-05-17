import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [carteiras, ativos, lancamentos, meta, configuracao, cotacoes] = await Promise.all([
    prisma.carteira.findMany(),
    prisma.ativo.findMany(),
    prisma.lancamento.findMany(),
    prisma.meta.findFirst(),
    prisma.configuracao.findFirst(),
    prisma.cotacao.findMany({ orderBy: { data: "desc" }, take: 5000 }),
  ]);
  const payload = {
    versao: 1,
    geradoEm: new Date().toISOString(),
    carteiras,
    ativos,
    lancamentos,
    meta,
    configuracao,
    cotacoes,
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename=fundos-${new Date().toISOString().slice(0, 10)}.json`,
    },
  });
}
