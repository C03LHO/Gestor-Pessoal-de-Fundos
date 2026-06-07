import { describe, it, expect } from "vitest";
import { rsi, macd } from "@/lib/cripto/analise";

const cresc = (n: number, base = 100, passo = 1) =>
  Array.from({ length: n }, (_, i) => base + i * passo);
const decresc = (n: number, base = 200, passo = 1) =>
  Array.from({ length: n }, (_, i) => base - i * passo);

describe("rsi", () => {
  it("retorna null sem pontos suficientes", () => {
    expect(rsi([1, 2, 3])).toBeNull();
  });

  it("série só de alta → 100", () => {
    expect(rsi(cresc(30))).toBe(100);
  });

  it("série só de queda → 0", () => {
    expect(rsi(decresc(30))).toBe(0);
  });

  it("fica sempre entre 0 e 100", () => {
    const serie = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 10);
    const v = rsi(serie)!;
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  });
});

describe("macd", () => {
  it("retorna null sem pontos suficientes", () => {
    expect(macd(cresc(20))).toBeNull();
  });

  it("série constante → macd, sinal e histograma ~0", () => {
    const m = macd(Array(60).fill(100))!;
    expect(m.macd).toBeCloseTo(0, 6);
    expect(m.sinal).toBeCloseTo(0, 6);
    expect(m.histograma).toBeCloseTo(0, 6);
  });

  it("tendência de alta → linha MACD positiva", () => {
    const m = macd(cresc(80))!;
    expect(m.macd).toBeGreaterThan(0);
  });

  it("tendência de baixa → linha MACD negativa", () => {
    const m = macd(decresc(80))!;
    expect(m.macd).toBeLessThan(0);
  });
});
