import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

const SYNC_MAX_IDADE_MS = 6 * 60 * 60 * 1000; // 6h: acima disso a sync é considerada atrasada

/**
 * Healthcheck do container (usado pelo HEALTHCHECK do Docker).
 *
 * Regra: 200 sempre que o processo responde e o banco está acessível.
 * Sync atrasada é informação de negócio (campo `sync.atrasada` no corpo), não
 * falha de infraestrutura — devolver 503 nesse caso marcava o container como
 * unhealthy só porque o mercado não era consultado há algumas horas.
 * 503 fica reservado para banco realmente indisponível, e nesse caso o erro é logado.
 */
export async function GET() {
  const inicio = Date.now();

  // 1) Checagem mínima de conexão. Se isso passa, o container está saudável.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e: any) {
    log.error("health.banco_indisponivel", { erro: e?.message });
    return NextResponse.json(
      {
        status: "erro",
        erro: e?.message ?? "banco indisponível",
        latenciaMs: Date.now() - inicio,
        versao: "0.1.0",
      },
      { status: 503 },
    );
  }

  // 2) Métricas informativas. Falha aqui não derruba o healthcheck.
  let banco: { ativos: number; lancamentos: number } | null = null;
  let ultimaSync: Date | null = null;
  try {
    const [ativos, lancs, ultimo] = await Promise.all([
      prisma.ativo.count(),
      prisma.lancamento.count(),
      prisma.ativo.findFirst({ orderBy: { atualizadoEm: "desc" }, select: { atualizadoEm: true } }),
    ]);
    banco = { ativos, lancamentos: lancs };
    ultimaSync = ultimo?.atualizadoEm ?? null;
  } catch (e: any) {
    log.warn("health.metricas_falharam", { erro: e?.message });
  }

  const idadeMs = ultimaSync ? Date.now() - ultimaSync.getTime() : null;
  // Atrasada se: já existem ativos cadastrados E a última sync passou da tolerância
  const atrasada = !!banco && banco.ativos > 0 && (idadeMs === null || idadeMs > SYNC_MAX_IDADE_MS);

  return NextResponse.json(
    {
      status: atrasada ? "stale" : "ok",
      latenciaMs: Date.now() - inicio,
      banco,
      ultimaSync,
      sync: {
        atrasada,
        idadeMin: idadeMs !== null ? Math.round(idadeMs / 60_000) : null,
      },
      // Mantido por compatibilidade com consumidores da versão anterior
      syncIdadeMin: idadeMs !== null ? Math.round(idadeMs / 60_000) : null,
      versao: "0.1.0",
    },
    { status: 200 },
  );
}
