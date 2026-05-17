import { NextRequest, NextResponse } from "next/server";
import { buscarPrecoNaData } from "@/lib/mercado/yahoo";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const data = req.nextUrl.searchParams.get("data");
  if (!ticker || !data) return new NextResponse("ticker e data obrigatórios", { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return new NextResponse("data inválida (YYYY-MM-DD)", { status: 400 });
  const r = await buscarPrecoNaData(ticker, data);
  if (!r) return new NextResponse("preço não encontrado", { status: 404 });
  return NextResponse.json(r);
}
