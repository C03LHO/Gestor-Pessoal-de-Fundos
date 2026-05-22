import { NextRequest, NextResponse } from "next/server";
import { getHistorico, getHistoricoTodos } from "@/lib/cripto/coingecko";
import { isCryptoId } from "@/lib/cripto/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const diasParam = req.nextUrl.searchParams.get("dias");
  let dias = 365;
  if (diasParam != null) {
    const n = Number(diasParam);
    if (!Number.isFinite(n) || n <= 0 || n > 3650) {
      return NextResponse.json({ erro: "dias deve ser número entre 1 e 3650" }, { status: 400 });
    }
    dias = Math.floor(n);
  }
  if (id) {
    if (!isCryptoId(id)) return NextResponse.json({ erro: "cryptoId inválido" }, { status: 400 });
    return NextResponse.json(await getHistorico(id, dias));
  }
  return NextResponse.json(await getHistoricoTodos(dias));
}
