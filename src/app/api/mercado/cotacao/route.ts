import { NextRequest, NextResponse } from "next/server";
import { buscarCotacao } from "@/lib/mercado/yahoo";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return new NextResponse("ticker obrigatório", { status: 400 });
  const c = await buscarCotacao(ticker.toUpperCase());
  if (!c) return new NextResponse("Não encontrado", { status: 404 });
  return NextResponse.json(c);
}
