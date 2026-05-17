import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SYNC_MAX_IDADE_MS = 6 * 60 * 60 * 1000; // 6h: tolerância máxima para considerar saudável

export async function GET() {
  const inicio = Date.now();
  try {
    const [ativos, lancs, ultimaSync] = await Promise.all([
      prisma.ativo.count(),
      prisma.lancamento.count(),
      prisma.ativo.findFirst({ orderBy: { atualizadoEm: "desc" }, select: { atualizadoEm: true } }),
    ]);

    const idadeMs = ultimaSync?.atualizadoEm ? Date.now() - ultimaSync.atualizadoEm.getTime() : null;
    // Saudável se: (a) não tem ativos ainda (instalação nova) OU (b) sync recente
    const syncOk = ativos === 0 || (idadeMs !== null && idadeMs <= SYNC_MAX_IDADE_MS);

    const body = {
      status: syncOk ? "ok" : "stale",
      latenciaMs: Date.now() - inicio,
      banco: { ativos, lancamentos: lancs },
      ultimaSync: ultimaSync?.atualizadoEm ?? null,
      syncIdadeMin: idadeMs !== null ? Math.round(idadeMs / 60_000) : null,
      versao: "0.1.0",
    };
    return NextResponse.json(body, { status: syncOk ? 200 : 503 });
  } catch (e: any) {
    return NextResponse.json(
      { status: "erro", erro: e?.message },
      { status: 503 },
    );
  }
}
