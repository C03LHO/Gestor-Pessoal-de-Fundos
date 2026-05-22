import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/cripto/zod-helper";

const schema = z.object({ id: z.string() });

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const { id } = parsed.data;
  const existe = await prisma.carteira.findUnique({ where: { id } });
  if (!existe) return new NextResponse("Carteira não existe", { status: 404 });

  const res = NextResponse.json({ ativa: id });
  res.cookies.set("fundos_carteira", id, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
