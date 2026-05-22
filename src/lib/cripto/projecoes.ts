import type { HistoricoCripto } from "./coingecko";

export type Cenario = "PESSIMISTA" | "CONSERVADORA" | "OTIMISTA";
export type Horizonte = 1 | 3 | 5;

export type ProjecaoPorHorizonte = {
  anos: Horizonte;
  pessimista: number;
  conservadora: number;
  otimista: number;
};

export type ProjecaoAtivo = {
  cryptoId: string;
  precoAtual: number;
  taxas: {
    pessimistaAA: number;   // taxa anual no cenário pessimista
    conservadoraAA: number;
    otimistaAA: number;
  };
  horizontes: ProjecaoPorHorizonte[];
  historicoLimitado: boolean;
  premissas: string;
};

/**
 * Premissas qualitativas por ativo. Usadas quando o histórico é curto demais
 * para calcular percentis 15/85 confiáveis.
 *
 * Os valores são CAGRs ANUAIS aproximados baseados em:
 * - histórico longo do ativo (quando existe)
 * - comparáveis no mesmo setor / categoria
 * - premissas econômicas e de adoção descritas no briefing
 *
 * Pessimista = bear prolongado / regulação adversa
 * Conservadora = ciclos normais com adoção gradual
 * Otimista = bull forte com adoção acelerada
 */
const REFERENCIAS_POR_ATIVO: Record<string, { pessAA: number; consAA: number; otAA: number; premissas: string }> = {
  bitcoin: {
    pessAA: -0.05,
    consAA:  0.18,
    otAA:   0.55,
    premissas:
      "BTC: ciclos de halving (próximo ~2028), reserva de valor digital. Pessimista: consolidação como ouro digital. Conservadora: CAGR longo prazo de ETFs + balanços corporativos. Otimista: comparação com cap do ouro.",
  },
  kaspa: {
    pessAA: -0.40,
    consAA:  0.20,
    otAA:   1.50,
    premissas:
      "KAS: histórico curto (desde 2022), alta volatilidade. Pessimista: PoW alternativos perdem para BTC. Conservadora: adoção gradual em PoW de alta velocidade. Otimista: papel relevante em blockDAG.",
  },
  grin: {
    pessAA: -0.30,
    consAA: -0.02,
    otAA:   0.45,
    premissas:
      "GRIN: emissão linear sem halving (inflação constante), foco em privacidade MimbleWimble. Pessimista: regulação anti-privacidade. Otimista: privacidade vira premium global.",
  },
  "ethereum-classic": {
    pessAA: -0.10,
    consAA:  0.10,
    otAA:   0.50,
    premissas:
      "ETC: fork PoW original do Ethereum, beneficiado por migração de GPUs pós-merge. Pessimista: relevância cai com PoS dominante. Otimista: nicho de smart contracts + PoW.",
  },
};

/** Retorna pontos com 1 amostra por dia (último ponto de cada dia). */
function reduzirDiario(pontos: { t: number; p: number }[]): { t: number; p: number }[] {
  if (pontos.length === 0) return [];
  const porDia = new Map<number, { t: number; p: number }>();
  for (const pt of pontos) {
    const diaKey = Math.floor(pt.t / 86400000);
    porDia.set(diaKey, pt);
  }
  return Array.from(porDia.values()).sort((a, b) => a.t - b.t);
}

/** Calcula taxas YoY (Year-over-Year) deslizantes: para cada dia d, taxa = preco(d) / preco(d-365) - 1. */
function taxasYoY(pontos: { t: number; p: number }[]): number[] {
  const diarios = reduzirDiario(pontos);
  if (diarios.length < 365) return [];
  const taxas: number[] = [];
  for (let i = 365; i < diarios.length; i++) {
    const atual = diarios[i].p;
    const passado = diarios[i - 365].p;
    if (passado > 0) taxas.push(atual / passado - 1);
  }
  return taxas;
}

function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const idx = Math.min(ordenados.length - 1, Math.max(0, Math.floor((p / 100) * ordenados.length)));
  return ordenados[idx];
}

/** CAGR calculado entre primeiro e último ponto, em base anual. */
function cagrHistorico(pontos: { t: number; p: number }[]): number {
  if (pontos.length < 2) return 0;
  const p0 = pontos[0].p;
  const pN = pontos[pontos.length - 1].p;
  const anos = (pontos[pontos.length - 1].t - pontos[0].t) / (365 * 86400000);
  if (p0 <= 0 || anos <= 0) return 0;
  return Math.pow(pN / p0, 1 / anos) - 1;
}

/** Aplica taxa anual composta. */
function projetar(precoAtual: number, taxaAA: number, anos: number): number {
  return precoAtual * Math.pow(1 + taxaAA, anos);
}

/**
 * Calcula projeções para 1, 3 e 5 anos em 3 cenários (pessimista, conservadora, otimista).
 *
 * Metodologia:
 * - Se histórico disponível ≥ 2 anos (≥ 730 pontos diários):
 *   - Pessimista = percentil 15 das taxas YoY históricas
 *   - Conservadora = CAGR histórico × 0.7 (desconto de 30% para realismo)
 *   - Otimista = percentil 85 das taxas YoY históricas
 * - Caso contrário: usa REFERENCIAS_POR_ATIVO (hard-coded por ativo)
 *
 * As taxas são CLAMPED em ranges sensatos para evitar números absurdos
 * de criptos novas com pouco histórico mas crescimento explosivo.
 */
export function calcularProjecao(historico: HistoricoCripto, precoAtual: number): ProjecaoAtivo {
  const cryptoId = historico.cryptoId;
  const ref = REFERENCIAS_POR_ATIVO[cryptoId] ?? REFERENCIAS_POR_ATIVO.bitcoin;

  const diarios = reduzirDiario(historico.pontos);
  const historicoSuficiente = diarios.length >= 730; // 2 anos

  let pessAA: number, consAA: number, otAA: number;
  let premissasUsadas = ref.premissas;

  if (historicoSuficiente) {
    const taxas = taxasYoY(diarios);
    const p15 = percentil(taxas, 15);
    const p85 = percentil(taxas, 85);
    const cagr = cagrHistorico(diarios);
    pessAA = clamp(p15, -0.5, 0.0);
    consAA = clamp(cagr * 0.7, -0.1, 0.6);
    otAA   = clamp(p85, 0.1, 2.5);
  } else {
    pessAA = ref.pessAA;
    consAA = ref.consAA;
    otAA   = ref.otAA;
  }

  const horizontes: ProjecaoPorHorizonte[] = [1, 3, 5].map((anos) => ({
    anos: anos as Horizonte,
    pessimista:    projetar(precoAtual, pessAA, anos),
    conservadora:  projetar(precoAtual, consAA, anos),
    otimista:      projetar(precoAtual, otAA, anos),
  }));

  return {
    cryptoId,
    precoAtual,
    taxas: { pessimistaAA: pessAA, conservadoraAA: consAA, otimistaAA: otAA },
    horizontes,
    historicoLimitado: !historicoSuficiente,
    premissas: premissasUsadas,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
