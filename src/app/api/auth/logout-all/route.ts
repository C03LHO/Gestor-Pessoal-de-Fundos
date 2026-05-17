import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/log";

export const runtime = "nodejs";

/**
 * Desconecta TODOS os dispositivos: incrementa authVersion. Todos os cookies
 * antigos viram inválidos na próxima requisição (verificação no layout).
 */
export async function POST(req: NextRequest) {
  const cfg = await prisma.configuracao.findFirst();
  if (!cfg) return new NextResponse("sem configuracao", { status: 500 });

  await prisma.configuracao.update({
    where: { id: cfg.id },
    data: { authVersion: { increment: 1 } },
  });

  log.info("auth.logout-all", { novaVersao: cfg.authVersion + 1 });

  const res = NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  res.cookies.delete("fundos_auth");
  return res;
}
