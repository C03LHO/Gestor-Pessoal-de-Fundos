import { prisma } from "./prisma";
import crypto from "node:crypto";

/**
 * Resolve RP (Relying Party) com base na configuração ou na origem
 * da requisição. Para WebAuthn funcionar:
 * - origin deve ser http://localhost OU https://*
 * - rpId deve ser o hostname (sem porta nem esquema)
 */
export async function resolverRp(origemHeader: string | null): Promise<{
  rpId: string; rpName: string; origin: string;
}> {
  const cfg = await prisma.configuracao.findFirst();
  // Se configuração tem origem definida, usa ela
  if (cfg?.rpOrigin) {
    return {
      rpId: cfg.rpId,
      rpName: cfg.rpName ?? "Fundos",
      origin: cfg.rpOrigin,
    };
  }
  // Inferir do header Origin do request
  const origin = origemHeader ?? "http://localhost:3000";
  const url = new URL(origin);
  return {
    rpId: url.hostname,
    rpName: cfg?.rpName ?? "Fundos",
    origin,
  };
}

export async function salvarChallenge(challenge: string, proposito: "register" | "auth") {
  const expiraEm = new Date(Date.now() + 5 * 60_000);
  return prisma.challengeAuth.create({ data: { challenge, proposito, expiraEm } });
}

export async function consumirChallenge(id: string, proposito: "register" | "auth"): Promise<string | null> {
  const c = await prisma.challengeAuth.findUnique({ where: { id } });
  if (!c || c.proposito !== proposito || c.expiraEm < new Date()) return null;
  await prisma.challengeAuth.delete({ where: { id } }).catch(() => {});
  return c.challenge;
}

export function emitirCookieAuth(versao: number) {
  const senha = process.env.APP_PASSWORD ?? "";
  const hash = crypto.createHash("sha256").update("fundos:" + senha + ":" + versao).digest("hex");
  return `${hash}.${versao}`;
}
