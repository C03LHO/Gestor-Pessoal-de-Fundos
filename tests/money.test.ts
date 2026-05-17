import { describe, it, expect } from "vitest";
import { somar, somarLista, subtrair, multiplicar, igual, menor, maiorIg, toCent, toReais } from "@/lib/money";

describe("money — precisão", () => {
  it("0.1 + 0.2 === 0.3 (sem drift)", () => {
    expect(somar(0.1, 0.2)).toBe(0.3);
  });

  it("soma de 100 lançamentos de 0.1 = 10.0 exato", () => {
    const r = somar(...Array(100).fill(0.1));
    expect(r).toBe(10);
  });

  it("soma de valores grandes com centavos", () => {
    expect(somar(9157.05, 532.95, 549)).toBe(10239);
  });

  it("somarLista de objetos", () => {
    const items = [
      { valor: 9.92 }, { valor: 9.69 }, { valor: 9.50 },
    ];
    expect(somarLista(items, x => x.valor)).toBe(29.11);
  });

  it("subtração não acumula erro", () => {
    expect(subtrair(10.30, 10.10)).toBe(0.2);
  });

  it("multiplicação preço × qtd", () => {
    expect(multiplicar(9.69, 945)).toBe(9157.05);
  });

  it("igualdade ignora drift de float", () => {
    expect(igual(0.1 + 0.2, 0.3)).toBe(true);
  });

  it("menor com epsilon comum funciona", () => {
    expect(menor(9999.99, 10000)).toBe(true);
    expect(menor(10000, 9999.99)).toBe(false);
  });

  it("maiorIg quando bate meta exata", () => {
    expect(maiorIg(1500, 1500)).toBe(true);
  });

  it("conversões reais ↔ centavos", () => {
    expect(toCent(9.69)).toBe(969);
    expect(toReais(969)).toBe(9.69);
  });
});
