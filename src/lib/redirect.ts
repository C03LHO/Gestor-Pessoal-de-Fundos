import { NextResponse } from "next/server";

/**
 * Redirect 303 com Location relativa.
 *
 * Em route handlers, `req.url` reflete o bind do servidor (`0.0.0.0:3000`
 * no container), não o endereço que o navegador usou — redirecionar para
 * `new URL(path, req.url)` mandava o usuário para http://0.0.0.0:3000 e
 * quebrava o login via Tailscale/IP. Location relativa é resolvida pelo
 * navegador contra a URL atual.
 */
export function redirecionar(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}
