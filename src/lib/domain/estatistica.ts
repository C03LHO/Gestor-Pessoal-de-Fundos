/**
 * Regressão linear simples por mínimos quadrados.
 * Recebe pares (x, y) e devolve coeficientes a, b tal que y = a + b*x.
 */
export function regressaoLinear(pontos: { x: number; y: number }[]) {
  const n = pontos.length;
  if (n < 2) return { a: pontos[0]?.y ?? 0, b: 0, r2: 0 };

  let sx = 0, sy = 0, sxy = 0, sx2 = 0;
  for (const p of pontos) {
    sx += p.x; sy += p.y; sxy += p.x * p.y; sx2 += p.x * p.x;
  }
  const mx = sx / n;
  const my = sy / n;
  const denom = sx2 - n * mx * mx;
  const b = denom !== 0 ? (sxy - n * mx * my) / denom : 0;
  const a = my - b * mx;

  let ssr = 0, sst = 0;
  for (const p of pontos) {
    const yhat = a + b * p.x;
    ssr += (p.y - yhat) ** 2;
    sst += (p.y - my) ** 2;
  }
  const r2 = sst > 0 ? 1 - ssr / sst : 0;

  return { a, b, r2 };
}

/** Detecta outliers via MAD (Median Absolute Deviation) — robusto a outliers. */
export function ehOutlier(valor: number, amostra: number[], k = 3.5): boolean {
  if (amostra.length < 3) return false;
  const ordenada = [...amostra].sort((x, y) => x - y);
  const mediana = ordenada[Math.floor(ordenada.length / 2)];
  const desvios = amostra.map((v) => Math.abs(v - mediana));
  desvios.sort((x, y) => x - y);
  const mad = desvios[Math.floor(desvios.length / 2)];
  if (mad === 0) return false;
  const z = (0.6745 * (valor - mediana)) / mad;
  return Math.abs(z) > k;
}
