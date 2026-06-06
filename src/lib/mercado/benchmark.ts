/**
 * Busca rentabilidade acumulada do IFIX (via Yahoo) e do CDI (via BCB) nos
 * últimos N meses. Devolve percentual no período.
 */

import { fetchTimeout } from "./fetch-timeout";

const UA = "Mozilla/5.0 (compatible; FundosApp/1.0)";

/**
 * Rentabilidade acumulada de um ticker do Yahoo nos últimos N meses,
 * via candles mensais. Tenta cada ticker até obter dados.
 */
async function rentabilidadeYahoo(tickers: string[], meses: number): Promise<number | null> {
  for (const t of tickers) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1mo&range=${meses + 1}mo`;
    try {
      const r = await fetchTimeout(url, { headers: { "User-Agent": UA } });
      if (!r.ok) continue;
      const j: any = await r.json();
      const closes: (number | null)[] = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
      const validos = closes.filter((c): c is number => c != null);
      if (validos.length < 2) continue;
      return validos[validos.length - 1] / validos[0] - 1;
    } catch {}
  }
  return null;
}

export async function rentabilidadeIfix(meses = 12): Promise<number | null> {
  // XFIX11 (ETF que rastreia IFIX). Yahoo não expõe ^IFIX puro.
  return rentabilidadeYahoo(["XFIX11.SA"], meses);
}

export async function rentabilidadeIbov(meses = 12): Promise<number | null> {
  // ^BVSP é o índice Ibovespa; BOVA11 como fallback (ETF que o rastreia).
  return rentabilidadeYahoo(["^BVSP", "BOVA11.SA"], meses);
}

export async function rentabilidadeBtc(meses = 12): Promise<number | null> {
  // BTC em BRL direto no Yahoo (evita rate-limit do CoinGecko).
  return rentabilidadeYahoo(["BTC-BRL"], meses);
}

export async function rentabilidadeCdi(meses = 12): Promise<number | null> {
  // Série 12 do BCB: CDI diário em %. Calcular acumulado.
  const fim = new Date();
  const ini = new Date(); ini.setMonth(ini.getMonth() - meses);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${fmt(ini)}&dataFinal=${fmt(fim)}`;
  try {
    const r = await fetchTimeout(url);
    if (!r.ok) return null;
    const dados: { data: string; valor: string }[] = await r.json();
    if (!dados.length) return null;
    let acumulado = 1;
    for (const d of dados) {
      const taxa = parseFloat(d.valor.replace(",", ".")) / 100;
      acumulado *= 1 + taxa;
    }
    return acumulado - 1;
  } catch {
    return null;
  }
}
