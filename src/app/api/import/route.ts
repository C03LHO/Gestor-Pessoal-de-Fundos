import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Importa um JSON gerado por /api/export. CUIDADO: substitui dados existentes.
 * Faz upsert por id quando possível. Não deleta nada.
 */
export async function POST(req: NextRequest) {
  const json: any = await req.json();
  if (json?.versao !== 1) return new NextResponse("Formato não suportado", { status: 400 });

  let imp = { carteiras: 0, ativos: 0, lancamentos: 0, cotacoes: 0 };

  for (const c of json.carteiras ?? []) {
    await prisma.carteira.upsert({
      where: { id: c.id },
      create: { id: c.id, nome: c.nome, cor: c.cor, criadaEm: new Date(c.criadaEm) },
      update: { nome: c.nome, cor: c.cor },
    });
    imp.carteiras++;
  }

  for (const a of json.ativos ?? []) {
    await prisma.ativo.upsert({
      where: { id: a.id },
      create: {
        id: a.id, ticker: a.ticker, nome: a.nome, segmento: a.segmento,
        precoAtual: a.precoAtual,
        atualizadoEm: a.atualizadoEm ? new Date(a.atualizadoEm) : null,
        criadoEm: new Date(a.criadoEm),
      },
      update: { ticker: a.ticker, nome: a.nome, segmento: a.segmento, precoAtual: a.precoAtual },
    });
    imp.ativos++;
  }

  for (const l of json.lancamentos ?? []) {
    await prisma.lancamento.upsert({
      where: { id: l.id },
      create: {
        id: l.id, tipo: l.tipo, data: new Date(l.data),
        ativoId: l.ativoId, carteiraId: l.carteiraId,
        quantidade: l.quantidade, precoUnit: l.precoUnit,
        valorTotal: l.valorTotal, observacao: l.observacao,
        criadoEm: new Date(l.criadoEm),
      },
      update: { valorTotal: l.valorTotal, observacao: l.observacao },
    });
    imp.lancamentos++;
  }

  if (json.meta) {
    await prisma.meta.upsert({
      where: { id: json.meta.id },
      create: {
        id: json.meta.id,
        rendaMensalAlvo: json.meta.rendaMensalAlvo,
        aporteMensal: json.meta.aporteMensal,
        ativa: json.meta.ativa,
        criadaEm: new Date(json.meta.criadaEm),
      },
      update: {
        rendaMensalAlvo: json.meta.rendaMensalAlvo,
        aporteMensal: json.meta.aporteMensal,
        ativa: json.meta.ativa,
      },
    });
  }

  return NextResponse.json({ ok: true, importados: imp });
}
