/**
 * Stooq — fonte de cotações sem token, gratuita.
 * Útil como fallback quando o Yahoo falhar.
 *
 * Formato URL: https://stooq.com/q/l/?s=hglg11.sa&f=sd2t2ohlcv&h&e=csv
 * Retorna CSV. Para FIIs brasileiros, sufixo `.sa` (mesmo do Yahoo).
 */
import type { CotacaoYahoo } from "./yahoo";

const UA = "Mozilla/5.0 (compatible; FundosApp/1.0)";

export async function buscarCotacaoStooq(ticker: string): Promise<CotacaoYahoo | null> {
  const t = ticker.toLowerCase().replace(/\.sa$/, "") + ".sa";
  const url = `https://stooq.com/q/l/?s=${t}&f=sd2t2ohlcv&h&e=csv`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!r.ok) return null;
    const csv = await r.text();
    const linhas = csv.trim().split(/\r?\n/);
    if (linhas.length < 2) return null;
    const valores = linhas[1].split(",");
    const close = parseFloat(valores[6]);
    if (!isFinite(close) || close <= 0) return null;
    return {
      ticker: ticker.toUpperCase(),
      preco: close,
      nome: null,
      moeda: "BRL",
    };
  } catch {
    return null;
  }
}
