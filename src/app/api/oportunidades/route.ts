import { NextResponse } from "next/server";
import { calcularOportunidades } from "@/lib/domain/watchlist";
import { getCarteiraAtivaId } from "@/lib/carteira";

export const runtime = "nodejs";

export async function GET() {
  const carteiraId = await getCarteiraAtivaId();
  const oport = await calcularOportunidades(carteiraId);
  return NextResponse.json(oport);
}
