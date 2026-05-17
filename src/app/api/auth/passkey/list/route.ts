import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const lista = await prisma.passkey.findMany({
    select: { id: true, credentialId: true, rotulo: true, criadoEm: true, ultimoUsoEm: true },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json(lista);
}
