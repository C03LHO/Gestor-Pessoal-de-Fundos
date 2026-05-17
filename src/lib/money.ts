/**
 * Aritmética monetária com precisão garantida.
 *
 * Problema: JS Number (IEEE-754) acumula erro em somas de decimais.
 *   0.1 + 0.2 === 0.30000000000000004
 *
 * Solução: trabalhar em centavos (Int) internamente, arredondar na borda.
 * Todas as somas/subtrações/comparações monetárias DEVEM usar estes helpers.
 */

const C = 100; // centavos por real

export const toCent = (reais: number): number => Math.round(reais * C);
export const toReais = (cent: number): number => cent / C;

/** Soma N valores em reais sem perder centavos. Retorna em reais. */
export function somar(...vals: number[]): number {
  let cent = 0;
  for (const v of vals) cent += toCent(v);
  return cent / C;
}

/** Soma de array — variante prática. */
export function somarLista<T>(items: T[], get: (x: T) => number): number {
  let cent = 0;
  for (const x of items) cent += toCent(get(x));
  return cent / C;
}

export const subtrair = (a: number, b: number): number => (toCent(a) - toCent(b)) / C;

export const multiplicar = (valor: number, qtd: number): number => {
  // qtd pode ser fracionária (cotas frac). Converte para milicentavos pra reduzir drift.
  const mc = Math.round(valor * 100000 * qtd);
  return Math.round(mc / 1000) / C;
};

/** Comparação em centavos — sem epsilon hell. */
export const igual  = (a: number, b: number): boolean => toCent(a) === toCent(b);
export const menor  = (a: number, b: number): boolean => toCent(a) <  toCent(b);
export const menorIg= (a: number, b: number): boolean => toCent(a) <= toCent(b);
export const maior  = (a: number, b: number): boolean => toCent(a) >  toCent(b);
export const maiorIg= (a: number, b: number): boolean => toCent(a) >= toCent(b);
