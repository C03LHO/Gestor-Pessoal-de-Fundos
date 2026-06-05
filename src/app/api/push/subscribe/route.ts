import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
  rotulo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      rotulo: body.rotulo,
    },
    update: { p256dh: body.keys.p256dh, auth: body.keys.auth, rotulo: body.rotulo },
  });
  return NextResponse.json({ id: sub.id });
}

export async function DELETE(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (!endpoint) return new NextResponse("endpoint obrigatório", { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return new NextResponse(null, { status: 204 });
}
