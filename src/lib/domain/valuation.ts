/**
 * Engine de valuation histórico — função PURA.
 *
 * Recebe uma série de preços históricos + preço atual e devolve uma análise
 * estruturada e auditável. Toda a regra de classificação está aqui — a UI
 * apenas renderiza o resultado.
 *
 * Princípios:
 *  - Nada de "abaixo da média = barato" simplista. Combina múltiplos sinais.
 *  - Cada conclusão vem com motivos[] estruturados que a UI mostra.
 *  - Confiança baixa quando histórico curto ou ruim — não inventa precisão.
 */

export type ClasseValuation =
  | "muito_barato"
  | "barato"
  | "justo"
  | "caro"
  | "muito_caro";

export const ROTULO_CLASSE: Record<ClasseValuation, string> = {
  muito_barato: "Muito barato",
  barato: "Barato",
  justo: "Justo",
  caro: "Caro",
  muito_caro: "Muito caro",
};

export type Motivo = {
  texto: string;
  peso: "positivo" | "negativo" | "neutro";
};

export type Confianca = "alta" | "media" | "baixa";

export type Valuation = {
  // Janela
  pontos: number;             // total de preços usados

  // Preços
  precoAtual: number;
  min: number;
  max: number;
  media: number;
  mediana: number;
  desvioPadrao: number;       // em reais
  coefVariacao: number;       // desvioPadrao / media (0..n)

  // Posições
  percentilHistorico: number; // 0..100 — % de preços históricos <= atual
  posicaoLinear: number;      // 0..100 — (atual − min) / (max − min)
  desvioMedia: number;        // (atual − media) / media (negativo = abaixo)
  desvioMediana: number;      // idem com mediana
  distMinima: number;         // (atual − min) / min (positivo = acima)
  distMaxima: number;         // (max − atual) / max (positivo = desconto)

  // Classificação
  classe: ClasseValuation;
  score: number;              // 0..100 — maior = mais atrativo
  confianca: Confianca;

  // Explicação
  resumo: string;
  motivos: Motivo[];
  avisos: string[];           // "histórico curto", "volatilidade extrema" etc.
};

/**
 * Calcula valuation a partir de uma série de preços + preço atual.
 *
 * @param precos  Lista de preços históricos (qualquer ordem). NÃO inclui o
 *                preço atual — ele é separado para que cada chamador escolha.
 * @param precoAtual  Preço de mercado atual (>0).
 */
export function analisarValuation(precos: number[], precoAtual: number): Valuation {
  const validos = precos.filter((p) => Number.isFinite(p) && p > 0);
  const pontos = validos.length;

  // Caso degenerado: sem dados.
  if (pontos === 0 || !Number.isFinite(precoAtual) || precoAtual <= 0) {
    return {
      pontos,
      precoAtual: Number.isFinite(precoAtual) ? precoAtual : 0,
      min: 0, max: 0, media: 0, mediana: 0, desvioPadrao: 0, coefVariacao: 0,
      percentilHistorico: 50, posicaoLinear: 50,
      desvioMedia: 0, desvioMediana: 0, distMinima: 0, distMaxima: 0,
      classe: "justo",
      score: 50,
      confianca: "baixa",
      resumo: "Histórico indisponível para análise.",
      motivos: [],
      avisos: ["Sem dados históricos suficientes para análise."],
    };
  }

  const ordenados = [...validos].sort((a, b) => a - b);
  const min = ordenados[0];
  const max = ordenados[ordenados.length - 1];
  const media = validos.reduce((s, p) => s + p, 0) / pontos;
  const mediana = percentil(ordenados, 0.5);

  // Desvio padrão amostral
  const varAmostral = pontos > 1
    ? validos.reduce((s, p) => s + (p - media) ** 2, 0) / (pontos - 1)
    : 0;
  const desvioPadrao = Math.sqrt(varAmostral);
  const coefVariacao = media > 0 ? desvioPadrao / media : 0;

  // Percentil verdadeiro: fração de preços <= atual (interpolando empates).
  // Robusto a outliers. Diferente de "posição linear em [min, max]".
  let menores = 0, iguais = 0;
  for (const p of validos) {
    if (p < precoAtual) menores++;
    else if (p === precoAtual) iguais++;
  }
  const percentilHistorico = Math.max(0, Math.min(100,
    ((menores + iguais / 2) / pontos) * 100,
  ));

  const range = max - min;
  const posicaoLinear = range > 0
    ? Math.max(0, Math.min(100, ((precoAtual - min) / range) * 100))
    : 50;

  const desvioMedia = media > 0 ? (precoAtual - media) / media : 0;
  const desvioMediana = mediana > 0 ? (precoAtual - mediana) / mediana : 0;
  const distMinima = min > 0 ? (precoAtual - min) / min : 0;
  const distMaxima = max > 0 ? (max - precoAtual) / max : 0;

  // ============ Avisos =============
  const avisos: string[] = [];
  if (pontos < 30) avisos.push(`Histórico curto (${pontos} pregões) — análise menos confiável.`);
  else if (pontos < 60) avisos.push(`Apenas ${pontos} pregões disponíveis — interpretar com ressalva.`);
  if (coefVariacao > 0.35) avisos.push("Volatilidade alta — preço se move muito em torno da média.");
  if (range === 0) avisos.push("Preço histórico constante — sem dispersão.");

  // ============ Confiança =============
  let confianca: Confianca;
  if (pontos >= 200 && coefVariacao <= 0.40) confianca = "alta";
  else if (pontos >= 60) confianca = "media";
  else confianca = "baixa";
  if (coefVariacao > 0.60 && confianca === "alta") confianca = "media";

  // ============ Classificação =============
  // Núcleo: percentil. Mas usa também o desvio da mediana para evitar que
  // séries com poucos preços distintos enviesem (ex: cluster perto da máxima).
  const classe = classificar(percentilHistorico, desvioMediana);

  // ============ Score 0..100 =============
  // Pesos:
  //   45%  inverso do percentil — preço baixo no histórico = bom
  //   25%  desconto vs média — quanto está abaixo
  //   15%  desconto vs mediana
  //   10%  drawdown vs máxima
  //    5%  bônus por consistência (CV baixo)
  const invPercentil = 100 - percentilHistorico;
  const descMedia = clamp((-desvioMedia) * 100 / 0.25, -100, 100);   // ±25% → ±100
  const descMediana = clamp((-desvioMediana) * 100 / 0.25, -100, 100);
  const drawdown = clamp(distMaxima * 100 / 0.30, 0, 100);            // 30%+ → 100
  const consistencia = clamp((0.30 - coefVariacao) * 100, 0, 30);     // CV<0.05 → 30

  const scoreRaw =
    invPercentil * 0.45 +
    (descMedia + 100) / 2 * 0.25 +
    (descMediana + 100) / 2 * 0.15 +
    drawdown * 0.10 +
    consistencia * 0.05;
  const score = Math.round(clamp(scoreRaw, 0, 100));

  // ============ Motivos =============
  const motivos: Motivo[] = [];

  motivos.push({
    texto: `Preço atual está no percentil ${percentilHistorico.toFixed(0)} da série histórica (${pontos} pregões).`,
    peso: percentilHistorico <= 30 ? "positivo" : percentilHistorico >= 70 ? "negativo" : "neutro",
  });

  motivos.push({
    texto: desvioMedia >= 0
      ? `Está ${pct(desvioMedia)} acima da média histórica.`
      : `Está ${pct(-desvioMedia)} abaixo da média histórica.`,
    peso: desvioMedia <= -0.03 ? "positivo" : desvioMedia >= 0.03 ? "negativo" : "neutro",
  });

  motivos.push({
    texto: desvioMediana >= 0
      ? `Está ${pct(desvioMediana)} acima da mediana.`
      : `Está ${pct(-desvioMediana)} abaixo da mediana.`,
    peso: desvioMediana <= -0.03 ? "positivo" : desvioMediana >= 0.03 ? "negativo" : "neutro",
  });

  if (distMaxima > 0) {
    motivos.push({
      texto: `Caiu ${pct(distMaxima)} desde a máxima do período.`,
      peso: distMaxima >= 0.10 ? "positivo" : "neutro",
    });
  } else {
    motivos.push({
      texto: `Está na máxima ou acima do período analisado.`,
      peso: "negativo",
    });
  }

  if (posicaoLinear < 30) {
    motivos.push({
      texto: "Mais próximo da mínima do que da máxima histórica.",
      peso: "positivo",
    });
  } else if (posicaoLinear > 70) {
    motivos.push({
      texto: "Mais próximo da máxima do que da mínima histórica.",
      peso: "negativo",
    });
  }

  if (confianca !== "alta") {
    motivos.push({
      texto: confianca === "baixa"
        ? "Confiança baixa: histórico curto ou volátil."
        : "Confiança média: amostra ainda pequena para conclusão forte.",
      peso: "neutro",
    });
  }

  // ============ Resumo textual =============
  const resumo = montarResumo(classe, percentilHistorico, desvioMedia, distMaxima);

  return {
    pontos,
    precoAtual,
    min, max, media, mediana, desvioPadrao, coefVariacao,
    percentilHistorico, posicaoLinear,
    desvioMedia, desvioMediana, distMinima, distMaxima,
    classe, score, confianca,
    resumo, motivos, avisos,
  };
}

function classificar(percentil: number, desvioMediana: number): ClasseValuation {
  // Bins do percentil — mas se o preço está MUITO acima/abaixo da mediana,
  // permite "escalar" a classificação (evita "barato" quando está 40% acima da mediana
  // só porque a série tinha um spike no topo).
  let base: ClasseValuation;
  if (percentil <= 20) base = "muito_barato";
  else if (percentil <= 40) base = "barato";
  else if (percentil < 60) base = "justo";
  else if (percentil < 80) base = "caro";
  else base = "muito_caro";

  // Override por desvio da mediana — evita conclusões frágeis.
  if (desvioMediana >= 0.20 && base !== "muito_caro") return "caro";
  if (desvioMediana <= -0.20 && base !== "muito_barato") return "barato";

  return base;
}

function montarResumo(
  classe: ClasseValuation, percentil: number, desvioMedia: number, drawdown: number,
): string {
  if (classe === "muito_barato") {
    return `Preço no quartil inferior do histórico (percentil ${percentil.toFixed(0)}), ${pct(Math.abs(desvioMedia))} abaixo da média. Janela historicamente atrativa.`;
  }
  if (classe === "barato") {
    return `Preço abaixo da média histórica e na metade inferior do período. Desconto de ${pct(drawdown)} em relação à máxima.`;
  }
  if (classe === "justo") {
    return `Preço em região neutra do histórico (percentil ${percentil.toFixed(0)}). Sem desconto nem prêmio relevante.`;
  }
  if (classe === "caro") {
    return `Preço acima da média e na metade superior do histórico. Comprar agora paga prêmio sobre o período.`;
  }
  return `Preço em região historicamente esticada (percentil ${percentil.toFixed(0)}). Comprar paga prêmio importante sobre o histórico recente.`;
}

// ---------- Helpers ----------

function percentil(ordenadosAsc: number[], p: number): number {
  if (ordenadosAsc.length === 0) return 0;
  if (ordenadosAsc.length === 1) return ordenadosAsc[0];
  const pos = (ordenadosAsc.length - 1) * p;
  const baixo = Math.floor(pos);
  const alto = Math.ceil(pos);
  if (baixo === alto) return ordenadosAsc[baixo];
  const frac = pos - baixo;
  return ordenadosAsc[baixo] * (1 - frac) + ordenadosAsc[alto] * frac;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
