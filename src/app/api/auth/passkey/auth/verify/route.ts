import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { resolverRp, consumirChallenge, emitirCookieAuth } from "@/lib/passkey";
import { opcoesCookieSessao } from "@/lib/cookie";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { challengeId, response } = body;

  const challenge = await consumirChallenge(challengeId, "auth");
  if (!challenge) return new NextResponse("Challenge expirado", { status: 400 });

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response.id },
  });
  if (!passkey) return new NextResponse("Credencial não conhecida", { status: 400 });

  const { rpId, origin } = await resolverRp(req.headers.get("origin"));

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(passkey.publicKey),
      counter: Number(passkey.counter),
      transports: passkey.transports ? (JSON.parse(passkey.transports) as any[]) : undefined,
    },
  });

  if (!verification.verified) {
    return new NextResponse("Verificação falhou", { status: 401 });
  }

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      ultimoUsoEm: new Date(),
    },
  });

  // Emite cookie de sessão
  const cfg = await prisma.configuracao.findFirst();
  const versao = cfg?.authVersion ?? 1;
  const cookieValor = emitirCookieAuth(versao);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("fundos_auth", cookieValor, opcoesCookieSessao(req));
  return res;
}
