/**
 * Status Invest — fonte gratuita sem token para dividendos de FIIs brasileiros.
 * Usa o endpoint público de proventos que o próprio site consome.
 */
import type { DividendoYahoo } from "./yahoo";
import { fetchTimeout } from "./fetch-timeout";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const slugDe = (t: string): string => t.toLowerCase().replace(/\.sa$/, "");

function parseDataPt(s: string): Date | null {
  // formato dd/MM/yyyy
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

function parseValor(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export async function buscarDividendosStatusInvest(ticker: string): Promise<DividendoYahoo[]> {
  const t = ticker.toUpperCase().replace(/\.SA$/, "");
  const url = `https://statusinvest.com.br/fii/companytickerprovents?ticker=${t}&chartProventsType=2`;
  const r = await fetchTimeout(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `https://statusinvest.com.br/fundos-imobiliarios/${slugDe(t)}`,
    },
  });
  if (!r.ok) throw new Error(`Status Invest HTTP ${r.status}`);
  const j: any = await r.json().catch(() => null);
  if (!j) throw new Error("Status Invest retornou payload inválido");

  const candidatos: any[] =
    Array.isArray(j) ? j :
    Array.isArray(j?.assetEarningsModels) ? j.assetEarningsModels :
    Array.isArray(j?.data) ? j.data :
    [];

  const divs: DividendoYahoo[] = [];
  for (const item of candidatos) {
    const dataStr = item.pd ?? item.paymentDate ?? item.ed ?? item.exDividendDate ?? item.dataPagamento ?? item.dataCom;
    const valorBruto = item.value ?? item.amount ?? item.valor;
    const data = typeof dataStr === "string" ? parseDataPt(dataStr) : null;
    const valor = parseValor(valorBruto);
    if (!data || valor <= 0) continue;
    divs.push({ data, valor });
  }
  return divs.sort((a, b) => +a.data - +b.data);
}
