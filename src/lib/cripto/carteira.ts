import { prisma } from "@/lib/prisma";
import { toCent, toReais, multiplicar } from "@/lib/money";
import { CRYPTO_ASSETS, CRYPTO_BY_ID } from "./constants";

/** Movimentação de cripto — shape mínimo consumido pelo cálculo puro. */
export type CryptoTxInput = {
  id?: string;
  tipo: string; // COMPRA | VENDA | MINERACAO | TRANSFERENCIA
  data: Date;
  cryptoId: string;
  quantidade: number;
  valorTotal: number; // BRL
};

export type PrecoInput = { cryptoId: string; precoBrl: number; variacao24h: number | null };

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
 * Cálculo PURO de posições cripto (sem I/O) — preço médio ponderado, igual ao
 * engine de FII, e com aritmética em CENTAVOS (money.ts) para evitar drift de
 * float no custo/lucro acumulado.
 *
 * - COMPRA: soma ao custo total e à quantidade
 * - MINERACAO/TRANSFERENCIA: entrada sem custo (qtd sobe, custo não) → toda a
 *   valorização vira lucro não realizado (custo de aquisição zero, p/ fins de IR)
 * - VENDA: baixa proporcional ao preço médio vigente; lucro realizado =
 *   valorVenda − (PM × qtdVendida)
 *
 * Ordena por data (tiebreak por id) para ser determinístico.
 */
export function recalcularCripto(
  transacoes: CryptoTxInput[],
  precos: PrecoInput[],
): PosicaoCripto[] {
  const ordenadas = [...transacoes].sort((a, b) => {
    const dt = a.data.getTime() - b.data.getTime();
    if (dt !== 0) return dt;
    return (a.id ?? "").localeCompare(b.id ?? "");
  });

  // Acumuladores em centavos (custo/realizado); quantidade é unidade cripto (float ok).
  const acc: Record<string, { qtd: number; custoCent: number; realizadoCent: number }> = {};
  for (const a of CRYPTO_ASSETS) acc[a.id] = { qtd: 0, custoCent: 0, realizadoCent: 0 };

  for (const l of ordenadas) {
    const a = acc[l.cryptoId];
    if (!a) continue;
    if (l.tipo === "COMPRA") {
      a.custoCent += toCent(l.valorTotal);
      a.qtd += l.quantidade;
    } else if (l.tipo === "MINERACAO" || l.tipo === "TRANSFERENCIA") {
      a.qtd += l.quantidade;
    } else if (l.tipo === "VENDA") {
      const pm = a.qtd > 0 ? toReais(a.custoCent) / a.qtd : 0;
      const qtdVendida = Math.min(l.quantidade, a.qtd);
      const custoBaixadoCent = toCent(multiplicar(pm, qtdVendida));
      a.qtd -= qtdVendida;
      a.custoCent -= custoBaixadoCent;
      a.realizadoCent += toCent(l.valorTotal) - custoBaixadoCent;
      if (a.qtd < 1e-12) {
        a.qtd = 0;
        a.custoCent = 0;
      }
    }
  }

  const precoMap = new Map(precos.map((p) => [p.cryptoId, p.precoBrl]));

  return CRYPTO_ASSETS.map((meta) => {
    const a = acc[meta.id];
    const custoTotal = toReais(a.custoCent);
    const precoAtual = precoMap.get(meta.id) ?? 0;
    const valorAtual = multiplicar(precoAtual, a.qtd);
    const lucroNaoRealizado = valorAtual - custoTotal;
    const precoMedio = a.qtd > 0 ? custoTotal / a.qtd : 0;
    const lucroNaoRealizadoPct = custoTotal > 0 ? (lucroNaoRealizado / custoTotal) * 100 : 0;
    return {
      cryptoId: meta.id,
      symbol: meta.symbol,
      nome: meta.name,
      decimals: meta.decimals,
      color: meta.color,
      quantidade: a.qtd,
      custoTotal,
      precoMedio,
      precoAtual,
      valorAtual,
      lucroNaoRealizado,
      lucroNaoRealizadoPct,
      lucroRealizado: toReais(a.realizadoCent),
    };
  });
}

/** Camada de dados: busca transações da carteira e delega ao cálculo puro. */
export async function calcularPosicoesCripto(
  carteiraId: string,
  precos: PrecoInput[],
): Promise<PosicaoCripto[]> {
  const lancs = await prisma.cryptoTransaction.findMany({
    where: { carteiraId },
    orderBy: { data: "asc" },
  });
  return recalcularCripto(lancs, precos);
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
