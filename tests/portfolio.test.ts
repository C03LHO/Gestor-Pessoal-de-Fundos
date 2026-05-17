import { describe, it, expect } from "vitest";
import {
  recalcularAtivo,
  recalcularPortfolio,
  validarVenda,
  cotasAtuais,
  cotasNaData,
  type AtivoInfo,
  type LancamentoInput,
} from "@/lib/domain/portfolio";

const ATIVO: AtivoInfo = {
  id: "a1",
  ticker: "HGLG11",
  nome: "HGLG",
  segmento: "Log",
  precoAtual: null,
};

let SEQ = 0;
const id = () => `l${++SEQ}`;
const d = (iso: string) => new Date(iso + "T12:00:00Z");
const compra = (data: string, qtd: number, preco: number): LancamentoInput => ({
  id: id(),
  tipo: "COMPRA",
  data: d(data),
  ativoId: "a1",
  quantidade: qtd,
  precoUnit: preco,
  valorTotal: qtd * preco,
});
const venda = (data: string, qtd: number, preco: number): LancamentoInput => ({
  id: id(),
  tipo: "VENDA",
  data: d(data),
  ativoId: "a1",
  quantidade: qtd,
  precoUnit: preco,
  valorTotal: qtd * preco,
});
const dividendo = (data: string, valor: number): LancamentoInput => ({
  id: id(),
  tipo: "DIVIDENDO",
  data: d(data),
  ativoId: "a1",
  quantidade: null,
  precoUnit: null,
  valorTotal: valor,
});

describe("Cenário 1 — compra/compra/venda parcial", () => {
  it("PM ponderado e lucro só sobre o que foi vendido", () => {
    const lancs = [
      compra("2025-01-10", 100, 10),
      compra("2025-02-10", 100, 20),
      venda("2025-03-10", 50, 30),
    ];
    const e = recalcularAtivo(ATIVO, lancs);
    expect(e.cotas).toBe(150);
    // Antes da venda: 200 cotas, custo 3000, PM=15. Vende 50@30 -> custo baixa 750
    expect(e.custoTotal).toBe(2250);
    expect(e.precoMedio).toBe(15);
    // Lucro realizado: (30-15)*50 = 750
    expect(e.lucroRealizado).toBe(750);
    expect(e.ciclos).toBe(0);
  });
});

describe("Cenário 2 — zerou e recomprou: ciclo novo", () => {
  it("nova compra inicia base nova de PM e mantém lucro realizado", () => {
    const lancs = [
      compra("2025-01-10", 100, 10),
      venda("2025-03-10", 100, 15),
      compra("2025-04-10", 100, 12),
    ];
    const e = recalcularAtivo(ATIVO, lancs);
    expect(e.cotas).toBe(100);
    expect(e.precoMedio).toBe(12); // ciclo novo
    expect(e.custoTotal).toBe(1200);
    expect(e.lucroRealizado).toBe(500); // (15-10)*100
    expect(e.ciclos).toBe(1);
  });
});

describe("Cenário 3 — múltiplas vendas + recompra", () => {
  it("recalcula custo remanescente corretamente", () => {
    const lancs = [
      compra("2025-01-10", 200, 10),       // 200@10, custo 2000
      venda("2025-02-01", 80, 12),         // resta 120, custo 1200, lucro (12-10)*80=160
      venda("2025-02-15", 50, 11),         // resta 70, custo 700, lucro +(11-10)*50=50
      compra("2025-03-01", 30, 13),        // resta 100, custo 700+390=1090, PM=10.9
    ];
    const e = recalcularAtivo(ATIVO, lancs);
    expect(e.cotas).toBe(100);
    expect(e.custoTotal).toBe(1090);
    expect(e.precoMedio).toBe(10.9);
    expect(e.lucroRealizado).toBe(210);
    expect(e.ciclos).toBe(0);
  });
});

describe("Cenário 4 — lançamentos fora de ordem", () => {
  it("reordena por data antes de calcular", () => {
    // Mesmo problema do cenário 1, mas inserido em ordem caótica
    const lancs = [
      venda("2025-03-10", 50, 30),
      compra("2025-01-10", 100, 10),
      compra("2025-02-10", 100, 20),
    ];
    const e = recalcularAtivo(ATIVO, lancs);
    expect(e.cotas).toBe(150);
    expect(e.precoMedio).toBe(15);
    expect(e.lucroRealizado).toBe(750);
  });
});

describe("Cenário 5 — venda > posição", () => {
  it("gera warning e limita à posição existente, sem deixar negativo", () => {
    const lancs = [
      compra("2025-01-10", 10, 10),
      venda("2025-02-10", 50, 15), // venda > disponível
    ];
    const e = recalcularAtivo(ATIVO, lancs);
    expect(e.warnings.length).toBe(1);
    expect(e.warnings[0]).toMatch(/excede posição/);
    expect(e.cotas).toBe(0);
    expect(e.custoTotal).toBe(0);
    // Lucro real conta o que foi efetivamente vendido (10 cotas a 15 = 150, custo 100)
    expect(e.lucroRealizado).toBe(50);
  });

  it("validarVenda rejeita ANTES de gravar", () => {
    const lancs = [compra("2025-01-10", 10, 10)];
    const erro = validarVenda(lancs, d("2025-02-10"), 50);
    expect(erro).toMatch(/excede posição/);
    expect(validarVenda(lancs, d("2025-02-10"), 5)).toBeNull();
  });

  it("validarVenda considera vendas anteriores", () => {
    const lancs = [compra("2025-01-10", 10, 10), venda("2025-01-15", 7, 12)];
    const erro = validarVenda(lancs, d("2025-02-10"), 5);
    expect(erro).toMatch(/excede posição/); // só 3 disponíveis
    expect(validarVenda(lancs, d("2025-02-10"), 3)).toBeNull();
  });
});

describe("Cenário 6 — zerar e recomprar meses depois", () => {
  it("recompra não herda PM antigo", () => {
    const lancs = [
      compra("2025-01-10", 100, 50),    // PM 50
      venda("2025-02-10", 100, 80),     // zera, lucro 3000
      // Nenhuma operação por 5 meses
      compra("2025-07-15", 50, 30),     // novo ciclo, PM 30
    ];
    const e = recalcularAtivo(ATIVO, lancs);
    expect(e.cotas).toBe(50);
    expect(e.precoMedio).toBe(30); // 30, não algum mix com 50
    expect(e.custoTotal).toBe(1500);
    expect(e.lucroRealizado).toBe(3000);
    expect(e.ciclos).toBe(1);
  });
});

describe("Cenário 7 — dividendos não afetam PM nem quantidade", () => {
  it("PM e cotas inalterados pelos dividendos", () => {
    const lancs = [
      compra("2025-01-10", 100, 10),
      dividendo("2025-02-10", 80),
      dividendo("2025-03-10", 85),
      compra("2025-04-10", 100, 12),
      dividendo("2025-05-10", 200),
    ];
    const e = recalcularAtivo(ATIVO, lancs);
    expect(e.cotas).toBe(200);
    expect(e.precoMedio).toBe(11); // (1000+1200)/200
    expect(e.dividendosTotal).toBe(365);
  });

  it("REINVESTIMENTO entra como nova compra e altera PM", () => {
    const lancs = [
      compra("2025-01-10", 100, 10),
      {
        id: id(),
        tipo: "REINVESTIMENTO" as const,
        data: d("2025-02-10"),
        ativoId: "a1",
        quantidade: 10,
        precoUnit: 15,
        valorTotal: 150,
      },
    ];
    const e = recalcularAtivo(ATIVO, lancs);
    expect(e.cotas).toBe(110);
    // 1000 + 150 = 1150 / 110
    expect(e.precoMedio).toBeCloseTo(10.4545, 3);
  });
});

describe("Tiebreaker — mesma data, COMPRA antes de VENDA", () => {
  it("permite vender o que foi comprado no mesmo dia", () => {
    const lancs = [
      // Cadastrados na ordem oposta de propósito
      venda("2025-01-10", 50, 12),
      compra("2025-01-10", 100, 10),
    ];
    const e = recalcularAtivo(ATIVO, lancs);
    expect(e.warnings.length).toBe(0);
    expect(e.cotas).toBe(50);
    expect(e.lucroRealizado).toBe(100); // (12-10)*50
  });
});

describe("Lucro não realizado usa precoAtual", () => {
  it("calcula valor atual e P&L não realizado com precoAtual", () => {
    const ativoComPreco: AtivoInfo = { ...ATIVO, precoAtual: 15 };
    const lancs = [compra("2025-01-10", 100, 10)];
    const e = recalcularAtivo(ativoComPreco, lancs);
    expect(e.valorAtual).toBe(1500);
    expect(e.lucroNaoRealizado).toBe(500);
  });

  it("sem precoAtual, valorAtual cai pro custoTotal e P&L não realizado é 0", () => {
    const lancs = [compra("2025-01-10", 100, 10)];
    const e = recalcularAtivo(ATIVO, lancs);
    expect(e.valorAtual).toBe(1000);
    expect(e.lucroNaoRealizado).toBe(0);
  });
});

describe("Precisão monetária", () => {
  it("100 compras de 0,10 cada não dão drift", () => {
    const lancs = Array.from({ length: 100 }, (_, i) =>
      compra(`2025-01-${String((i % 27) + 1).padStart(2, "0")}`, 1, 0.10),
    );
    const e = recalcularAtivo(ATIVO, lancs);
    expect(e.custoTotal).toBe(10);
    expect(e.cotas).toBe(100);
  });
});

describe("Consolidado da carteira", () => {
  it("agrega múltiplos ativos com posição diferente", () => {
    const a: AtivoInfo = { ...ATIVO, id: "a", ticker: "AAA", precoAtual: 12 };
    const b: AtivoInfo = { ...ATIVO, id: "b", ticker: "BBB", precoAtual: 20 };
    const lancs: LancamentoInput[] = [
      { ...compra("2025-01-01", 100, 10), ativoId: "a" },
      { ...compra("2025-02-01", 50, 15), ativoId: "b" },
      { ...venda("2025-03-01", 25, 18), ativoId: "b" },
      { ...dividendo("2025-04-01", 80), ativoId: "a" },
    ];
    const r = recalcularPortfolio([a, b], lancs);
    expect(r.ativos.length).toBe(2);
    const aRes = r.ativos.find((x) => x.ticker === "AAA")!;
    const bRes = r.ativos.find((x) => x.ticker === "BBB")!;
    expect(aRes.cotas).toBe(100);
    expect(aRes.valorAtual).toBe(1200);
    expect(bRes.cotas).toBe(25);
    expect(bRes.lucroRealizado).toBe(75); // (18-15)*25
    expect(r.consolidado.custoTotal).toBe(1000 + 375); // a:1000 + b: 375 remanescente
    expect(r.consolidado.lucroRealizado).toBe(75);
    expect(r.consolidado.dividendosTotal).toBe(80);
  });
});

describe("cotasAtuais e cotasNaData", () => {
  it("cotasAtuais reflete soma final", () => {
    const lancs = [
      compra("2025-01-10", 100, 10),
      venda("2025-02-10", 30, 12),
      compra("2025-03-10", 50, 11),
    ];
    expect(cotasAtuais(lancs)).toBe(120);
  });

  it("cotasNaData só conta lançamentos até a data", () => {
    const lancs = [
      compra("2025-01-10", 100, 10),
      venda("2025-02-10", 30, 12),
      compra("2025-03-10", 50, 11),
    ];
    expect(cotasNaData(lancs, d("2025-01-15"))).toBe(100);
    expect(cotasNaData(lancs, d("2025-02-20"))).toBe(70);
    expect(cotasNaData(lancs, d("2025-04-01"))).toBe(120);
  });
});
