import { describe, it, expect } from "vitest";
import {
  retornosMensais,
  indiceAcumulado,
  cagr,
  maxDrawdown,
  sharpe,
  calcularMetricas,
  type PontoPatrimonio,
} from "@/lib/domain/metricas";

describe("retornosMensais (ajustado por fluxo)", () => {
  it("sem aporte: retorno é a variação pura do valor", () => {
    const serie: PontoPatrimonio[] = [
      { valor: 1000, investido: 1000 },
      { valor: 1100, investido: 1000 },
    ];
    expect(retornosMensais(serie)[0]).toBeCloseTo(0.1, 6);
  });

  it("aporte no mês não conta como retorno", () => {
    // Começa com 1000, aporta 1000 (custo sobe p/ 2000), valor vira 2000 → retorno ~0
    const serie: PontoPatrimonio[] = [
      { valor: 1000, investido: 1000 },
      { valor: 2000, investido: 2000 },
    ];
    // base = 1000 + 1000/2 = 1500; (2000 - 1000 - 1000)/1500 = 0
    expect(retornosMensais(serie)[0]).toBeCloseTo(0, 6);
  });

  it("aporte + valorização separa o retorno do aporte", () => {
    const serie: PontoPatrimonio[] = [
      { valor: 1000, investido: 1000 },
      { valor: 2150, investido: 2000 }, // aporte 1000 + ganho 150
    ];
    // base = 1500; (2150 - 1000 - 1000)/1500 = 150/1500 = 0,10
    expect(retornosMensais(serie)[0]).toBeCloseTo(0.1, 6);
  });
});

describe("maxDrawdown", () => {
  it("queda do pico ao vale", () => {
    const idx = indiceAcumulado([0.1, -0.2, 0.05]); // 1 →1.1 →0.88 →0.924
    // pico 1.1, vale 0.88 → dd = (1.1-0.88)/1.1 = 0.2
    expect(maxDrawdown(idx)).toBeCloseTo(0.2, 6);
  });

  it("série só de alta → drawdown 0", () => {
    expect(maxDrawdown(indiceAcumulado([0.05, 0.05, 0.05]))).toBe(0);
  });
});

describe("cagr", () => {
  it("12 meses de +1% ≈ 12,68% a.a.", () => {
    const r = Array.from({ length: 12 }, () => 0.01);
    expect(cagr(r)).toBeCloseTo(Math.pow(1.01, 12) - 1, 6);
  });

  it("24 meses dobrando → ~41,4% a.a.", () => {
    // total ×2 em 2 anos → 2^(1/2)-1
    const r = Array.from({ length: 24 }, () => Math.pow(2, 1 / 24) - 1);
    expect(cagr(r)).toBeCloseTo(Math.SQRT2 - 1, 4);
  });
});

describe("sharpe", () => {
  it("retorno constante acima do rf → desvio 0 → sharpe 0", () => {
    expect(sharpe([0.01, 0.01, 0.01], 0)).toBe(0);
  });

  it("positivo quando excesso médio > 0 com variância", () => {
    const s = sharpe([0.02, 0.01, 0.03, 0.0], 0.005);
    expect(s).toBeGreaterThan(0);
  });

  it("rf maior que retornos → sharpe negativo", () => {
    const s = sharpe([0.01, 0.0, 0.02, -0.01], 0.05);
    expect(s).toBeLessThan(0);
  });
});

describe("calcularMetricas", () => {
  it("integra as três métricas e expõe nº de meses", () => {
    const serie: PontoPatrimonio[] = [
      { valor: 1000, investido: 1000 },
      { valor: 1100, investido: 1000 },
      { valor: 1050, investido: 1000 },
      { valor: 1200, investido: 1000 },
    ];
    const m = calcularMetricas(serie, 0.02);
    expect(m.meses).toBe(3);
    expect(m.maxDrawdown).toBeGreaterThan(0);
    expect(Number.isFinite(m.cagr)).toBe(true);
    expect(Number.isFinite(m.sharpe)).toBe(true);
  });

  it("série vazia/curta não quebra", () => {
    const m = calcularMetricas([{ valor: 1000, investido: 1000 }], null);
    expect(m.meses).toBe(0);
    expect(m.cagr).toBe(0);
    expect(m.maxDrawdown).toBe(0);
    expect(m.sharpe).toBe(0);
  });
});
