/**
 * Busca rentabilidade acumulada do IFIX (via Yahoo) e do CDI (via BCB) nos
 * últimos N meses. Devolve percentual no período.
 */

import { fetchTimeout } from "./fetch-timeout";

const UA = "Mozilla/5.0 (compatible; FundosApp/1.0)";

export async function rentabilidadeIfix(meses = 12): Promise<number | null> {
  // XFIX11 (ETF que rastreia IFIX) e BOVA11 como fallback. Yahoo não expõe ^IFIX puro.
  const tickers = ["XFIX11.SA"];
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
