import { NextRequest, NextResponse } from "next/server";

const CAMINHOS_PUBLICOS = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/version",
  "/sw.js",
  "/offline.html",
]);

const PREFIXOS_PUBLICOS = [
  "/_next",
  "/icon",
  "/favicon",
  "/apple-touch-icon",
  "/manifest",
];

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req: NextRequest) {
  const senha = process.env.APP_PASSWORD;
  if (!senha) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (CAMINHOS_PUBLICOS.has(pathname)) return NextResponse.next();
  if (PREFIXOS_PUBLICOS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const cookie = req.cookies.get("fundos_auth")?.value;
  if (!cookie) return redirecionarLogin(req);

  // Cookie tem 2 partes: <hash>.<v>
  const [hash, versaoCookie] = cookie.split(".");
  if (!hash || !versaoCookie) return redirecionarLogin(req);

  // Pega versão do servidor via header (definida em rota dedicada não funciona em Edge);
  // usamos uma chamada à própria API para validar a versão? Em Edge fica difícil.
  // Solução: cookie inclui versão; o middleware confia nela e a comparação real
  // acontece em uma rota pequena que chamamos por fetch interno.
  // Como isso é caro, fazemos a verificação simples aqui e o "bloqueio remoto"
  // se efetiva quando o usuário tenta acessar uma rota da API que checa versão.

  const esperadoHash = await sha256("fundos:" + senha + ":" + versaoCookie);
  if (hash !== esperadoHash) return redirecionarLogin(req);

  // Sliding refresh: renova validade do cookie em cada navegação para HTML.
  // Pula para chamadas API (não precisa renovar a cada request).
  const aceitaHtml = req.headers.get("accept")?.includes("text/html");
  if (!aceitaHtml) return NextResponse.next();

  const res = NextResponse.next();
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  res.cookies.set("fundos_auth", cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

function redirecionarLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
