import { describe, it, expect } from "vitest";
import { regressaoLinear, ehOutlier } from "@/lib/domain/estatistica";

describe("regressaoLinear", () => {
  it("ajusta linha perfeita: y = 2x + 1", () => {
    const pontos = [
      { x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 },
    ];
    const { a, b, r2 } = regressaoLinear(pontos);
    expect(b).toBeCloseTo(2, 5);
    expect(a).toBeCloseTo(1, 5);
    expect(r2).toBeCloseTo(1, 5);
  });

  it("retorna r2 baixo para dados aleatórios", () => {
    const pontos = [
      { x: 0, y: 5 }, { x: 1, y: 1 }, { x: 2, y: 9 }, { x: 3, y: 0 },
    ];
    const { r2 } = regressaoLinear(pontos);
    expect(r2).toBeLessThan(0.5);
  });

  it("lida com 1 ponto sem quebrar", () => {
    const { a, b } = regressaoLinear([{ x: 0, y: 10 }]);
    expect(a).toBe(10);
    expect(b).toBe(0);
  });
});

describe("ehOutlier", () => {
  it("detecta valor extremo numa série estável", () => {
    const amostra = [10, 10.1, 10.2, 9.9, 10, 10.1];
    expect(ehOutlier(50, amostra)).toBe(true);
    expect(ehOutlier(10.05, amostra)).toBe(false);
  });

  it("não acusa outlier em amostra pequena", () => {
    expect(ehOutlier(100, [1, 2])).toBe(false);
  });

  it("não acusa outlier quando todos iguais (mad = 0)", () => {
    expect(ehOutlier(100, [10, 10, 10, 10])).toBe(false);
  });
});
