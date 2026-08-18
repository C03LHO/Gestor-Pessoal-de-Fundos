import { describe, it, expect } from "vitest";
import {
  planejarSyncDividendos,
  observacaoAuto,
  type LancDividendo,
  type DivExterno,
} from "@/lib/domain/sync-dividendos-plano";

const d = (iso: string) => new Date(iso + "T12:00:00Z");

let SEQ = 0;
const auto = (data: string, valorTotal: number): LancDividendo => ({
  id: `l${++SEQ}`,
  data: d(data),
  valorTotal,
  observacao: observacaoAuto("yahoo", 1, 100),
});
const manual = (data: string, valorTotal: number): LancDividendo => ({
  id: `m${++SEQ}`,
  data: d(data),
  valorTotal,
  observacao: "Informe de rendimentos",
});
const div = (data: string, valor: number): DivExterno => ({ data: d(data), valor });

const cem = () => 100;

describe("planejarSyncDividendos", () => {
  it("cria lançamento para distribuição nova", () => {
    const p = planejarSyncDividendos([], [div("2026-03-15", 1.1)], cem);
    expect(p.criar).toHaveLength(1);
    expect(p.criar[0].valor).toBe(110);
    expect(p.atualizar).toHaveLength(0);
  });

  it("ignora distribuição anterior à posição", () => {
    const p = planejarSyncDividendos([], [div("2026-03-15", 1.1)], () => 0);
    expect(p.criar).toHaveLength(0);
  });

  it("não duplica quando a data exata já existe", () => {
    const p = planejarSyncDividendos([auto("2026-03-15", 110)], [div("2026-03-15", 1.1)], cem);
    expect(p.criar).toHaveLength(0);
    expect(p.atualizar).toHaveLength(0);
    expect(p.preservados[0].motivo).toBe("sem_mudanca");
  });

  // Regressão central: a base atual foi gravada com a convenção de data de uma
  // fonte; se a fonte mudar de convenção, não pode virar duplicata.
  it("não duplica quando a fonte muda de ex-date para data de pagamento", () => {
    const p = planejarSyncDividendos([auto("2026-03-01", 110)], [div("2026-03-14", 1.1)], cem);
    expect(p.criar).toHaveLength(0);
    expect(p.atualizar).toHaveLength(0);
  });

  it("recalcula quando compra retroativa muda o nº de cotas", () => {
    const p = planejarSyncDividendos([auto("2026-03-15", 110)], [div("2026-03-15", 1.1)], () => 150);
    expect(p.criar).toHaveLength(0);
    expect(p.atualizar).toHaveLength(1);
    expect(p.atualizar[0].valorNovo).toBe(165);
  });

  it("NÃO sobrescreve dividendo digitado pelo usuário", () => {
    const p = planejarSyncDividendos([manual("2026-03-15", 107.42)], [div("2026-03-15", 1.1)], cem);
    expect(p.atualizar).toHaveLength(0);
    expect(p.criar).toHaveLength(0);
    expect(p.preservados[0].motivo).toBe("manual");
  });

  it("suporta dois pagamentos no mesmo mês", () => {
    const p = planejarSyncDividendos([], [div("2026-03-05", 1.0), div("2026-03-25", 0.4)], cem);
    expect(p.criar).toHaveLength(2);
    expect(p.criar.map((c) => c.valor).sort((a, b) => a - b)).toEqual([40, 100]);
  });

  it("com 1 gravado e 2 na fonte, pareia um e cria só o excedente", () => {
    const p = planejarSyncDividendos(
      [auto("2026-03-05", 100)],
      [div("2026-03-05", 1.0), div("2026-03-25", 0.4)],
      cem,
    );
    expect(p.criar).toHaveLength(1);
    expect(p.criar[0].valor).toBe(40);
  });

  it("nunca gera dois updates para o mesmo id", () => {
    const p = planejarSyncDividendos(
      [auto("2026-03-05", 1)],
      [div("2026-03-05", 1.0), div("2026-03-06", 2.0), div("2026-03-07", 3.0)],
      cem,
    );
    const ids = p.atualizar.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("é idempotente: rodar sobre o resultado da 1ª sync não muda nada", () => {
    const divs = [div("2026-03-05", 1.0), div("2026-04-05", 1.2)];
    const p1 = planejarSyncDividendos([], divs, cem);
    const gravados: LancDividendo[] = p1.criar.map((c, i) => ({
      id: `g${i}`,
      data: c.data,
      valorTotal: c.valor,
      observacao: observacaoAuto("yahoo", c.valorPorCota, c.cotas),
    }));
    const p2 = planejarSyncDividendos(gravados, divs, cem);
    expect(p2.criar).toHaveLength(0);
    expect(p2.atualizar).toHaveLength(0);
  });

  it("meses distintos não interferem entre si", () => {
    const p = planejarSyncDividendos(
      [auto("2026-03-05", 100)],
      [div("2026-03-05", 1.0), div("2026-04-05", 1.0)],
      cem,
    );
    expect(p.criar).toHaveLength(1);
    expect(p.criar[0].data.toISOString().slice(0, 7)).toBe("2026-04");
  });
});
