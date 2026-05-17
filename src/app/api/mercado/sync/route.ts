import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarVariasConfigurada } from "@/lib/mercado/fonte";
import { sincronizarDividendosDeTodos } from "@/lib/domain/sync-dividendos";
import { log } from "@/lib/log";

export async function POST(req: NextRequest) {
  const force = req.nextUrl.searchParams.get("force") === "1";

  const [ativos, cfg] = await Promise.all([
    prisma.ativo.findMany(),
    prisma.configuracao.findFirst(),
  ]);
  const intervaloMin = cfg?.intervaloSyncMin ?? 30;

  if (ativos.length === 0) return NextResponse.json({ skipped: true, motivo: "sem ativos" });

  const ultima = ativos.map((a) => a.atualizadoEm?.getTime() ?? 0).reduce((m, t) => Math.max(m, t), 0);
  const minDesde = (Date.now() - ultima) / 60_000;

  if (!force && ultima > 0 && minDesde < intervaloMin) {
    return NextResponse.json({
      skipped: true, motivo: "recente",
      ultimaAtualizacao: new Date(ultima).toISOString(),
      minutosAtras: Math.round(minDesde),
    });
  }

  const agora = new Date();
  const cotacoes = await buscarVariasConfigurada(ativos.map((a) => a.ticker));

  let cotacoesAtualizadas = 0;
  for (const c of cotacoes) {
    const a = ativos.find((x) => x.ticker === c.ticker);
    if (!a) continue;
    await prisma.ativo.update({
      where: { id: a.id },
      data: { precoAtual: c.preco, nome: a.nome ?? c.nome, atualizadoEm: agora },
    });
    // grava cotação no histórico (uma por ativo por sync)
    await prisma.cotacao.create({
      data: { ticker: c.ticker, preco: c.preco, data: agora, fonte: cfg?.fonteCotacao ?? "yahoo" },
    });
    cotacoesAtualizadas++;
  }

  const dividendosImportados = await sincronizarDividendosDeTodos(5);

  log.info("mercado.sync", { cotacoesAtualizadas, dividendosImportados, fonte: cfg?.fonteCotacao });

  return NextResponse.json({
    skipped: false,
    cotacoesAtualizadas,
    dividendosImportados,
    ultimaAtualizacao: agora.toISOString(),
  });
}

export async function GET() {
  const a = await prisma.ativo.findFirst({
    orderBy: { atualizadoEm: "desc" },
    select: { atualizadoEm: true },
  });
  return NextResponse.json({ ultimaAtualizacao: a?.atualizadoEm ?? null });
}
