import { describe, it, expect } from "vitest";
import { simularEvolucao, cenariosPadrao } from "@/lib/domain/simulacao";

describe("simularEvolucao", () => {
  it("retorna série com tamanho meses+1", () => {
    const s = simularEvolucao({
      patrimonioInicial: 10_000,
      aporteMensal: 1000,
      yieldAnual: 0.09,
      reinvestir: true,
      meses: 12,
    });
    expect(s.length).toBe(13);
  });

  it("primeiro ponto = patrimônio inicial", () => {
    const s = simularEvolucao({
      patrimonioInicial: 10_000,
      aporteMensal: 1000,
      yieldAnual: 0.09,
      reinvestir: true,
      meses: 12,
    });
    expect(s[0].patrimonio).toBe(10_000);
  });

  it("reinvestir aumenta patrimônio final", () => {
    const reinv = simularEvolucao({
      patrimonioInicial: 10_000, aporteMensal: 500, yieldAnual: 0.09,
      reinvestir: true, meses: 120,
    });
    const semReinv = simularEvolucao({
      patrimonioInicial: 10_000, aporteMensal: 500, yieldAnual: 0.09,
      reinvestir: false, meses: 120,
    });
    expect(reinv[reinv.length - 1].patrimonio).toBeGreaterThan(semReinv[semReinv.length - 1].patrimonio);
  });
});

describe("cenariosPadrao", () => {
  it("otimista cresce mais que conservador", () => {
    const c = cenariosPadrao({
      patrimonio: 100_000,
      aporteMensal: 1000,
      meses: 120,
      reinvestir: true,
      conservador: 0.06,
      moderado: 0.09,
      otimista: 0.12,
    });
    const ultimo = (arr: { patrimonio: number }[]) => arr[arr.length - 1].patrimonio;
    expect(ultimo(c.otimista)).toBeGreaterThan(ultimo(c.moderado));
    expect(ultimo(c.moderado)).toBeGreaterThan(ultimo(c.conservador));
  });
});
