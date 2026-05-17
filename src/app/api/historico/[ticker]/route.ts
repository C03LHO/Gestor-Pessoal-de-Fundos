import { NextRequest, NextResponse } from "next/server";
import { buscarSerieHistorica } from "@/lib/mercado/yahoo";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const range = req.nextUrl.searchParams.get("range") ?? "1mo";
  const serie = await buscarSerieHistorica(ticker.toUpperCase(), range);
  if (!serie) return new NextResponse("Sem dados", { status: 404 });
  return NextResponse.json(serie);
}
