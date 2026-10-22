import { NextRequest, NextResponse } from "next/server";
import { redirecionar } from "@/lib/redirect";

export async function POST(req: NextRequest) {
  const res = redirecionar("/login");
  res.cookies.delete("fundos_auth");
  return res;
}
