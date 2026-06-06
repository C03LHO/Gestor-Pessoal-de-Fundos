/**
 * Métricas de risco/retorno da carteira — funções PURAS.
 *
 * A série de patrimônio mistura valorização de mercado com APORTES. Para medir
 * retorno de verdade, calculamos o retorno mensal ajustado por fluxo de caixa
 * (Dietz simplificado): o aporte líquido do mês entra com metade do peso, pois
 * em média foi investido no meio do período.
 *
 *   r_t = (valorFim − valorIni − fluxo) / (valorIni + fluxo/2)
 *
 * onde `fluxo` = variação do custo investido no mês (aportes − vendas a custo).
 * A partir da série de retornos derivam CAGR, máximo drawdown e Sharpe.
 */

export type PontoPatrimonio = { valor: number; investido: number };

/** Retornos mensais ajustados por fluxo (uma entrada por transição de mês). */
export function retornosMensais(serie: PontoPatrimonio[]): number[] {
  const rs: number[] = [];
  for (let i = 1; i < serie.length; i++) {
    const vIni = serie[i - 1].valor;
    const vFim = serie[i].valor;
    const fluxo = serie[i].investido - serie[i - 1].investido;
    const base = vIni + fluxo / 2;
    rs.push(base > 0 ? (vFim - vIni - fluxo) / base : 0);
  }
  return rs;
}

/** Índice acumulado (base 1) a partir de uma série de retornos. */
export function indiceAcumulado(retornos: number[]): number[] {
  const idx = [1];
  for (const r of retornos) idx.push(idx[idx.length - 1] * (1 + r));
  return idx;
}

/**
 * CAGR (retorno anual composto) a partir dos retornos mensais.
 * Encadeia os retornos e anualiza pelo nº de meses.
 */
export function cagr(retornos: number[]): number {
  if (retornos.length === 0) return 0;
  const total = retornos.reduce((acc, r) => acc * (1 + r), 1);
  const anos = retornos.length / 12;
  if (anos <= 0 || total <= 0) return 0;
  return Math.pow(total, 1 / anos) - 1;
}

/**
 * Máximo drawdown sobre um índice acumulado — maior queda do pico ao vale.
 * Retorna fração positiva (0.15 = caiu 15% do topo).
 */
export function maxDrawdown(indice: number[]): number {
  let pico = -Infinity;
  let maxDD = 0;
  for (const v of indice) {
    if (v > pico) pico = v;
    if (pico > 0) {
      const dd = (pico - v) / pico;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD;
}

/**
 * Índice de Sharpe ANUALIZADO a partir dos retornos mensais e da taxa livre
 * de risco mensal (ex.: CDI mensal). (média do excesso / desvio) × √12.
 */
export function sharpe(retornos: number[], rfMensal: number): number {
  if (retornos.length < 2) return 0;
  const excesso = retornos.map((r) => r - rfMensal);
  const media = excesso.reduce((a, b) => a + b, 0) / excesso.length;
  const varAmostral =
    excesso.reduce((a, b) => a + (b - media) ** 2, 0) / (excesso.length - 1);
  const dp = Math.sqrt(varAmostral);
  if (dp === 0) return 0;
  return (media / dp) * Math.sqrt(12);
}

export type MetricasCarteira = {
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
  meses: number;
};

/**
 * Calcula as três métricas de uma vez a partir da série de patrimônio e do
 * CDI acumulado no período (para a taxa livre de risco mensal).
 */
export function calcularMetricas(
  serie: PontoPatrimonio[],
  cdiAcumPeriodo: number | null,
): MetricasCarteira {
  const retornos = retornosMensais(serie);
  const idx = indiceAcumulado(retornos);
  // CDI acumulado → taxa mensal equivalente (se indisponível, rf = 0).
  const rfMensal =
    cdiAcumPeriodo != null && retornos.length > 0
      ? Math.pow(1 + cdiAcumPeriodo, 1 / retornos.length) - 1
      : 0;
  return {
    cagr: cagr(retornos),
    maxDrawdown: maxDrawdown(idx),
    sharpe: sharpe(retornos, rfMensal),
    meses: retornos.length,
  };
}
