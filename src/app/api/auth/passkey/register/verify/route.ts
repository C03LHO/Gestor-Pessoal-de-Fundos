import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { resolverRp, consumirChallenge } from "@/lib/passkey";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { challengeId, response, rotulo } = body;

  const challenge = await consumirChallenge(challengeId, "register");
  if (!challenge) return new NextResponse("Challenge expirado", { status: 400 });

  const { rpId, origin } = await resolverRp(req.headers.get("origin"));

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return new NextResponse("Falha na verificação", { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  await prisma.passkey.create({
    data: {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: credential.transports ? JSON.stringify(credential.transports) : null,
      rotulo: rotulo ?? "Passkey",
    },
  });

  return NextResponse.json({ ok: true });
}
