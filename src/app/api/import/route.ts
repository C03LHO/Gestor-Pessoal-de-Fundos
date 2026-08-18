import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * Importa um JSON gerado por /api/export. Faz upsert por id e NÃO deleta nada.
 *
 * Restaura dado do usuário: carteiras (com o tipo FII/CRIPTO), ativos (com as
 * notas/tese), lançamentos, meta, cotações, transações de cripto e watchlist.
 *
 * NÃO restaura `configuracao` de propósito: ela carrega authVersion, rpId e as
 * chaves VAPID, e sobrescrever isso durante uma sessão ativa derruba o login e
 * o push do dispositivo. Para restauração literal, inclusive configuração, o
 * caminho é /api/backup/importar, que troca o banco inteiro.
 *
 * Aceita versao 1 (sem cripto/watchlist) e 2.
 */
export async function POST(req: NextRequest) {
  let json: any;
  try {
    json = await req.json();
  } catch {
    return new NextResponse("JSON inválido", { status: 400 });
  }

  if (json?.versao !== 1 && json?.versao !== 2) {
    return new NextResponse("Formato não suportado", { status: 400 });
  }

  const imp = {
    carteiras: 0, ativos: 0, lancamentos: 0, cotacoes: 0,
    cryptoTransactions: 0, watchlist: 0, meta: 0,
  };

  for (const c of json.carteiras ?? []) {
    await prisma.carteira.upsert({
      where: { id: c.id },
      // `tipo` decide se a carteira é FII ou CRIPTO. Sem ele toda carteira de
      // cripto voltava como FII e a navegação inteira mudava.
      create: { id: c.id, nome: c.nome, cor: c.cor, tipo: c.tipo ?? "FII", criadaEm: new Date(c.criadaEm) },
      update: { nome: c.nome, cor: c.cor, tipo: c.tipo ?? undefined },
    });
    imp.carteiras++;
  }

  for (const a of json.ativos ?? []) {
    const campos = {
      ticker: a.ticker, nome: a.nome, segmento: a.segmento,
      precoAtual: a.precoAtual,
      notas: a.notas ?? null, // tese de investimento: se perdia no restore
    };
    await prisma.ativo.upsert({
      where: { id: a.id },
      create: {
        id: a.id, ...campos,
        atualizadoEm: a.atualizadoEm ? new Date(a.atualizadoEm) : null,
        criadoEm: new Date(a.criadoEm),
      },
      update: campos,
    });
    imp.ativos++;
  }

  for (const l of json.lancamentos ?? []) {
    const campos = {
      tipo: l.tipo, data: new Date(l.data),
      ativoId: l.ativoId, carteiraId: l.carteiraId,
      quantidade: l.quantidade, precoUnit: l.precoUnit,
      valorTotal: l.valorTotal, observacao: l.observacao,
    };
    await prisma.lancamento.upsert({
      where: { id: l.id },
      create: { id: l.id, ...campos, criadoEm: new Date(l.criadoEm) },
      update: campos,
    });
    imp.lancamentos++;
  }

  for (const t of json.cryptoTransactions ?? []) {
    const campos = {
      tipo: t.tipo, data: new Date(t.data), cryptoId: t.cryptoId,
      carteiraId: t.carteiraId, quantidade: t.quantidade,
      precoUnit: t.precoUnit, valorTotal: t.valorTotal, observacao: t.observacao,
    };
    await prisma.cryptoTransaction.upsert({
      where: { id: t.id },
      create: { id: t.id, ...campos, criadoEm: new Date(t.criadoEm) },
      update: campos,
    });
    imp.cryptoTransactions++;
  }

  for (const w of json.watchlist ?? []) {
    const campos = {
      ticker: w.ticker, metaInvestimento: w.metaInvestimento, metaTipo: w.metaTipo,
      metaCotas: w.metaCotas, ordem: w.ordem, notas: w.notas,
    };
    await prisma.watchlistAtivo.upsert({
      where: { id: w.id },
      create: { id: w.id, ...campos, criadoEm: new Date(w.criadoEm) },
      update: campos,
    });
    imp.watchlist++;
  }

  // Cotações eram exportadas e nunca importadas — o histórico de preço sumia no
  // restore. O provider SQLite não suporta skipDuplicates em createMany, então
  // os ids já presentes são filtrados antes da inserção.
  const cotacoes = (json.cotacoes ?? []).map((c: any) => ({
    id: c.id, ticker: c.ticker, preco: c.preco, data: new Date(c.data), fonte: c.fonte,
  }));
  if (cotacoes.length > 0) {
    const existentes = await prisma.cotacao.findMany({
      where: { id: { in: cotacoes.map((c: { id: string }) => c.id) } },
      select: { id: true },
    });
    const jaTem = new Set(existentes.map((e) => e.id));
    const novas = cotacoes.filter((c: { id: string }) => !jaTem.has(c.id));
    if (novas.length > 0) {
      const r = await prisma.cotacao.createMany({ data: novas });
      imp.cotacoes = r.count;
    }
  }

  if (json.meta) {
    const campos = {
      rendaMensalAlvo: json.meta.rendaMensalAlvo,
      aporteMensal: json.meta.aporteMensal,
      salarioMensal: json.meta.salarioMensal ?? 0,
      percentualAporte: json.meta.percentualAporte ?? 0.3,
      ativa: json.meta.ativa,
    };
    await prisma.meta.upsert({
      where: { id: json.meta.id },
      create: { id: json.meta.id, ...campos, criadaEm: new Date(json.meta.criadaEm) },
      update: campos,
    });
    imp.meta = 1;
  }

  log.info("import.json", { versao: json.versao, ...imp });
  return NextResponse.json({
    ok: true,
    importados: imp,
    aviso: "Configurações e chaves de API não são restauradas por este caminho. Para restauração literal use a importação do banco (.db).",
  });
}
