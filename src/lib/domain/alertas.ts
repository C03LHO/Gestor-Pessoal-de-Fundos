import { prisma } from "../prisma";
import type { Posicao } from "./posicao";

export type Alerta = {
  id: string;
  nivel: "info" | "alerta" | "atenção";
  titulo: string;
  descricao: string;
  ticker?: string;
};

const LIMITE_CONCENTRACAO = 0.4;        // 40% em 1 ativo já é muito
const LIMITE_VARIACAO_24H  = 0.05;       // 5%
const TOLERANCIA_NAO_PAGOU_DIAS = 7;     // após N dias da data típica

export async function gerarAlertas(posicoes: Posicao[], patrimonio: number): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  // 1) Concentração
  for (const p of posicoes) {
    const peso = patrimonio > 0 ? p.valorAtual / patrimonio : 0;
    if (peso >= LIMITE_CONCENTRACAO) {
      alertas.push({
        id: `conc-${p.ticker}`,
        nivel: peso >= 0.6 ? "atenção" : "alerta",
        titulo: `${p.ticker} pesa ${(peso * 100).toFixed(0)}% da carteira`,
        descricao: `Concentração alta em um ativo aumenta seu risco. Considere diversificar.`,
        ticker: p.ticker,
      });
    }
  }

  // 2) Variação 24h por ativo (precisa de histórico)
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
  const cotacoes = await prisma.cotacao.findMany({
    where: { data: { gte: ontem } },
    orderBy: { data: "asc" },
  });
  const porTicker = new Map<string, number[]>();
  for (const c of cotacoes) {
    if (!porTicker.has(c.ticker)) porTicker.set(c.ticker, []);
    porTicker.get(c.ticker)!.push(c.preco);
  }
  for (const p of posicoes) {
    const serie = porTicker.get(p.ticker);
    if (!serie || serie.length < 2) continue;
    const inicial = serie[0];
    const atual = serie[serie.length - 1];
    if (inicial <= 0) continue;
    const var24h = (atual - inicial) / inicial;
    if (Math.abs(var24h) >= LIMITE_VARIACAO_24H) {
      alertas.push({
        id: `var-${p.ticker}`,
        nivel: "info",
        titulo: `${p.ticker} variou ${var24h >= 0 ? "+" : ""}${(var24h * 100).toFixed(2)}% em 24h`,
        descricao: `Movimento relevante. Verifique notícias.`,
        ticker: p.ticker,
      });
    }
  }

  // 3) Não pagou esse mês
  for (const p of posicoes) {
    const divs = await prisma.lancamento.findMany({
      where: { ativoId: p.ativoId, tipo: "DIVIDENDO" },
      orderBy: { data: "desc" },
      take: 12,
    });
    if (divs.length < 3) continue; // sem padrão suficiente

    const dias = divs.map((d) => d.data.getDate());
    const diaTipico = mediana(dias);

    const ultima = divs[0];
    const hoje = new Date();
    // já pagou este mês?
    const pagouEsteMes =
      ultima.data.getFullYear() === hoje.getFullYear() &&
      ultima.data.getMonth() === hoje.getMonth();

    if (!pagouEsteMes && hoje.getDate() > diaTipico + TOLERANCIA_NAO_PAGOU_DIAS) {
      alertas.push({
        id: `naopagou-${p.ticker}`,
        nivel: "alerta",
        titulo: `${p.ticker} ainda não pagou em ${hoje.toLocaleString("pt-BR", { month: "long" })}`,
        descricao: `Costuma pagar por volta do dia ${diaTipico}. Verifique no Status Invest.`,
        ticker: p.ticker,
      });
    }
  }

  return alertas;
}

function mediana(vals: number[]) {
  const o = [...vals].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
}
