import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ ids: z.array(z.string()).min(1) });

export async function POST(req: NextRequest) {
  const { ids } = schema.parse(await req.json());
  const r = await prisma.lancamento.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ excluidos: r.count });
}
