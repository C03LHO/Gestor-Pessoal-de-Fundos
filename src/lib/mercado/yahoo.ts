/**
 * Integração simples com Yahoo Finance.
 * Não exige token. Para FIIs brasileiros, sufixo .SA.
 */

const UA = "Mozilla/5.0 (compatible; FundosApp/1.0)";

export type CotacaoYahoo = {
  ticker: string;
  preco: number;
  nome: string | null;
  moeda: string;
};

export type DividendoYahoo = {
  data: Date;
  valor: number;
};

const sufixar = (t: string) => (t.includes(".") ? t : `${t}.SA`);

export async function buscarCotacao(ticker: string): Promise<CotacaoYahoo | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sufixar(ticker)}?interval=1d`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!r.ok) return null;
  const j: any = await r.json();
  const meta = j?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return null;
  return {
    ticker: ticker.toUpperCase(),
    preco: meta.regularMarketPrice,
    nome: meta.longName ?? meta.shortName ?? null,
    moeda: meta.currency ?? "BRL",
  };
}

export async function buscarDividendos(ticker: string, anos = 5): Promise<DividendoYahoo[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sufixar(ticker)}?interval=1mo&range=${anos}y&events=div`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!r.ok) return [];
  const j: any = await r.json();
  const divs = j?.chart?.result?.[0]?.events?.dividends;
  if (!divs) return [];
  return Object.values<any>(divs).map((d) => ({
    data: new Date(d.date * 1000),
    valor: d.amount,
  }));
}

export async function buscarVarias(tickers: string[]) {
  const resultados = await Promise.allSettled(tickers.map(buscarCotacao));
  return resultados
    .map((r, i) => (r.status === "fulfilled" ? r.value : null))
    .filter((x): x is CotacaoYahoo => x !== null);
}

export type Historico52s = {
  ticker: string;
  precoAtual: number;
  max: number;
  min: number;
  mediana: number;
  precos: number[];
};

import { CacheLRU } from "../cache";

const cacheHistorico = new CacheLRU<Historico52s>({
  max: 200,
  ttlMs: 60 * 60 * 1000,
  arquivo: process.env.NODE_ENV === "production"
    ? "/app/data/cache-historico.json"
    : "./.cache-historico.json",
});

// Série histórica com período configurável (para gráficos)
export type SerieHistorica = {
  ticker: string;
  intervalo: string;
  range: string;
  precoAtual: number;
  variacao: number; // (atual - primeiro) / primeiro
  pontos: { t: number; p: number }[];
};

const cacheSerie = new CacheLRU<SerieHistorica>({
  max: 200,
  ttlMs: 10 * 60 * 1000,
  arquivo: process.env.NODE_ENV === "production"
    ? "/app/data/cache-serie.json"
    : "./.cache-serie.json",
});

const RANGE_INTERVAL: Record<string, { interval: string; range: string }> = {
  "1d":  { interval: "5m",  range: "1d"  },
  "5d":  { interval: "30m", range: "5d"  },
  "1mo": { interval: "1d",  range: "1mo" },
  "6mo": { interval: "1d",  range: "6mo" },
  "1y":  { interval: "1d",  range: "1y"  },
};

/**
 * Busca o preço de fechamento na data específica (ou pregão mais próximo).
 */
export async function buscarPrecoNaData(
  ticker: string, dataISO: string,
): Promise<{ preco: number; data: string } | null> {
  const d = new Date(dataISO + "T12:00:00");
  const inicio = Math.floor((d.getTime() - 10 * 86400 * 1000) / 1000);
  const fim    = Math.floor((d.getTime() + 5  * 86400 * 1000) / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sufixar(ticker.toUpperCase())}?period1=${inicio}&period2=${fim}&interval=1d`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!r.ok) return null;
    const j: any = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return null;
    const stamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const alvoMs = d.getTime();
    let melhorIdx = -1, melhorDiff = Infinity;
    for (let i = 0; i < stamps.length; i++) {
      if (closes[i] == null || closes[i]! <= 0) continue;
      const diff = Math.abs(stamps[i] * 1000 - alvoMs);
      if (diff < melhorDiff) { melhorDiff = diff; melhorIdx = i; }
    }
    if (melhorIdx < 0) return null;
    return {
      preco: closes[melhorIdx]!,
      data: new Date(stamps[melhorIdx] * 1000).toISOString().slice(0, 10),
    };
  } catch {
    return null;
  }
}

export async function buscarSerieHistorica(
  ticker: string,
  rangeId: string,
): Promise<SerieHistorica | null> {
  const cfg = RANGE_INTERVAL[rangeId] ?? RANGE_INTERVAL["1mo"];
  const chave = `${ticker.toUpperCase()}|${rangeId}`;
  const cached = cacheSerie.get(chave);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sufixar(ticker.toUpperCase())}?interval=${cfg.interval}&range=${cfg.range}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!r.ok) return null;
    const j: any = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const precoAtual = result.meta?.regularMarketPrice ?? null;
    if (!precoAtual || timestamps.length === 0) return null;

    const pontos = timestamps
      .map((t, i) => ({ t: t * 1000, p: closes[i] }))
      .filter((x): x is { t: number; p: number } => x.p != null && x.p > 0);
    if (pontos.length < 2) return null;

    const primeiro = pontos[0].p;
    const variacao = (precoAtual - primeiro) / primeiro;

    const out: SerieHistorica = {
      ticker: ticker.toUpperCase(),
      intervalo: cfg.interval,
      range: cfg.range,
      precoAtual,
      variacao,
      pontos,
    };
    cacheSerie.set(chave, out);
    return out;
  } catch {
    return null;
  }
}

export async function buscarHistorico52s(ticker: string): Promise<Historico52s | null> {
  const chave = ticker.toUpperCase();
  const cached = cacheHistorico.get(chave);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sufixar(chave)}?interval=1d&range=1y`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!r.ok) return null;
  const j: any = await r.json();
  const closes: (number | null)[] = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  const precoAtual = j?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  const validos = closes.filter((c): c is number => c != null && c > 0);
  if (!precoAtual || validos.length < 30) return null;

  const ordenados = [...validos].sort((a, b) => a - b);
  const out: Historico52s = {
    ticker: chave,
    precoAtual,
    max: Math.max(...validos),
    min: Math.min(...validos),
    mediana: ordenados[Math.floor(ordenados.length / 2)],
    precos: validos,
  };
  cacheHistorico.set(chave, out);
  return out;
}
