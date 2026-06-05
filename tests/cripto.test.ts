import { describe, it, expect } from "vitest";
import {
  recalcularCripto,
  type CryptoTxInput,
  type PrecoInput,
} from "@/lib/cripto/carteira";

const ID = "kaspa";
let SEQ = 0;
const id = () => `t${++SEQ}`;
const d = (iso: string) => new Date(iso + "T12:00:00Z");

const tx = (
  tipo: CryptoTxInput["tipo"],
  data: string,
  quantidade: number,
  valorTotal: number,
): CryptoTxInput => ({ id: id(), tipo, data: d(data), cryptoId: ID, quantidade, valorTotal });

const precos = (precoBrl: number): PrecoInput[] => [
  { cryptoId: ID, precoBrl, variacao24h: null },
];

function pos(transacoes: CryptoTxInput[], precoBrl = 0) {
  return recalcularCripto(transacoes, precos(precoBrl)).find((p) => p.cryptoId === ID)!;
}

describe("recalcularCripto", () => {
  it("compra simples calcula custo, quantidade e PM", () => {
    const p = pos([tx("COMPRA", "2024-01-01", 1000, 500)]);
    expect(p.quantidade).toBe(1000);
    expect(p.custoTotal).toBe(500);
    expect(p.precoMedio).toBeCloseTo(0.5, 6);
  });

  it("duas compras ponderam o preço médio", () => {
    const p = pos([
      tx("COMPRA", "2024-01-01", 1000, 500), // 0,50/un
      tx("COMPRA", "2024-02-01", 1000, 1500), // 1,50/un
    ]);
    expect(p.quantidade).toBe(2000);
    expect(p.custoTotal).toBe(2000);
    expect(p.precoMedio).toBeCloseTo(1.0, 6);
  });

  it("venda parcial baixa custo médio e apura lucro realizado", () => {
    const p = pos([
      tx("COMPRA", "2024-01-01", 1000, 1000), // PM 1,00
      tx("VENDA", "2024-03-01", 400, 600), // vendeu 400 por 600 (1,50/un)
    ]);
    expect(p.quantidade).toBe(600);
    // custo baixado = 400 × 1,00 = 400 → custo remanescente 600
    expect(p.custoTotal).toBeCloseTo(600, 2);
    // lucro = 600 − 400 = 200
    expect(p.lucroRealizado).toBeCloseTo(200, 2);
  });

  it("venda total zera posição e custo", () => {
    const p = pos([
      tx("COMPRA", "2024-01-01", 500, 500),
      tx("VENDA", "2024-03-01", 500, 800),
    ]);
    expect(p.quantidade).toBe(0);
    expect(p.custoTotal).toBe(0);
    expect(p.lucroRealizado).toBeCloseTo(300, 2);
  });

  it("mineração/transferência entram sem custo (toda valorização vira lucro não realizado)", () => {
    const p = pos([tx("MINERACAO", "2024-01-01", 1000, 0)], 2); // preço atual 2,00
    expect(p.quantidade).toBe(1000);
    expect(p.custoTotal).toBe(0);
    expect(p.precoMedio).toBe(0);
    expect(p.valorAtual).toBeCloseTo(2000, 2);
    expect(p.lucroNaoRealizado).toBeCloseTo(2000, 2);
  });

  it("lucro não realizado usa o preço atual", () => {
    const p = pos([tx("COMPRA", "2024-01-01", 100, 1000)], 15); // custo 1000, agora vale 1500
    expect(p.valorAtual).toBeCloseTo(1500, 2);
    expect(p.lucroNaoRealizado).toBeCloseTo(500, 2);
    expect(p.lucroNaoRealizadoPct).toBeCloseTo(50, 4);
  });

  it("não acumula drift de float em série longa de compras", () => {
    // 100 compras de R$ 0,10 cada → custo exato de R$ 10,00 (sem drift IEEE-754)
    const txs = Array.from({ length: 100 }, () => tx("COMPRA", "2024-01-01", 1, 0.1));
    const p = pos(txs);
    expect(p.custoTotal).toBe(10);
    expect(p.quantidade).toBe(100);
  });

  it("ordena por data independente da ordem de entrada", () => {
    const a = pos([
      tx("VENDA", "2024-03-01", 100, 200),
      tx("COMPRA", "2024-01-01", 100, 100),
    ]);
    // a venda só é válida porque a compra (data anterior) é processada antes
    expect(a.quantidade).toBe(0);
    expect(a.lucroRealizado).toBeCloseTo(100, 2);
  });
});
