import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  sincronizarDividendosDeTodos,
  sincronizarDividendosDoAtivo,
} from "@/lib/domain/sync-dividendos";

const schema = z.object({
  ativoId: z.string().optional(),
  anos: z.number().optional(),
});

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = req.body ? schema.parse(await req.json()) : {}; } catch {}
  const anos = body.anos ?? 10;

  const importados = body.ativoId
    ? await sincronizarDividendosDoAtivo(body.ativoId, anos)
    : await sincronizarDividendosDeTodos(anos);

  return NextResponse.json({ importados });
}
