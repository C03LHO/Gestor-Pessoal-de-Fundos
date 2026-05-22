import { prisma } from "@/lib/prisma";
import { CRYPTO_ASSETS, CRYPTO_BY_ID } from "./constants";

export type PosicaoCripto = {
  cryptoId: string;
  symbol: string;
  nome: string;
  decimals: number;
  color: string;
  quantidade: number;
  custoTotal: number;       // BRL
  precoMedio: number;       // BRL por unidade
  precoAtual: number;       // BRL
  valorAtual: number;       // BRL
  lucroNaoRealizado: number;
  lucroNaoRealizadoPct: number;
  lucroRealizado: number;
};

export type ResumoCripto = {
  valorTotal: number;
  custoTotal: number;
  lucroNaoRealizado: number;
  lucroNaoRealizadoPct: number;
  lucroRealizado: number;
  variacaoDia: number;       // BRL (estimada via variacao24h)
  variacaoDiaPct: number;    // % média ponderada pelo valor
};

/**
 * Calcula posições cripto usando preço médio ponderado (igual ao engine de FII):
 * - compras somam ao custo total e à quantidade
 * - vendas reduzem quantidade proporcional ao preço médio vigente
 *   e contabilizam lucro realizado = (precoUnitVenda - precoMedio) * qtdVendida
 */
export async function calcularPosicoesCripto(
  carteiraId: string,
  precos: { cryptoId: string; precoBrl: number; variacao24h: number | null }[],
): Promise<PosicaoCripto[]> {
  const lancs = await prisma.cryptoTransaction.findMany({
    where: { carteiraId },
    orderBy: { data: "asc" },
  });

  const acc: Record<string, { qtd: number; custo: number; realizado: number }> = {};
  for (const a of CRYPTO_ASSETS) acc[a.id] = { qtd: 0, custo: 0, realizado: 0 };

  for (const l of lancs) {
    const a = acc[l.cryptoId];
    if (!a) continue;
    if (l.tipo === "COMPRA") {
      a.custo += l.valorTotal;
      a.qtd += l.quantidade;
    } else if (l.tipo === "MINERACAO" || l.tipo === "TRANSFERENCIA") {
      // Entrada sem custo: quantidade aumenta, custo NÃO aumenta.
      // Toda valorização vira lucro não realizado.
      a.qtd += l.quantidade;
    } else if (l.tipo === "VENDA") {
      const pm = a.qtd > 0 ? a.custo / a.qtd : 0;
      const qtdVendida = Math.min(l.quantidade, a.qtd);
      const custoBaixado = pm * qtdVendida;
      a.qtd -= qtdVendida;
      a.custo -= custoBaixado;
      a.realizado += l.valorTotal - custoBaixado;
      if (a.qtd < 1e-12) {
        a.qtd = 0;
        a.custo = 0;
      }
    }
  }

  const precoMap = new Map(precos.map((p) => [p.cryptoId, p.precoBrl]));

  return CRYPTO_ASSETS.map((meta) => {
    const a = acc[meta.id];
    const precoAtual = precoMap.get(meta.id) ?? 0;
    const valorAtual = a.qtd * precoAtual;
    const lucroNaoRealizado = valorAtual - a.custo;
    const precoMedio = a.qtd > 0 ? a.custo / a.qtd : 0;
    const lucroNaoRealizadoPct = a.custo > 0 ? (lucroNaoRealizado / a.custo) * 100 : 0;
    return {
      cryptoId: meta.id,
      symbol: meta.symbol,
      nome: meta.name,
      decimals: meta.decimals,
      color: meta.color,
      quantidade: a.qtd,
      custoTotal: a.custo,
      precoMedio,
      precoAtual,
      valorAtual,
      lucroNaoRealizado,
      lucroNaoRealizadoPct,
      lucroRealizado: a.realizado,
    };
  });
}

export function resumoCarteiraCripto(
  posicoes: PosicaoCripto[],
  precos: { cryptoId: string; variacao24h: number | null }[],
): ResumoCripto {
  let valorTotal = 0;
  let custoTotal = 0;
  let lucroRealizado = 0;
  let variacaoDia = 0;
  for (const p of posicoes) {
    valorTotal += p.valorAtual;
    custoTotal += p.custoTotal;
    lucroRealizado += p.lucroRealizado;
    // Pula posições sem valor real (qtd=0, preço=0 ou variação ausente)
    if (p.valorAtual <= 0) continue;
    const v = precos.find((x) => x.cryptoId === p.cryptoId)?.variacao24h;
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    // variacao24h é em %, então valor de ontem = valor atual / (1 + v/100)
    // Clamp para evitar divisão por zero quando variação é ≤ -99%
    const fator = 1 + v / 100;
    if (fator <= 0.01) continue; // variação irreal — ignora silenciosamente
    const valorOntem = p.valorAtual / fator;
    const delta = p.valorAtual - valorOntem;
    if (Number.isFinite(delta)) variacaoDia += delta;
  }
  const lucroNaoRealizado = valorTotal - custoTotal;
  const lucroNaoRealizadoPct = custoTotal > 0 ? (lucroNaoRealizado / custoTotal) * 100 : 0;
  const baseOntem = valorTotal - variacaoDia;
  const variacaoDiaPct = baseOntem > 0 ? (variacaoDia / baseOntem) * 100 : 0;
  return {
    valorTotal,
    custoTotal,
    lucroNaoRealizado,
    lucroNaoRealizadoPct,
    lucroRealizado,
    variacaoDia,
    variacaoDiaPct,
  };
}

/** Quantidade atual de um ativo (para validar venda). */
export async function quantidadeAtual(carteiraId: string, cryptoId: string): Promise<number> {
  const lancs = await prisma.cryptoTransaction.findMany({
    where: { carteiraId, cryptoId },
    orderBy: { data: "asc" },
  });
  let qtd = 0;
  for (const l of lancs) {
    if (l.tipo === "COMPRA" || l.tipo === "MINERACAO" || l.tipo === "TRANSFERENCIA") qtd += l.quantidade;
    else if (l.tipo === "VENDA") qtd -= l.quantidade;
  }
  return qtd;
}

export function metaCripto(cryptoId: string) {
  return CRYPTO_BY_ID[cryptoId];
}
