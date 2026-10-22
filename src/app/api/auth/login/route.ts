import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { opcoesCookieSessao } from "@/lib/cookie";
import { log } from "@/lib/log";
import { redirecionar } from "@/lib/redirect";

export const runtime = "nodejs";

// Rate limit em memória: bloqueia >5 tentativas erradas em 60s da mesma origem.
// A "origem" vem do x-forwarded-for, que o cliente pode forjar quando não há
// proxy na frente (porta 3000 direta) — por isso há também um teto GLOBAL:
// 20 erros em 10 min travam o login para todos até a janela passar.
const LIMITE_GLOBAL = 20;
const JANELA_GLOBAL_MS = 10 * 60_000;
let falhasGlobais: { count: number; ate: number } = { count: 0, ate: 0 };

const tentativas = new Map<string, { count: number; ate: number }>();
function chave(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}
function bloqueado(req: NextRequest): boolean {
  if (Date.now() <= falhasGlobais.ate && falhasGlobais.count >= LIMITE_GLOBAL) return true;
  const k = chave(req);
  const t = tentativas.get(k);
  if (!t) return false;
  if (Date.now() > t.ate) { tentativas.delete(k); return false; }
  return t.count >= 5;
}
function registrarFalha(req: NextRequest) {
  const k = chave(req);
  const t = tentativas.get(k);
  const novo = !t || Date.now() > t.ate
    ? { count: 1, ate: Date.now() + 60_000 }
    : { count: t.count + 1, ate: t.ate };
  tentativas.set(k, novo);
  falhasGlobais = Date.now() > falhasGlobais.ate
    ? { count: 1, ate: Date.now() + JANELA_GLOBAL_MS }
    : { count: falhasGlobais.count + 1, ate: falhasGlobais.ate };
}
function limparFalhas(req: NextRequest) {
  tentativas.delete(chave(req));
}

/**
 * Comparação de senha em tempo constante. Compara digests SHA-256 (sempre 32
 * bytes) para que `timingSafeEqual` não revele o tamanho da senha nem aborte
 * por diferença de comprimento — evita timing attack na comparação.
 */
function senhaConfere(informada: string, esperada: string): boolean {
  if (!esperada) return false;
  const a = crypto.createHash("sha256").update(informada).digest();
  const b = crypto.createHash("sha256").update(esperada).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (bloqueado(req)) {
    log.warn("auth.login.rate_limited", { ip: chave(req) });
    return redirecionar("/login?erro=bloqueado");
  }

  const form = await req.formData();
  const senha = form.get("password")?.toString() ?? "";
  const env = process.env.APP_PASSWORD ?? "";

  if (!senhaConfere(senha, env)) {
    registrarFalha(req);
    log.warn("auth.login.failed", { ip: chave(req) });
    return redirecionar("/login?erro=1");
  }

  limparFalhas(req);

  const cfg = await prisma.configuracao.findFirst();
  const versao = cfg?.authVersion ?? 1;

  const hash = crypto.createHash("sha256").update("fundos:" + env + ":" + versao).digest("hex");
  const cookieValor = `${hash}.${versao}`;

  log.info("auth.login.ok", { ip: chave(req), versao });
  const res = redirecionar("/");
  res.cookies.set("fundos_auth", cookieValor, opcoesCookieSessao(req));
  return res;
}
