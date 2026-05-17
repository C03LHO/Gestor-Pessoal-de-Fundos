import { NextResponse } from "next/server";
import { executarBackup } from "@/lib/backup";

export const runtime = "nodejs";

export async function POST() {
  const r = await executarBackup();
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
