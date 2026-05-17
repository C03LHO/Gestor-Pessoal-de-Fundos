import { NextResponse } from "next/server";
import { consultarIA } from "@/lib/ia";
import { calcularPosicoes, resumoCarteira } from "@/lib/domain/posicao";
import { calcularOportunidades } from "@/lib/domain/watchlist";
import { historicoAportes } from "@/lib/domain/historico";
import { previsaoProximoMes } from "@/lib/domain/previsao";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let pergunta = "";
  try {
    const body = await req.json();
    pergunta = body?.pergunta ?? "";
  } catch {}

  const carteiraId = await getCarteiraAtivaId();
  const [posicoes, meta, oport, hist, previsao] = await Promise.all([
    calcularPosicoes(carteiraId),
    prisma.meta.findFirst({ where: { ativa: true } }),
    calcularOportunidades(carteiraId),
    historicoAportes(12, carteiraId),
    previsaoProximoMes(carteiraId),
  ]);
  const resumo = resumoCarteira(posicoes);

  const composicao = posicoes
    .map((p) => `- ${p.ticker}: ${p.cotas} cotas, R$ ${p.valorAtual.toFixed(0)} (${((p.valorAtual / resumo.valorAtual) * 100).toFixed(1)}% da carteira), DY-12m: R$ ${p.dividendos12m.toFixed(0)}, YoC: ${(p.yieldOnCost * 100).toFixed(2)}%`)
    .join("\n");

  const oportLinha = oport
    .sort((a, b) => b.scoreOportunidade - a.scoreOportunidade)
    .slice(0, 8)
    .map((o) =>
      `- ${o.ticker}: R$ ${o.precoAtual.toFixed(2)} | ${(o.drawdown * 100).toFixed(1)}% abaixo da máxima 52s | score ${o.scoreOportunidade.toFixed(0)} | meta ${((o.investido / o.metaInvestimento) * 100).toFixed(0)}% (faltam R$ ${Math.max(0, o.metaInvestimento - o.investido).toFixed(0)})`,
    )
    .join("\n");

  const system = `Você é um assistente financeiro brasileiro especializado em FIIs e renda passiva.
Seja direto, em português, com números concretos. Use bullets. Máximo 350 palavras.
Não invente dados. Cite tickers reais quando relevante. Não dê conselho de compra/venda específico; dê insights e questões a investigar.`;

  const promptBase = `
=== Carteira atual ===
Patrimônio: R$ ${resumo.valorAtual.toFixed(0)} (investido R$ ${resumo.investido.toFixed(0)}, variação ${(((resumo.valorAtual / (resumo.investido || 1)) - 1) * 100).toFixed(1)}%)
Renda passiva 12m: R$ ${resumo.dividendos12m.toFixed(0)} (média mensal R$ ${(resumo.dividendos12m / 12).toFixed(0)})
YoC global: ${(resumo.yieldOnCost * 100).toFixed(2)}%
Aporte médio mensal real: R$ ${hist.mediaMensal12m.toFixed(0)}

Composição:
${composicao || "(carteira vazia)"}

=== Meta ===
Renda mensal alvo: R$ ${meta?.rendaMensalAlvo ?? 0} | Renda atual: R$ ${(resumo.dividendos12m / 12).toFixed(0)} | Falta: R$ ${Math.max(0, (meta?.rendaMensalAlvo ?? 0) - resumo.dividendos12m / 12).toFixed(0)}/mês

=== Previsto próximo mês ===
Total: R$ ${previsao.total.toFixed(0)}

=== Watchlist / oportunidades (52s) ===
${oportLinha}

=== Pergunta do usuário ===
${pergunta || "Faça uma análise geral: quais pontos fortes, quais fragilidades, e onde focar o próximo aporte."}
  `.trim();

  try {
    const resposta = await consultarIA(promptBase, system);
    return NextResponse.json({ resposta });
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message ?? "erro" }, { status: 500 });
  }
}
