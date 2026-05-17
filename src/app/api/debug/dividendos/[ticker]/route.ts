import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarDividendosConfigurado } from "@/lib/mercado/dividendos";
import { getCarteiraAtivaId } from "@/lib/carteira";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico do fluxo de importação de dividendos.
 * Retorna passo-a-passo TUDO que o sync veria: quais fontes responderam,
 * quantos dividendos cada uma trouxe, quantas cotas o usuário tinha em
 * cada data e o motivo de cada dividendo ter sido criado, ignorado ou
 * já existir.
 *
 * GET /api/debug/dividendos/MXRF11?anos=10
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await ctx.params;
  const anos = Number(req.nextUrl.searchParams.get("anos") ?? 10);
  const carteiraId = await getCarteiraAtivaId();

  const ativo = await prisma.ativo.findFirst({
    where: { ticker: ticker.toUpperCase() },
    include: { lancamentos: { where: { carteiraId } } },
  });
  if (!ativo) {
    return NextResponse.json({ erro: "Ativo não encontrado", ticker }, { status: 404 });
  }

  const t0 = Date.now();
  const { divs, fonte, trace } = await buscarDividendosConfigurado(ativo.ticker, anos);
  const msFontes = Date.now() - t0;

  const existentes = new Set(
    ativo.lancamentos
      .filter((l) => l.tipo === "DIVIDENDO")
      .map((l) => l.data.toISOString().slice(0, 10)),
  );

  const compras = ativo.lancamentos
    .filter((l) => ["COMPRA", "REINVESTIMENTO", "VENDA"].includes(l.tipo))
    .map((l) => ({
      tipo: l.tipo,
      data: l.data.toISOString().slice(0, 10),
      quantidade: l.quantidade,
    }))
    .sort((a, b) => (a.data < b.data ? -1 : 1));

  const linhas = divs.map((d) => {
    const key = d.data.toISOString().slice(0, 10);
    const cotas = cotasNoMomento(ativo.lancamentos, d.data);
    let status: "criaria" | "ja_existe" | "sem_cotas";
    if (existentes.has(key)) status = "ja_existe";
    else if (cotas <= 0) status = "sem_cotas";
    else status = "criaria";
    return {
      data: key,
      valorPorCota: d.valor,
      cotas,
      valorTotal: cotas > 0 ? d.valor * cotas : 0,
      status,
    };
  });

  const resumo = {
    criaria: linhas.filter((l) => l.status === "criaria").length,
    ja_existe: linhas.filter((l) => l.status === "ja_existe").length,
    sem_cotas: linhas.filter((l) => l.status === "sem_cotas").length,
  };

  return NextResponse.json({
    ticker: ativo.ticker,
    ativoId: ativo.id,
    carteiraId,
    anos,
    fonteEscolhida: fonte,
    msFontes,
    trace,
    totalDividendosFonte: divs.length,
    compras,
    dividendosExistentes: [...existentes].sort(),
    resumo,
    linhas,
  });
}

function cotasNoMomento(
  lancs: { tipo: string; data: Date; quantidade: number | null }[],
  data: Date,
): number {
  let cotas = 0;
  for (const l of lancs) {
    if (l.data > data) continue;
    if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") cotas += l.quantidade ?? 0;
    else if (l.tipo === "VENDA") cotas -= l.quantidade ?? 0;
  }
  return cotas;
}
