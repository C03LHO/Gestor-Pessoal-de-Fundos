import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarSerieHistorica } from "@/lib/mercado/yahoo";
import { garantirWatchlistInicial } from "@/lib/domain/watchlist";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "1mo";
  await garantirWatchlistInicial();
  const watchlist = await prisma.watchlistAtivo.findMany({ orderBy: { ordem: "asc" } });

  const series = await Promise.all(
    watchlist.map((w) => buscarSerieHistorica(w.ticker, range)),
  );

  return NextResponse.json({
    range,
    series: series.map((s, i) => ({
      ticker: watchlist[i].ticker,
      ordem: watchlist[i].ordem,
      notas: watchlist[i].notas,
      serie: s,
    })),
  });
}
