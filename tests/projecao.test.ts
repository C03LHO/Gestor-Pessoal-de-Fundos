import { describe, it, expect } from "vitest";
import { mesesAteMeta, rendaProjetada } from "@/lib/domain/projecao";

describe("mesesAteMeta", () => {
  it("retorna 0 se patrimônio já gera renda da meta", () => {
    const m = mesesAteMeta({
      patrimonio: 2_000_000,
      aporteMensal: 0,
      yieldAnual: 0.09,
      metaMensal: 10_000,
    });
    expect(m).toBe(0);
  });

  it("retorna Infinity quando sem aporte e renda < meta", () => {
    const m = mesesAteMeta({
      patrimonio: 1000,
      aporteMensal: 0,
      yieldAnual: 0.09,
      metaMensal: 10_000,
      maxMeses: 12,
    });
    expect(m).toBe(Infinity);
  });

  it("aporte mensal acelera atingir a meta", () => {
    const semAporte = mesesAteMeta({
      patrimonio: 100_000,
      aporteMensal: 0,
      yieldAnual: 0.09,
      metaMensal: 10_000,
    });
    const comAporte = mesesAteMeta({
      patrimonio: 100_000,
      aporteMensal: 5_000,
      yieldAnual: 0.09,
      metaMensal: 10_000,
    });
    expect(comAporte).toBeLessThan(semAporte);
  });

  it("reinvestir true acelera vs reinvestir false", () => {
    const reinv = mesesAteMeta({
      patrimonio: 50_000,
      aporteMensal: 2_000,
      yieldAnual: 0.09,
      metaMensal: 10_000,
      reinvestir: true,
    });
    const semReinv = mesesAteMeta({
      patrimonio: 50_000,
      aporteMensal: 2_000,
      yieldAnual: 0.09,
      metaMensal: 10_000,
      reinvestir: false,
    });
    expect(reinv).toBeLessThan(semReinv);
  });
});

describe("rendaProjetada", () => {
  it("calcula renda mensal a partir de yield anual", () => {
    const r = rendaProjetada(120_000, 0.12);
    // y_mensal = (1.12)^(1/12) - 1 ≈ 0.00949
    expect(r).toBeCloseTo(120_000 * (Math.pow(1.12, 1 / 12) - 1), 4);
  });

  it("renda escala linear com patrimônio", () => {
    const r1 = rendaProjetada(100_000, 0.09);
    const r2 = rendaProjetada(200_000, 0.09);
    expect(r2).toBeCloseTo(r1 * 2, 6);
  });
});
