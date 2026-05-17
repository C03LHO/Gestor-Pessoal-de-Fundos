import { prisma } from "../prisma";
import { buscarCotacao, buscarVarias, CotacaoYahoo } from "./yahoo";
import { buscarCotacaoBrapi } from "./brapi";
import { buscarCotacaoStooq } from "./stooq";
import { buscarCotacaoTwelveData } from "./twelvedata";
import { log } from "../log";

/**
 * Roteador de cotações com fallback automático.
 *
 * Cadeia (configurável):
 * 1. Provedor preferido (definido em Configuracao.fonteCotacao)
 * 2. Yahoo (sempre disponível, sem token)
 * 3. Stooq (sem token, redundância)
 *
 * Se a primeira falhar, tenta a próxima. Loga qual fonte foi usada.
 */
export async function buscarCotacaoConfigurada(ticker: string): Promise<CotacaoYahoo | null> {
  const cfg = await prisma.configuracao.findFirst();
  const cadeia = montarCadeia(cfg);

  for (const tentativa of cadeia) {
    const r = await tentativa(ticker).catch(() => null);
    if (r) return r;
  }
  return null;
}

export async function buscarVariasConfigurada(tickers: string[]): Promise<CotacaoYahoo[]> {
  const cfg = await prisma.configuracao.findFirst();
  // Otimização: se Yahoo é a principal e não tem fallback necessário, usa batch nativo
  if (!cfg || cfg.fonteCotacao === "yahoo") {
    return buscarVarias(tickers);
  }
  // Caso contrário, paraleliza ticker a ticker passando pela cadeia
  const cadeia = montarCadeia(cfg);
  const resultados = await Promise.all(tickers.map(async (t) => {
    for (const tentativa of cadeia) {
      const r = await tentativa(t).catch(() => null);
      if (r) return r;
    }
    return null;
  }));
  return resultados.filter((x): x is CotacaoYahoo => x !== null);
}

type Tentativa = (ticker: string) => Promise<CotacaoYahoo | null>;

function montarCadeia(cfg: {
  fonteCotacao: string; brapiToken: string | null; iaApiKey: string | null;
} | null | any): Tentativa[] {
  const cadeia: Tentativa[] = [];

  // Primeiro: provedor preferido conforme configuração
  if (cfg?.fonteCotacao === "brapi" && cfg.brapiToken) {
    cadeia.push((t) => buscarCotacaoBrapi(t, cfg.brapiToken));
  }
  if (cfg?.fonteCotacao === "twelve" && cfg.twelveDataToken) {
    cadeia.push((t) => buscarCotacaoTwelveData(t, cfg.twelveDataToken));
  }

  // Yahoo é sempre uma opção (sem token, mais estável historicamente)
  cadeia.push(buscarCotacao);

  // Stooq como último recurso, também sem token
  cadeia.push(buscarCotacaoStooq);

  return cadeia;
}
