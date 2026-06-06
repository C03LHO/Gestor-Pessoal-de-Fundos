import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { toCent, toReais } from "@/lib/money";
import { eventosVenda, type LancamentoInput } from "@/lib/domain/portfolio";

/**
 * Calcula DARF mensal sobre lucro de venda de FIIs.
 * Alíquota: 20% sobre o lucro de cada operação de venda.
 * Não há isenção para FII em ganho de capital (diferente de ações).
 *
 * Query: ?ano=2026&mes=5  (default: mês atual). Isola por carteira ativa e
 * apura cada venda pela engine `eventosVenda` (mesma lógica/centavos da carteira).
 */
export async function GET(req: NextRequest) {
  const hoje = new Date();
  const ano = Number(req.nextUrl.searchParams.get("ano") ?? hoje.getFullYear());
  const mes = Number(req.nextUrl.searchParams.get("mes") ?? hoje.getMonth() + 1);

  const ini = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 1);
  const carteiraId = await getCarteiraAtivaId();

  // Ativos que tiveram venda no mês (na carteira).
  const vendasMes = await prisma.lancamento.findMany({
    where: { tipo: "VENDA", carteiraId, data: { gte: ini, lt: fim } },
    include: { ativo: true },
  });
  const ativoIds = [...new Set(vendasMes.map((v) => v.ativoId).filter((x): x is string => !!x))];
  const tickerDe = new Map(vendasMes.map((v) => [v.ativoId, v.ativo?.ticker ?? ""]));

  const detalhes: {
    data: string; ticker: string; qtd: number; valorVenda: number; pm: number; lucro: number;
  }[] = [];
  let lucroTotalCent = 0;

  for (const ativoId of ativoIds) {
    const lancs = await prisma.lancamento.findMany({
      where: { ativoId, carteiraId },
      select: { id: true, tipo: true, data: true, ativoId: true, quantidade: true, precoUnit: true, valorTotal: true },
      orderBy: { data: "asc" },
    });
    const eventos = eventosVenda(lancs as LancamentoInput[]);
    for (const e of eventos) {
      if (e.data < ini || e.data >= fim) continue;
      lucroTotalCent += toCent(e.lucro);
      detalhes.push({
        data: e.data.toLocaleDateString("pt-BR"),
        ticker: tickerDe.get(ativoId) ?? "",
        qtd: e.quantidade,
        valorVenda: e.valorVenda,
        pm: e.precoMedio,
        lucro: e.lucro,
      });
    }
  }

  detalhes.sort((a, b) => a.data.localeCompare(b.data));

  const lucroTotal = toReais(lucroTotalCent);
  const darf = lucroTotal > 0 ? Math.round(lucroTotal * 0.20 * 100) / 100 : 0;

  return NextResponse.json({
    ano, mes,
    operacoes: detalhes,
    lucroTotal,
    aliquota: 0.20,
    darf,
    obs: darf > 0
      ? "DARF deve ser paga até o último dia útil do mês seguinte. Código DARF: 6015."
      : "Sem lucro de venda no período. Nenhum DARF devido.",
  });
}
