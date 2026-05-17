/**
 * Twelve Data — 800 requests/dia grátis com cadastro em twelvedata.com.
 * Útil como segunda opção redundante ao Yahoo/Brapi.
 */
import type { CotacaoYahoo } from "./yahoo";
import { fetchTimeout } from "./fetch-timeout";

export async function buscarCotacaoTwelveData(
  ticker: string, apiKey: string,
): Promise<CotacaoYahoo | null> {
  const sym = ticker.toUpperCase().endsWith(".SA") ? ticker : `${ticker.toUpperCase()}.SA`;
  // Stock SA na Twelve Data usa o sufixo .SAO (B3). Tenta os dois.
  const variantes = [sym, sym.replace(".SA", ".SAO")];
  for (const s of variantes) {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(s)}&apikey=${apiKey}`;
    try {
      const r = await fetchTimeout(url);
      if (!r.ok) continue;
      const j: any = await r.json();
      const preco = parseFloat(j?.price);
      if (!isFinite(preco) || preco <= 0) continue;
      return { ticker: ticker.toUpperCase(), preco, nome: null, moeda: "BRL" };
    } catch {}
  }
  return null;
}
