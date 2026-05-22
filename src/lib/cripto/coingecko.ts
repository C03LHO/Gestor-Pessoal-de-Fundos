import { prisma } from "@/lib/prisma";
import { fetchTimeout } from "@/lib/mercado/fetch-timeout";
import { CRYPTO_ASSETS } from "./constants";

const BASE = "https://api.coingecko.com/api/v3";

const PRICE_TTL_MS = 5 * 60 * 1000;       // 5 min
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000; // 1 dia

export type PrecoCripto = {
  cryptoId: string;
  precoBrl: number;
  precoUsd: number | null;
  variacao24h: number | null; // %
  volume24hBrl: number | null;
  atualizadoEm: Date;
  offline: boolean; // true se veio só do cache (API falhou)
};

export type HistoricoCripto = {
  cryptoId: string;
  moeda: string;
  pontos: { t: number; p: number }[];
  atualizadoEm: Date;
  offline: boolean;
};

/**
 * Busca preços dos 4 ativos em uma única chamada. Persiste no cache.
 * Se a API falhar, devolve o último cache com offline=true.
 */
export async function getPrecos(): Promise<PrecoCripto[]> {
  // Se o cache de TODOS está fresco (< PRICE_TTL_MS), devolve sem chamar a API.
  // Evita rate-limit no CoinGecko free tier.
  const cacheAtual = await prisma.cryptoPriceCache.findMany();
  const agoraTs = Date.now();
  const todosFrescos =
    cacheAtual.length === CRYPTO_ASSETS.length &&
    cacheAtual.every((c) => agoraTs - c.atualizadoEm.getTime() < PRICE_TTL_MS);
  if (todosFrescos) {
    return CRYPTO_ASSETS.map((a) => {
      const c = cacheAtual.find((x) => x.cryptoId === a.id)!;
      return {
        cryptoId: a.id,
        precoBrl: c.precoBrl,
        precoUsd: c.precoUsd,
        variacao24h: c.variacao24h,
        volume24hBrl: null, // volume não persistido entre chamadas (TTL curto basta)
        atualizadoEm: c.atualizadoEm,
        offline: false,
      };
    });
  }

  const ids = CRYPTO_ASSETS.map((a) => a.coingeckoId).join(",");
  const url = `${BASE}/simple/price?ids=${ids}&vs_currencies=brl,usd&include_24hr_change=true&include_24hr_vol=true`;

  try {
    const r = await fetchTimeout(url, {}, 7000);
    if (!r.ok) throw new Error(`coingecko ${r.status}`);
    const data = (await r.json()) as Record<
      string,
      { brl?: number; usd?: number; brl_24h_change?: number; brl_24h_vol?: number }
    >;
    const agora = new Date();
    const resultado: PrecoCripto[] = [];
    for (const a of CRYPTO_ASSETS) {
      const d = data[a.coingeckoId];
      if (!d || typeof d.brl !== "number") {
        const cache = await prisma.cryptoPriceCache.findUnique({ where: { cryptoId: a.id } });
        if (cache) {
          resultado.push({
            cryptoId: a.id,
            precoBrl: cache.precoBrl,
            precoUsd: cache.precoUsd,
            variacao24h: cache.variacao24h,
            volume24hBrl: null,
            atualizadoEm: cache.atualizadoEm,
            offline: true,
          });
        }
        continue;
      }
      await prisma.cryptoPriceCache.upsert({
        where: { cryptoId: a.id },
        create: {
          cryptoId: a.id,
          precoBrl: d.brl,
          precoUsd: d.usd ?? null,
          variacao24h: d.brl_24h_change ?? null,
          atualizadoEm: agora,
        },
        update: {
          precoBrl: d.brl,
          precoUsd: d.usd ?? null,
          variacao24h: d.brl_24h_change ?? null,
          atualizadoEm: agora,
        },
      });
      resultado.push({
        cryptoId: a.id,
        precoBrl: d.brl,
        precoUsd: d.usd ?? null,
        variacao24h: d.brl_24h_change ?? null,
        volume24hBrl: d.brl_24h_vol ?? null,
        atualizadoEm: agora,
        offline: false,
      });
    }
    return resultado;
  } catch {
    // Fallback total: devolve último cache disponível
    const todos = await prisma.cryptoPriceCache.findMany();
    return CRYPTO_ASSETS.map((a) => {
      const c = todos.find((x) => x.cryptoId === a.id);
      return c
        ? {
            cryptoId: a.id,
            precoBrl: c.precoBrl,
            precoUsd: c.precoUsd,
            variacao24h: c.variacao24h,
            volume24hBrl: null,
            atualizadoEm: c.atualizadoEm,
            offline: true,
          }
        : {
            cryptoId: a.id,
            precoBrl: 0,
            precoUsd: null,
            variacao24h: null,
            volume24hBrl: null,
            atualizadoEm: new Date(0),
            offline: true,
          };
    });
  }
}

/**
 * Calcula variação % entre o último ponto e o ponto N dias atrás.
 * Retorna null se histórico não tiver pontos antigos suficientes.
 */
export function variacaoNDias(pontos: { t: number; p: number }[], dias: number): number | null {
  if (!pontos || pontos.length < 2) return null;
  const fim = pontos[pontos.length - 1];
  const alvoT = fim.t - dias * 86400000;
  let ref: { t: number; p: number } | null = null;
  for (const pt of pontos) {
    if (pt.t <= alvoT) ref = pt;
    else break;
  }
  if (!ref || ref.p === 0) return null;
  return ((fim.p - ref.p) / ref.p) * 100;
}

/**
 * Histórico de preços (até 1 ano por padrão) com cache de 24h.
 * Retorna pontos [{t,p}] ordenados por tempo (ms epoch).
 */
export async function getHistorico(cryptoId: string, dias = 365): Promise<HistoricoCripto> {
  const a = CRYPTO_ASSETS.find((x) => x.id === cryptoId);
  if (!a) {
    return { cryptoId, moeda: "brl", pontos: [], atualizadoEm: new Date(0), offline: true };
  }

  const cache = await prisma.cryptoHistoryCache.findUnique({ where: { cryptoId } });
  const agora = Date.now();
  const cacheFresco =
    cache && agora - cache.atualizadoEm.getTime() < HISTORY_TTL_MS;

  if (cacheFresco) {
    return {
      cryptoId,
      moeda: cache!.moeda,
      pontos: JSON.parse(cache!.pontosJson),
      atualizadoEm: cache!.atualizadoEm,
      offline: false,
    };
  }

  const url = `${BASE}/coins/${a.coingeckoId}/market_chart?vs_currency=brl&days=${dias}`;
  try {
    const r = await fetchTimeout(url, {}, 10000);
    if (!r.ok) throw new Error(`coingecko hist ${r.status}`);
    const data = (await r.json()) as { prices?: [number, number][] };
    const pontos = (data.prices ?? []).map(([t, p]) => ({ t, p }));
    if (pontos.length === 0) throw new Error("histórico vazio");

    const atualizadoEm = new Date();
    await prisma.cryptoHistoryCache.upsert({
      where: { cryptoId },
      create: {
        cryptoId,
        moeda: "brl",
        pontosJson: JSON.stringify(pontos),
        atualizadoEm,
      },
      update: {
        moeda: "brl",
        pontosJson: JSON.stringify(pontos),
        atualizadoEm,
      },
    });
    return { cryptoId, moeda: "brl", pontos, atualizadoEm, offline: false };
  } catch {
    if (cache) {
      return {
        cryptoId,
        moeda: cache.moeda,
        pontos: JSON.parse(cache.pontosJson),
        atualizadoEm: cache.atualizadoEm,
        offline: true,
      };
    }
    return { cryptoId, moeda: "brl", pontos: [], atualizadoEm: new Date(0), offline: true };
  }
}

export async function getHistoricoTodos(dias = 365): Promise<HistoricoCripto[]> {
  const out: HistoricoCripto[] = [];
  for (const a of CRYPTO_ASSETS) {
    out.push(await getHistorico(a.id, dias));
  }
  return out;
}
