import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarVarias } from "@/lib/mercado/yahoo";

export async function POST() {
  const ativos = await prisma.ativo.findMany();
  if (ativos.length === 0) return NextResponse.json({ atualizados: 0 });

  const cotacoes = await buscarVarias(ativos.map((a) => a.ticker));
  const agora = new Date();

  let atualizados = 0;
  for (const c of cotacoes) {
    const a = ativos.find((x) => x.ticker === c.ticker);
    if (!a) continue;
    await prisma.ativo.update({
      where: { id: a.id },
      data: {
        precoAtual: c.preco,
        nome: a.nome ?? c.nome,
        atualizadoEm: agora,
      },
    });
    atualizados++;
  }

  return NextResponse.json({ atualizados, total: ativos.length });
}
