import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api";

const schema = z.object({ ids: z.array(z.string()).min(1) });

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const { ids } = parsed.data;
  const r = await prisma.lancamento.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ excluidos: r.count });
}
