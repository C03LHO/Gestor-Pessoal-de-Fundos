import { NextResponse } from "next/server";
import { enviarParaTodos } from "@/lib/push";

export const runtime = "nodejs";

export async function POST() {
  const r = await enviarParaTodos({
    titulo: "Fundos — teste",
    corpo: "Notificação push funcionando! 💸",
    url: "/",
    tag: "teste",
  });
  return NextResponse.json(r);
}
