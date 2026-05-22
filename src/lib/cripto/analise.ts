import type { HistoricoCripto } from "./coingecko";

export type Tendencia = "ALTA" | "BAIXA" | "LATERAL";

export type SinalFinal =
  | "FORTE_OPORTUNIDADE"
  | "OPORTUNIDADE_MODERADA"
  | "NEUTRO"
  | "ATENCAO"
  | "EVITAR";

export type Indicadores = {
  tendencia: { valor: Tendencia; medias: { d7: number; d30: number } };
  percentil: { valor: number; faixa: "BARATA" | "NEUTRA" | "CARA" };
  momentum: {
    valor: "FORTE_ALTA" | "FORTE_BAIXA" | "MISTO";
    d7: number;
    d30: number;
    d90: number;
  };
  suporteResistencia: {
    distMinPct: number;     // distância % da mínima
    distMaxPct: number;     // distância % da máxima
    proximidade: "SUPORTE" | "RESISTENCIA" | "MEIO";
  };
  volatilidade: { valor: number; nivel: "BAIXA" | "MEDIA" | "ALTA" };
};

export type Analise = {
  cryptoId: string;
  precoAtual: number;
  score: number;            // 0–100
  sinal: SinalFinal;
  indicadores: Indicadores | null;
  resumo: string;
  insuficiente: boolean;    // histórico insuficiente
};

function media(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function desvioPadrao(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = media(xs);
  const variancia = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variancia);
}

function ultimosNDias(pontos: { t: number; p: number }[], dias: number): number[] {
  if (pontos.length === 0) return [];
  const fim = pontos[pontos.length - 1].t;
  const limite = fim - dias * 86400000;
  return pontos.filter((pt) => pt.t >= limite).map((pt) => pt.p);
}

function variacaoPct(pontos: { t: number; p: number }[], dias: number): number {
  if (pontos.length < 2) return 0;
  const fim = pontos[pontos.length - 1];
  const alvoT = fim.t - dias * 86400000;
  // ponto mais próximo do alvo (sem ultrapassar)
  let ref = pontos[0];
  for (const pt of pontos) {
    if (pt.t <= alvoT) ref = pt;
    else break;
  }
  if (!ref || ref.p === 0) return 0;
  return ((fim.p - ref.p) / ref.p) * 100;
}

function percentil(precoAtual: number, todos: number[]): number {
  if (todos.length === 0) return 50;
  let menores = 0;
  for (const p of todos) if (p <= precoAtual) menores++;
  return (menores / todos.length) * 100;
}

export function analisar(historico: HistoricoCripto, precoAtual: number): Analise {
  const cryptoId = historico.cryptoId;
  const pontos = historico.pontos;
  // histórico mínimo: 30 dias
  if (pontos.length < 30) {
    return {
      cryptoId,
      precoAtual,
      score: 50,
      sinal: "NEUTRO",
      indicadores: null,
      resumo: "Histórico insuficiente para gerar análise.",
      insuficiente: true,
    };
  }

  // 1. Tendência: média 7d vs 30d anteriores
  const precosTodos = pontos.map((p) => p.p);
  const ultimos7 = ultimosNDias(pontos, 7);
  const ultimos37 = ultimosNDias(pontos, 37);
  // os 30 dias "anteriores" aos últimos 7 = [37d..7d]
  const fim = pontos[pontos.length - 1].t;
  const anteriores30 = pontos
    .filter((pt) => pt.t < fim - 7 * 86400000 && pt.t >= fim - 37 * 86400000)
    .map((pt) => pt.p);

  const m7 = media(ultimos7);
  const m30 = media(anteriores30.length ? anteriores30 : ultimos37);
  const difPct = m30 === 0 ? 0 : ((m7 - m30) / m30) * 100;
  let tendencia: Tendencia = "LATERAL";
  if (difPct > 2) tendencia = "ALTA";
  else if (difPct < -2) tendencia = "BAIXA";

  // 2. Percentil
  const pct = percentil(precoAtual, precosTodos);
  let faixa: "BARATA" | "NEUTRA" | "CARA" = "NEUTRA";
  if (pct <= 25) faixa = "BARATA";
  else if (pct >= 75) faixa = "CARA";

  // 3. Momentum
  const d7 = variacaoPct(pontos, 7);
  const d30 = variacaoPct(pontos, 30);
  const d90 = variacaoPct(pontos, 90);
  let momentumValor: "FORTE_ALTA" | "FORTE_BAIXA" | "MISTO" = "MISTO";
  if (d7 > 0 && d30 > 0 && d90 > 0) momentumValor = "FORTE_ALTA";
  else if (d7 < 0 && d30 < 0 && d90 < 0) momentumValor = "FORTE_BAIXA";

  // 4. Proximidade de mínima/máxima do período (últimos 90 dias preferencialmente)
  const janela = ultimosNDias(pontos, 90);
  const minP = janela.length ? Math.min(...janela) : Math.min(...precosTodos);
  const maxP = janela.length ? Math.max(...janela) : Math.max(...precosTodos);
  const range = maxP - minP || 1;
  const distMinPct = ((precoAtual - minP) / range) * 100;
  const distMaxPct = ((maxP - precoAtual) / range) * 100;
  let proximidade: "SUPORTE" | "RESISTENCIA" | "MEIO" = "MEIO";
  if (distMinPct < 10) proximidade = "SUPORTE";
  else if (distMaxPct < 10) proximidade = "RESISTENCIA";

  // 5. Volatilidade: desvio padrão relativo dos últimos 30 dias
  const u30 = ultimosNDias(pontos, 30);
  const mediaU30 = media(u30) || 1;
  const volRel = (desvioPadrao(u30) / mediaU30) * 100;
  let volNivel: "BAIXA" | "MEDIA" | "ALTA" = "MEDIA";
  if (volRel < 3) volNivel = "BAIXA";
  else if (volRel > 8) volNivel = "ALTA";

  // === SCORE ===
  // posição na faixa histórica: 35% (menor percentil = mais atrativo)
  const scorePercentil = 100 - pct; // 0..100
  // tendência: 30%
  const scoreTendencia = tendencia === "ALTA" ? 80 : tendencia === "LATERAL" ? 50 : 20;
  // momentum: 25%
  const scoreMomentum =
    momentumValor === "FORTE_ALTA" ? 80 : momentumValor === "FORTE_BAIXA" ? 20 : 50;
  // suporte: 10%
  const scoreSuporte =
    proximidade === "SUPORTE" ? 90 : proximidade === "RESISTENCIA" ? 20 : 50;

  let score =
    scorePercentil * 0.35 +
    scoreTendencia * 0.30 +
    scoreMomentum * 0.25 +
    scoreSuporte * 0.10;
  score = Math.round(Math.max(0, Math.min(100, score)));

  // sinal final
  let sinal: SinalFinal;
  if (score >= 75) sinal = "FORTE_OPORTUNIDADE";
  else if (score >= 65) sinal = "OPORTUNIDADE_MODERADA";
  else if (score >= 45) sinal = "NEUTRO";
  else if (score >= 30) sinal = "ATENCAO";
  else sinal = "EVITAR";

  // resumo objetivo (até 2 frases)
  const partes: string[] = [];
  partes.push(
    `Percentil ${Math.round(pct)} do histórico` +
      (faixa === "BARATA" ? " (zona historicamente atrativa)" :
       faixa === "CARA" ? " (zona historicamente cara)" : ""),
  );
  partes.push(
    tendencia === "ALTA" ? "tendência recente de alta" :
    tendencia === "BAIXA" ? "tendência recente de baixa" : "preço lateralizado",
  );
  if (proximidade === "SUPORTE") partes.push("próximo de suporte recente");
  else if (proximidade === "RESISTENCIA") partes.push("próximo de resistência recente");
  if (volNivel === "ALTA") partes.push("volatilidade alta");

  const resumo = partes.join(", ") + ".";

  return {
    cryptoId,
    precoAtual,
    score,
    sinal,
    indicadores: {
      tendencia: { valor: tendencia, medias: { d7: m7, d30: m30 } },
      percentil: { valor: pct, faixa },
      momentum: { valor: momentumValor, d7, d30, d90 },
      suporteResistencia: { distMinPct, distMaxPct, proximidade },
      volatilidade: { valor: volRel, nivel: volNivel },
    },
    resumo,
    insuficiente: false,
  };
}

export function tendenciaBadge(t: Tendencia | undefined): { texto: string; cor: string; seta: string } {
  if (t === "ALTA") return { texto: "ALTA", cor: "emerald", seta: "↑" };
  if (t === "BAIXA") return { texto: "BAIXA", cor: "rose", seta: "↓" };
  return { texto: "LATERAL", cor: "zinc", seta: "→" };
}

export function sinalLabel(s: SinalFinal): { texto: string; cor: string; emoji: string } {
  switch (s) {
    case "FORTE_OPORTUNIDADE": return { texto: "Forte oportunidade", cor: "emerald", emoji: "🟢" };
    case "OPORTUNIDADE_MODERADA": return { texto: "Oportunidade moderada", cor: "sky",     emoji: "🔵" };
    case "NEUTRO":              return { texto: "Neutro",              cor: "zinc",    emoji: "⚪" };
    case "ATENCAO":             return { texto: "Atenção / resistência", cor: "amber",  emoji: "🟡" };
    case "EVITAR":              return { texto: "Evitar / zona de risco", cor: "rose",  emoji: "🔴" };
  }
}
