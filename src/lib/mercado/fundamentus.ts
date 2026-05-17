/**
 * Fundamentus — fonte gratuita sem token. Scrape simples da tabela HTML.
 * Página: https://www.fundamentus.com.br/fii_proventos.php?papel=MXRF11&tipo=2
 */
import type { DividendoYahoo } from "./yahoo";
import { fetchTimeout } from "./fetch-timeout";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function parseDataPt(s: string): Date | null {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

function parseValor(s: string): number {
  const n = parseFloat(s.trim().replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function decodificarHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}

/**
 * Extrai as células de cada linha da tabela com regex simples.
 * Formato típico do Fundamentus para FII proventos:
 *   <tr><td><span class="...">DD/MM/YYYY</span></td>     ← data com
 *       <td>Tipo</td>
 *       <td>DD/MM/YYYY</td>                              ← data pagamento
 *       <td>X,XX</td></tr>                               ← valor
 */
export async function buscarDividendosFundamentus(ticker: string): Promise<DividendoYahoo[]> {
  const t = ticker.toUpperCase().replace(/\.SA$/, "");
  const url = `https://www.fundamentus.com.br/fii_proventos.php?papel=${t}&tipo=2`;
  const r = await fetchTimeout(url, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
  });
  if (!r.ok) throw new Error(`Fundamentus HTTP ${r.status}`);
  const html = decodificarHtml(await r.text());
  if (!html.includes("Proventos")) throw new Error("Fundamentus retornou página inesperada");

    const divs: DividendoYahoo[] = [];
    // Pega cada <tr> dentro do tbody. Quatro <td> por linha.
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let trMatch: RegExpExecArray | null;
    while ((trMatch = trRegex.exec(html)) !== null) {
      const conteudo = trMatch[1];
      const tds: string[] = [];
      let tdMatch: RegExpExecArray | null;
      while ((tdMatch = tdRegex.exec(conteudo)) !== null) {
        // remove tags internas
        const txt = tdMatch[1].replace(/<[^>]+>/g, "").trim();
        tds.push(txt);
      }
      if (tds.length < 4) continue;

      // Usa a data de PAGAMENTO (3ª coluna) se válida, senão data-com (1ª)
      const dataPag = parseDataPt(tds[2]);
      const dataCom = parseDataPt(tds[0]);
      const data = dataPag ?? dataCom;
      const valor = parseValor(tds[3]);
      if (!data || valor <= 0) continue;
      divs.push({ data, valor });
    }
  return divs.sort((a, b) => +a.data - +b.data);
}
