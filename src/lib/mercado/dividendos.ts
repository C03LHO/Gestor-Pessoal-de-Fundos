/**
 * Roteador de fontes de dividendos. Tenta cada fonte em ordem até obter
 * uma resposta com pelo menos 1 dividendo.
 *
 * Ordem padrão:
 *   1. Yahoo Finance (mais completo historicamente)
 *   2. Status Invest (sem token)
 *   3. Fundamentus (sem token)
 *   4. Brapi (se token configurado em Configuracao.brapiToken)
 */
import { prisma } from "../prisma";
import { buscarDividendos as buscarDividendosYahoo, type DividendoYahoo } from "./yahoo";
import { buscarDividendosStatusInvest } from "./statusinvest";
import { buscarDividendosFundamentus } from "./fundamentus";
import { log } from "../log";

type Fonte = "yahoo" | "statusinvest" | "fundamentus" | "brapi";

export type ResultadoDividendos = {
  divs: DividendoYahoo[];
  fonte: Fonte | "nenhuma";
};

async function buscarDividendosBrapi(ticker: string, token: string): Promise<DividendoYahoo[]> {
  try {
    const t = ticker.toUpperCase().replace(/\.SA$/, "");
    const url = `https://brapi.dev/api/quote/${t}?range=5y&interval=1mo&modules=dividends&token=${encodeURIComponent(token)}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return [];
    const j: any = await r.json();
    const cashDivs = j?.results?.[0]?.dividendsData?.cashDividends ?? [];
    const out: DividendoYahoo[] = [];
    for (const d of cashDivs) {
      const dt = new Date(d.paymentDate ?? d.lastDatePrior);
      if (isNaN(dt.getTime())) continue;
      const val = parseFloat(d.rate);
      if (!isFinite(val) || val <= 0) continue;
      out.push({ data: dt, valor: val });
    }
    return out;
  } catch {
    return [];
  }
}

export async function buscarDividendosConfigurado(
  ticker: string,
  anos = 10,
): Promise<ResultadoDividendos> {
  const cfg = await prisma.configuracao.findFirst();

  const tentativas: { nome: Fonte; fn: () => Promise<DividendoYahoo[]> }[] = [
    { nome: "yahoo",        fn: () => buscarDividendosYahoo(ticker, anos) },
    { nome: "statusinvest", fn: () => buscarDividendosStatusInvest(ticker) },
    { nome: "fundamentus",  fn: () => buscarDividendosFundamentus(ticker) },
  ];
  if (cfg?.brapiToken) {
    tentativas.push({ nome: "brapi", fn: () => buscarDividendosBrapi(ticker, cfg.brapiToken!) });
  }

  for (const t of tentativas) {
    try {
      const divs = await t.fn();
      if (divs.length > 0) {
        log.info("dividendos.fonte_ok", { ticker, fonte: t.nome, count: divs.length });
        return { divs, fonte: t.nome };
      }
    } catch (e: any) {
      log.warn("dividendos.fonte_falhou", { ticker, fonte: t.nome, erro: e?.message });
    }
  }

  log.warn("dividendos.nenhuma_fonte", { ticker });
  return { divs: [], fonte: "nenhuma" };
}
