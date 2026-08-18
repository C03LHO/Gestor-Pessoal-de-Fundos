import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";

export const dynamic = "force-dynamic";

/**
 * Remove DIVIDENDOs duplicados no mesmo mês para o mesmo ativo.
 * Yahoo (ex-date) e Fundamentus (data de pagamento) gravavam duas linhas
 * para a mesma distribuição. Mantém a mais antiga (geralmente o ex-date).
 *
 * IMPORTANTE: só remove linhas com o MESMO valorTotal. Dois pagamentos no mesmo
 * mês (rendimento + extra) são legítimos e têm valores diferentes — apagá-los
 * destruiria provento real. A sync passou a suportar esse caso, então o critério
 * de "mesmo mês" sozinho deixou de ser seguro como sinal de duplicata.
 *
 * POST /api/debug/dedup-dividendos
 */
export async function POST() {
  const carteiraId = await getCarteiraAtivaId();

  const divs = await prisma.lancamento.findMany({
    where: { tipo: "DIVIDENDO", carteiraId },
    orderBy: { data: "asc" },
  });

  // Chave inclui o valor: mesma distribuição gravada duas vezes tem o mesmo
  // valorTotal; pagamentos distintos do mesmo mês não têm.
  const visto = new Map<string, string>(); // chave -> id que fica
  const aRemover: string[] = [];

  for (const d of divs) {
    if (!d.ativoId) continue;
    const mes = d.data.toISOString().slice(0, 7);
    const chave = `${d.ativoId}|${mes}|${d.valorTotal.toFixed(2)}`;
    if (visto.has(chave)) {
      aRemover.push(d.id);
    } else {
      visto.set(chave, d.id);
    }
  }

  if (aRemover.length === 0) {
    return NextResponse.json({ removidos: 0, mantidos: visto.size });
  }

  const r = await prisma.lancamento.deleteMany({
    where: { id: { in: aRemover } },
  });

  return NextResponse.json({
    removidos: r.count,
    mantidos: visto.size,
    carteiraId,
  });
}

export async function GET() {
  const carteiraId = await getCarteiraAtivaId();
  const divs = await prisma.lancamento.findMany({
    where: { tipo: "DIVIDENDO", carteiraId },
    select: { ativoId: true, data: true, valorTotal: true },
  });
  // Mesmo critério do POST, para o diagnóstico não prometer remoção que não ocorre.
  const contagem = new Map<string, number>();
  const mesmoMes = new Map<string, number>();
  for (const d of divs) {
    if (!d.ativoId) continue;
    const mes = d.data.toISOString().slice(0, 7);
    const k = `${d.ativoId}|${mes}|${d.valorTotal.toFixed(2)}`;
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
    mesmoMes.set(`${d.ativoId}|${mes}`, (mesmoMes.get(`${d.ativoId}|${mes}`) ?? 0) + 1);
  }
  const duplicados = [...contagem.values()].filter((n) => n > 1).length;
  // Informativo: colisões de mês com valores diferentes são pagamentos legítimos.
  const multiplosNoMes = [...mesmoMes.values()].filter((n) => n > 1).length;
  return NextResponse.json({
    duplicados,
    multiplosNoMes,
    legitimosNoMes: Math.max(0, multiplosNoMes - duplicados),
    total: divs.length,
  });
}
