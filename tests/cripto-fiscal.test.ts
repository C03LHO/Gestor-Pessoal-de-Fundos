import { describe, it, expect } from "vitest";
import { apurarCriptoMes } from "@/lib/cripto/fiscal";
import type { CryptoTxInput } from "@/lib/cripto/carteira";

const ID = "bitcoin";
let SEQ = 0;
const id = () => `t${++SEQ}`;
const d = (iso: string) => new Date(iso + "T12:00:00Z");
const tx = (
  tipo: CryptoTxInput["tipo"],
  data: string,
  quantidade: number,
  valorTotal: number,
): CryptoTxInput => ({ id: id(), tipo, data: d(data), cryptoId: ID, quantidade, valorTotal });

describe("apurarCriptoMes", () => {
  it("sem vendas no mês → sem DARF, isento", () => {
    const r = apurarCriptoMes([tx("COMPRA", "2024-01-10", 1, 100000)], 2024, 3);
    expect(r.operacoes).toHaveLength(0);
    expect(r.darf).toBe(0);
    expect(r.isento).toBe(true);
  });

  it("venda abaixo de R$ 35.000 no mês → isento mesmo com lucro", () => {
    const r = apurarCriptoMes(
      [
        tx("COMPRA", "2024-01-10", 1, 10000),
        tx("VENDA", "2024-03-05", 1, 30000), // lucro 20k, mas vendas < 35k
      ],
      2024,
      3,
    );
    expect(r.totalVendasMes).toBe(30000);
    expect(r.lucroTotalMes).toBeCloseTo(20000, 2);
    expect(r.isento).toBe(true);
    expect(r.darf).toBe(0);
  });

  it("venda acima de R$ 35.000 com lucro → 15% sobre o lucro", () => {
    const r = apurarCriptoMes(
      [
        tx("COMPRA", "2024-01-10", 1, 20000),
        tx("VENDA", "2024-03-05", 1, 50000), // lucro 30k, vendas 50k > 35k
      ],
      2024,
      3,
    );
    expect(r.isento).toBe(false);
    expect(r.lucroTotalMes).toBeCloseTo(30000, 2);
    expect(r.darf).toBeCloseTo(4500, 2); // 30000 * 0.15
  });

  it("acima do limite mas com prejuízo → sem DARF", () => {
    const r = apurarCriptoMes(
      [
        tx("COMPRA", "2024-01-10", 1, 60000),
        tx("VENDA", "2024-03-05", 1, 40000), // prejuízo, vendas > 35k
      ],
      2024,
      3,
    );
    expect(r.isento).toBe(false);
    expect(r.lucroTotalMes).toBeLessThan(0);
    expect(r.darf).toBe(0);
  });

  it("soma alienações de várias moedas no mês para o limite", () => {
    const txs: CryptoTxInput[] = [
      { id: id(), tipo: "COMPRA", data: d("2024-01-01"), cryptoId: "bitcoin", quantidade: 1, valorTotal: 10000 },
      { id: id(), tipo: "COMPRA", data: d("2024-01-01"), cryptoId: "kaspa", quantidade: 1000, valorTotal: 5000 },
      { id: id(), tipo: "VENDA", data: d("2024-03-02"), cryptoId: "bitcoin", quantidade: 1, valorTotal: 20000 },
      { id: id(), tipo: "VENDA", data: d("2024-03-03"), cryptoId: "kaspa", quantidade: 1000, valorTotal: 20000 },
    ];
    const r = apurarCriptoMes(txs, 2024, 3);
    expect(r.totalVendasMes).toBe(40000); // 20k + 20k > 35k
    expect(r.isento).toBe(false);
    // lucro: (20000-10000) + (20000-5000) = 25000 → darf 3750
    expect(r.lucroTotalMes).toBeCloseTo(25000, 2);
    expect(r.darf).toBeCloseTo(3750, 2);
  });

  it("mineração (custo zero): venda inteira é lucro", () => {
    const r = apurarCriptoMes(
      [
        tx("MINERACAO", "2024-01-10", 1000, 0),
        tx("VENDA", "2024-03-05", 1000, 40000),
      ],
      2024,
      3,
    );
    expect(r.lucroTotalMes).toBeCloseTo(40000, 2);
    expect(r.isento).toBe(false);
    expect(r.darf).toBeCloseTo(6000, 2);
  });

  it("considera apenas vendas do mês/ano alvo", () => {
    const r = apurarCriptoMes(
      [
        tx("COMPRA", "2024-01-10", 2, 20000),
        tx("VENDA", "2024-02-05", 1, 40000), // fora do alvo (fev)
        tx("VENDA", "2024-03-05", 1, 50000), // alvo (mar)
      ],
      2024,
      3,
    );
    expect(r.operacoes).toHaveLength(1);
    expect(r.totalVendasMes).toBe(50000);
  });
});
