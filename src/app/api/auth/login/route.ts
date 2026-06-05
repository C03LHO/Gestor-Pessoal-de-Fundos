import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { opcoesCookieSessao } from "@/lib/cookie";
import { log } from "@/lib/log";

export const runtime = "nodejs";

// Rate limit em memória: bloqueia >5 tentativas erradas em 60s da mesma origem
const tentativas = new Map<string, { count: number; ate: number }>();
function chave(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}
function bloqueado(req: NextRequest): boolean {
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
    return NextResponse.redirect(new URL("/login?erro=bloqueado", req.url), { status: 303 });
  }

  const form = await req.formData();
  const senha = form.get("password")?.toString() ?? "";
  const env = process.env.APP_PASSWORD ?? "";

  if (!senhaConfere(senha, env)) {
    registrarFalha(req);
    log.warn("auth.login.failed", { ip: chave(req) });
    return NextResponse.redirect(new URL("/login?erro=1", req.url), { status: 303 });
  }

  limparFalhas(req);

  const cfg = await prisma.configuracao.findFirst();
  const versao = cfg?.authVersion ?? 1;

  const hash = crypto.createHash("sha256").update("fundos:" + env + ":" + versao).digest("hex");
  const cookieValor = `${hash}.${versao}`;

  log.info("auth.login.ok", { ip: chave(req), versao });
  const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
  res.cookies.set("fundos_auth", cookieValor, opcoesCookieSessao(req));
  return res;
}
