import { describe, it, expect } from "vitest";
import { eventosVenda, type LancamentoInput } from "@/lib/domain/portfolio";

let SEQ = 0;
const id = () => `l${++SEQ}`;
const d = (iso: string) => new Date(iso + "T12:00:00Z");
const compra = (data: string, qtd: number, preco: number): LancamentoInput => ({
  id: id(), tipo: "COMPRA", data: d(data), ativoId: "a1",
  quantidade: qtd, precoUnit: preco, valorTotal: qtd * preco,
});
const venda = (data: string, qtd: number, preco: number): LancamentoInput => ({
  id: id(), tipo: "VENDA", data: d(data), ativoId: "a1",
  quantidade: qtd, precoUnit: preco, valorTotal: qtd * preco,
});

describe("eventosVenda", () => {
  it("sem vendas → nenhum evento", () => {
    expect(eventosVenda([compra("2024-01-01", 100, 10)])).toHaveLength(0);
  });

  it("venda parcial: PM no momento e lucro corretos", () => {
    const ev = eventosVenda([
      compra("2024-01-01", 100, 10), // PM 10
      venda("2024-03-01", 40, 15),   // vende 40 a 15
    ]);
    expect(ev).toHaveLength(1);
    expect(ev[0].precoMedio).toBeCloseTo(10, 6);
    expect(ev[0].custoBaixado).toBeCloseTo(400, 2);
    expect(ev[0].valorVenda).toBeCloseTo(600, 2);
    expect(ev[0].lucro).toBeCloseTo(200, 2);
    expect(ev[0].quantidade).toBe(40);
  });

  it("duas compras: PM ponderado na venda", () => {
    const ev = eventosVenda([
      compra("2024-01-01", 100, 10), // 1000
      compra("2024-02-01", 100, 20), // 2000 → PM 15
      venda("2024-03-01", 50, 25),
    ]);
    expect(ev[0].precoMedio).toBeCloseTo(15, 6);
    expect(ev[0].lucro).toBeCloseTo(50 * (25 - 15), 2); // 500
  });

  it("venda que excede a posição apura só a parte coberta", () => {
    const ev = eventosVenda([
      compra("2024-01-01", 30, 10),
      venda("2024-03-01", 50, 12), // só 30 cobertas
    ]);
    expect(ev[0].quantidade).toBe(30);
    expect(ev[0].valorVenda).toBeCloseTo(30 * 12, 2);
    expect(ev[0].lucro).toBeCloseTo(30 * (12 - 10), 2);
  });

  it("recompra após zerar inicia base nova (ciclo)", () => {
    const ev = eventosVenda([
      compra("2024-01-01", 100, 10),
      venda("2024-02-01", 100, 12), // zera (lucro 200)
      compra("2024-03-01", 50, 20), // novo ciclo, PM 20
      venda("2024-04-01", 50, 25),  // lucro 250
    ]);
    expect(ev).toHaveLength(2);
    expect(ev[0].lucro).toBeCloseTo(200, 2);
    expect(ev[1].precoMedio).toBeCloseTo(20, 6);
    expect(ev[1].lucro).toBeCloseTo(250, 2);
  });

  it("ordena por data independente da ordem de entrada", () => {
    const ev = eventosVenda([
      venda("2024-03-01", 50, 25),
      compra("2024-01-01", 100, 10),
    ]);
    expect(ev).toHaveLength(1);
    expect(ev[0].lucro).toBeCloseTo(50 * (25 - 10), 2);
  });
});
