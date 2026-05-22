import { NextResponse } from "next/server";
import { getPrecos } from "@/lib/cripto/coingecko";

export const dynamic = "force-dynamic";

export async function GET() {
  const precos = await getPrecos();
  return NextResponse.json(precos);
}
