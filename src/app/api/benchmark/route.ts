import { NextResponse } from "next/server";
import {
  rentabilidadeIfix,
  rentabilidadeCdi,
  rentabilidadeIbov,
  rentabilidadeBtc,
} from "@/lib/mercado/benchmark";

export async function GET() {
  const [ifix, cdi, ibov, btc] = await Promise.all([
    rentabilidadeIfix(12),
    rentabilidadeCdi(12),
    rentabilidadeIbov(12),
    rentabilidadeBtc(12),
  ]);
  return NextResponse.json({ ifix, cdi, ibov, btc, periodo: "12m" });
}
