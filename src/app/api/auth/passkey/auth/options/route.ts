import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { resolverRp, salvarChallenge } from "@/lib/passkey";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { rpId } = await resolverRp(req.headers.get("origin"));
  const existentes = await prisma.passkey.findMany({
    select: { credentialId: true, transports: true },
  });

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    userVerification: "preferred",
    allowCredentials: existentes.map((c) => ({
      id: c.credentialId,
      transports: c.transports ? (JSON.parse(c.transports) as any[]) : undefined,
    })),
  });

  const ch = await salvarChallenge(options.challenge, "auth");
  return NextResponse.json({ ...options, challengeId: ch.id });
}
