import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const inicio = Date.now();
  try {
    const [ativos, lancs, ultimaSync] = await Promise.all([
      prisma.ativo.count(),
      prisma.lancamento.count(),
      prisma.ativo.findFirst({ orderBy: { atualizadoEm: "desc" }, select: { atualizadoEm: true } }),
    ]);
    return NextResponse.json({
      status: "ok",
      latenciaMs: Date.now() - inicio,
      banco: { ativos, lancamentos: lancs },
      ultimaSync: ultimaSync?.atualizadoEm ?? null,
      versao: "0.1.0",
    });
  } catch (e: any) {
    return NextResponse.json(
      { status: "erro", erro: e?.message },
      { status: 503 },
    );
  }
}
