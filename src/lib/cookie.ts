/**
 * Detecta se o request veio por HTTPS (origem segura).
 * Em produção via Tailscale Serve / proxy reverso, o cabeçalho `x-forwarded-proto`
 * tipicamente indica `https`. Em localhost continua HTTP normalmente.
 */
export function ehHttps(req: Request): boolean {
  const proto =
    req.headers.get("x-forwarded-proto") ??
    new URL(req.url).protocol.replace(":", "");
  return proto === "https";
}

export function opcoesCookieSessao(req: Request) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: ehHttps(req),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}
