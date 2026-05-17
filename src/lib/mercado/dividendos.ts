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
import { fetchTimeout } from "./fetch-timeout";
import { log } from "../log";

type Fonte = "yahoo" | "statusinvest" | "fundamentus" | "brapi";

export type ResultadoDividendos = {
  divs: DividendoYahoo[];
  fonte: Fonte | "uniao" | "nenhuma";
  trace?: TraceFonte[];
};

export type TraceFonte = {
  fonte: Fonte;
  ok: boolean;
  count: number;
  erro?: string;
  ms: number;
};

async function buscarDividendosBrapi(ticker: string, token: string): Promise<DividendoYahoo[]> {
  try {
    const t = ticker.toUpperCase().replace(/\.SA$/, "");
    const url = `https://brapi.dev/api/quote/${t}?range=5y&interval=1mo&modules=dividends&token=${encodeURIComponent(token)}`;
    const r = await fetchTimeout(url, {}, 5000);
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

/**
 * Consulta TODAS as fontes em paralelo e une o resultado (dedup por dia).
 * Assim, mesmo se uma fonte trava ou está bloqueada no container, as outras
 * ainda contribuem dentro do orçamento de tempo do caller.
 */
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

  const trace: TraceFonte[] = [];
  const resultados = await Promise.allSettled(
    tentativas.map(async (t) => {
      const t0 = Date.now();
      try {
        const divs = await t.fn();
        trace.push({ fonte: t.nome, ok: true, count: divs.length, ms: Date.now() - t0 });
        return { fonte: t.nome, divs };
      } catch (e: any) {
        trace.push({ fonte: t.nome, ok: false, count: 0, erro: e?.message ?? String(e), ms: Date.now() - t0 });
        log.warn("dividendos.fonte_falhou", { ticker, fonte: t.nome, erro: e?.message });
        return { fonte: t.nome, divs: [] as DividendoYahoo[] };
      }
    }),
  );

  // Une por chave YYYY-MM-DD; mantém o primeiro valor encontrado, com prioridade
  // pela ordem das fontes (yahoo > statusinvest > fundamentus > brapi).
  const mapa = new Map<string, DividendoYahoo>();
  for (const r of resultados) {
    if (r.status !== "fulfilled") continue;
    for (const d of r.value.divs) {
      const key = d.data.toISOString().slice(0, 10);
      if (!mapa.has(key)) mapa.set(key, d);
    }
  }

  const divs = [...mapa.values()].sort((a, b) => +a.data - +b.data);
  const fontesOk = trace.filter((t) => t.ok && t.count > 0).map((t) => t.fonte);

  if (divs.length === 0) {
    log.warn("dividendos.nenhuma_fonte", { ticker, trace });
    return { divs: [], fonte: "nenhuma", trace };
  }

  const fonte: Fonte | "uniao" =
    fontesOk.length === 1 ? (fontesOk[0] as Fonte) : "uniao";
  log.info("dividendos.uniao_ok", { ticker, fonte, count: divs.length, fontesOk });
  return { divs, fonte, trace };
}
