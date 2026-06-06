import { describe, it, expect } from "vitest";
import {
  recalcularAtivo,
  eventosVenda,
  type AtivoInfo,
  type LancamentoInput,
} from "@/lib/domain/portfolio";

const ATIVO: AtivoInfo = { id: "a1", ticker: "MXRF11", nome: "MXRF", segmento: "Papel", precoAtual: null };

let SEQ = 0;
const id = () => `l${++SEQ}`;
const d = (iso: string) => new Date(iso + "T12:00:00Z");
const compra = (data: string, qtd: number, preco: number): LancamentoInput => ({
  id: id(), tipo: "COMPRA", data: d(data), ativoId: "a1", quantidade: qtd, precoUnit: preco, valorTotal: qtd * preco,
});
const venda = (data: string, qtd: number, preco: number): LancamentoInput => ({
  id: id(), tipo: "VENDA", data: d(data), ativoId: "a1", quantidade: qtd, precoUnit: preco, valorTotal: qtd * preco,
});
const amortizacao = (data: string, valor: number): LancamentoInput => ({
  id: id(), tipo: "AMORTIZACAO", data: d(data), ativoId: "a1", quantidade: null, precoUnit: null, valorTotal: valor,
});
const retirada = (data: string, valor: number): LancamentoInput => ({
  id: id(), tipo: "RETIRADA", data: d(data), ativoId: null, quantidade: null, precoUnit: null, valorTotal: valor,
});

describe("AMORTIZACAO", () => {
  it("reduz custo e preço médio sem mexer nas cotas, e não conta como dividendo", () => {
    const e = recalcularAtivo(ATIVO, [
      compra("2024-01-01", 100, 10), // custo 1000, PM 10
      amortizacao("2024-06-01", 200), // devolve 200 de principal
    ]);
    expect(e.cotas).toBe(100);
    expect(e.custoTotal).toBeCloseTo(800, 2);
    expect(e.precoMedio).toBeCloseTo(8, 6);
    expect(e.dividendosTotal).toBe(0);
    expect(e.amortizacoesTotal).toBeCloseTo(200, 2);
  });

  it("não deixa o custo ficar negativo", () => {
    const e = recalcularAtivo(ATIVO, [
      compra("2024-01-01", 10, 10), // custo 100
      amortizacao("2024-06-01", 150), // devolve mais que o custo
    ]);
    expect(e.custoTotal).toBe(0);
    expect(e.precoMedio).toBe(0);
    expect(e.amortizacoesTotal).toBeCloseTo(150, 2);
  });

  it("aumenta o lucro da venda seguinte (custo menor)", () => {
    const ev = eventosVenda([
      compra("2024-01-01", 100, 10), // PM 10
      amortizacao("2024-03-01", 200), // PM cai p/ 8
      venda("2024-06-01", 100, 12),   // lucro = (12-8)*100 = 400
    ]);
    expect(ev).toHaveLength(1);
    expect(ev[0].precoMedio).toBeCloseTo(8, 6);
    expect(ev[0].lucro).toBeCloseTo(400, 2);
  });
});

describe("RETIRADA", () => {
  it("não afeta posição nem custo de nenhum ativo", () => {
    const e = recalcularAtivo(ATIVO, [
      compra("2024-01-01", 100, 10),
      retirada("2024-02-01", 500),
    ]);
    expect(e.cotas).toBe(100);
    expect(e.custoTotal).toBeCloseTo(1000, 2);
    expect(e.amortizacoesTotal).toBe(0);
  });
});
