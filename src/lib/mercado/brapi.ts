/**
 * Brapi como fonte alternativa de cotações.
 * Requer token grátis em https://brapi.dev (cadastro de 30s).
 */
import type { CotacaoYahoo } from "./yahoo";

export async function buscarCotacaoBrapi(ticker: string, token: string): Promise<CotacaoYahoo | null> {
  const url = `https://brapi.dev/api/quote/${ticker}?token=${encodeURIComponent(token)}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const j: any = await r.json();
    const x = j?.results?.[0];
    if (!x?.regularMarketPrice) return null;
    return {
      ticker: ticker.toUpperCase(),
      preco: x.regularMarketPrice,
      nome: x.longName ?? x.shortName ?? null,
      moeda: x.currency ?? "BRL",
    };
  } catch {
    return null;
  }
}
