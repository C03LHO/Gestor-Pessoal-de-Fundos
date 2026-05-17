import { describe, it, expect } from "vitest";
import { analisarValuation } from "@/lib/domain/valuation";

// série uniforme 10..30 (200 pontos)
const serie200 = Array.from({ length: 200 }, (_, i) => 10 + (i * 20) / 199);

describe("Valuation — núcleo", () => {
  it("preço atual no quartil inferior → barato/muito_barato", () => {
    const v = analisarValuation(serie200, 12); // ~10% acima da mín
    expect(["muito_barato", "barato"]).toContain(v.classe);
    expect(v.percentilHistorico).toBeLessThan(25);
    expect(v.score).toBeGreaterThan(60);
    expect(v.confianca).toBe("alta");
  });

  it("preço atual perto da mediana → justo", () => {
    const v = analisarValuation(serie200, 20);
    expect(v.classe).toBe("justo");
    expect(v.percentilHistorico).toBeGreaterThan(40);
    expect(v.percentilHistorico).toBeLessThan(60);
  });

  it("preço atual perto da máxima → muito_caro", () => {
    const v = analisarValuation(serie200, 29.5);
    expect(["caro", "muito_caro"]).toContain(v.classe);
    expect(v.score).toBeLessThan(30);
  });
});

describe("Valuation — confiança baixa quando histórico curto", () => {
  it("menos de 30 pontos → confiança baixa + aviso", () => {
    const v = analisarValuation([10, 11, 12, 13, 14, 15], 11);
    expect(v.confianca).toBe("baixa");
    expect(v.avisos.some((a) => a.includes("curto"))).toBe(true);
  });

  it("60..199 pontos → confiança média", () => {
    const serie = Array.from({ length: 100 }, (_, i) => 10 + i * 0.1);
    const v = analisarValuation(serie, 11);
    expect(v.confianca).toBe("media");
  });
});

describe("Valuation — sem dados", () => {
  it("array vazio retorna estrutura segura com classe justo", () => {
    const v = analisarValuation([], 15);
    expect(v.classe).toBe("justo");
    expect(v.confianca).toBe("baixa");
    expect(v.avisos.length).toBeGreaterThan(0);
    expect(v.score).toBe(50);
  });

  it("precoAtual inválido também retorna seguro", () => {
    const v = analisarValuation(serie200, 0);
    expect(v.confianca).toBe("baixa");
  });
});

describe("Valuation — borda: todos iguais", () => {
  it("preço atual igual a todos → percentil 50, justo", () => {
    const v = analisarValuation([10, 10, 10, 10, 10, 10, 10, 10, 10, 10], 10);
    expect(v.percentilHistorico).toBeCloseTo(50, 0);
    expect(v.posicaoLinear).toBe(50);
    expect(v.classe).toBe("justo");
  });
});

describe("Valuation — outlier não enviesa", () => {
  it("um pico alto não faz tudo parecer 'barato' (percentil real, não linear)", () => {
    // 99 valores em 10, 1 valor em 1000. Atual = 10.
    const precos = [...Array(99).fill(10), 1000];
    const v = analisarValuation(precos, 10);
    // Linear seria ~0% → "muito_barato". Mas percentil verdadeiro é ~50.
    expect(v.percentilHistorico).toBeGreaterThan(40);
    expect(v.percentilHistorico).toBeLessThan(60);
    expect(v.classe).toBe("justo");
  });
});

describe("Valuation — override por desvio de mediana", () => {
  it("percentil baixo mas 25% acima da mediana → escala pra 'caro'", () => {
    // 80% dos preços em 10, 20% em 50 → mediana = 10. Atual 13 = +30% mediana.
    // Percentil ~80 (atual > 80% dos preços), mas o override deve bater antes.
    const precos = [...Array(80).fill(10), ...Array(20).fill(50)];
    const v = analisarValuation(precos, 13);
    expect(v.mediana).toBe(10);
    expect(v.desvioMediana).toBeCloseTo(0.30, 1);
    expect(["caro", "muito_caro"]).toContain(v.classe);
  });

  it("percentil alto mas 25% abaixo da mediana → escala pra 'barato'", () => {
    // 80% em 100, 20% em 30. Mediana=100. Atual 75 = -25% mediana.
    // Como atual=75 está acima de 20% e abaixo de 80% dos pontos → percentil ~20.
    // Mas com desvio -25% da mediana, garante "barato".
    const precos = [...Array(80).fill(100), ...Array(20).fill(30)];
    const v = analisarValuation(precos, 75);
    expect(v.mediana).toBe(100);
    expect(v.desvioMediana).toBeCloseTo(-0.25, 1);
    expect(["muito_barato", "barato"]).toContain(v.classe);
  });
});

describe("Valuation — motivos estruturados", () => {
  it("retorna motivos com peso", () => {
    const v = analisarValuation(serie200, 12);
    expect(v.motivos.length).toBeGreaterThanOrEqual(3);
    expect(v.motivos[0].texto).toMatch(/percentil/);
    expect(["positivo", "negativo", "neutro"]).toContain(v.motivos[0].peso);
  });

  it("preço barato gera ao menos um motivo positivo", () => {
    const v = analisarValuation(serie200, 11);
    expect(v.motivos.some((m) => m.peso === "positivo")).toBe(true);
  });

  it("preço caro gera ao menos um motivo negativo", () => {
    const v = analisarValuation(serie200, 29);
    expect(v.motivos.some((m) => m.peso === "negativo")).toBe(true);
  });
});

describe("Valuation — volatilidade extrema reduz confiança", () => {
  it("CV alto rebaixa confiança 'alta' para 'média'", () => {
    // 200 pontos com CV > 0.6 (alternando 10 e 50)
    const serie = Array.from({ length: 200 }, (_, i) => (i % 2 === 0 ? 10 : 50));
    const v = analisarValuation(serie, 30);
    expect(v.coefVariacao).toBeGreaterThan(0.5);
    expect(v.confianca).not.toBe("alta");
  });
});

describe("Valuation — score consistente", () => {
  it("score(barato) > score(justo) > score(caro)", () => {
    const sBarato = analisarValuation(serie200, 11).score;
    const sJusto = analisarValuation(serie200, 20).score;
    const sCaro = analisarValuation(serie200, 29).score;
    expect(sBarato).toBeGreaterThan(sJusto);
    expect(sJusto).toBeGreaterThan(sCaro);
  });
});
