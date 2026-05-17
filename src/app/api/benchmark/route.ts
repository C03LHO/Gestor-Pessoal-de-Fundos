import { NextResponse } from "next/server";
import { rentabilidadeIfix, rentabilidadeCdi } from "@/lib/mercado/benchmark";

export async function GET() {
  const [ifix, cdi] = await Promise.all([rentabilidadeIfix(12), rentabilidadeCdi(12)]);
  return NextResponse.json({ ifix, cdi, periodo: "12m" });
}
