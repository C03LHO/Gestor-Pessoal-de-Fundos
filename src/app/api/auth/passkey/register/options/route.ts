import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { resolverRp, salvarChallenge } from "@/lib/passkey";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { rpId, rpName } = await resolverRp(req.headers.get("origin"));
  const existentes = await prisma.passkey.findMany({
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userID: new Uint8Array(Buffer.from("fundos-user", "utf-8")),
    userName: "fundos",
    userDisplayName: "Fundos",
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: existentes.map((c) => ({
      id: c.credentialId,
      transports: c.transports ? (JSON.parse(c.transports) as any[]) : undefined,
    })),
  });

  const ch = await salvarChallenge(options.challenge, "register");
  return NextResponse.json({ ...options, challengeId: ch.id });
}
