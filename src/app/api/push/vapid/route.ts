import { NextResponse } from "next/server";
import { garantirVapid } from "@/lib/push";

export const runtime = "nodejs";

export async function GET() {
  const { vapidPublicKey } = await garantirVapid();
  return NextResponse.json({ vapidPublicKey });
}
