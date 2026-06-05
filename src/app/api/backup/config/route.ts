import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  habilitado: z.boolean().optional(),
  remote: z.string().nullable().optional(),
  horario: z.number().int().min(0).max(23).optional(),
  retencaoDias: z.number().int().min(1).max(3650).optional(),
  rcloneCaminho: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const cfg = await prisma.configuracao.findFirst();
  if (!cfg) return new NextResponse("sem configuração", { status: 500 });

  const atualizado = await prisma.configuracao.update({
    where: { id: cfg.id },
    data: {
      backupHabilitado: body.habilitado,
      backupRemote: body.remote,
      backupHorario: body.horario,
      backupRetencaoDias: body.retencaoDias,
      rcloneCaminho: body.rcloneCaminho,
    },
  });
  return NextResponse.json({ ok: true, cfg: atualizado });
}
