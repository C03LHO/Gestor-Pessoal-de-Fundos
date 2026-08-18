/**
 * Planejamento puro da sincronização de dividendos — sem I/O, testável.
 *
 * O problema central: a fonte externa e o que já está gravado usam convenções de
 * data diferentes (Yahoo devolve ex-date, Fundamentus data de pagamento), então
 * casar por data exata cria duplicata e casar por mês perde o segundo pagamento
 * de um mês. A estratégia aqui é parear por data exata primeiro e, para o que
 * sobrar dentro do mesmo mês, parear em ordem cronológica. Só o excedente vira
 * lançamento novo.
 *
 * Invariantes (cobertas por teste em tests/sync-dividendos.test.ts):
 *  - nunca produz dois updates para o mesmo id;
 *  - nunca cria lançamento para uma distribuição que já tem par;
 *  - nunca altera lançamento que o usuário digitou (observação sem "Auto (").
 */

export type DivExterno = { data: Date; valor: number };

export type LancDividendo = {
  id: string;
  data: Date;
  valorTotal: number;
  observacao: string | null;
};

export type PlanoCriar = {
  data: Date;
  valor: number;
  valorPorCota: number;
  cotas: number;
  key: string;
};

export type PlanoAtualizar = {
  id: string;
  valorAntigo: number;
  valorNovo: number;
  cotas: number;
  valorPorCota: number;
};

export type Plano = {
  criar: PlanoCriar[];
  atualizar: PlanoAtualizar[];
  /** Pareados mas deixados intactos, com o motivo. Serve para log/diagnóstico. */
  preservados: { id: string; motivo: "manual" | "sem_mudanca" }[];
};

/** Marca que a própria sync escreveu a observação. Ver `observacaoAuto`. */
const MARCA_AUTO = "Auto (";

export function observacaoAuto(fonte: string, valorPorCota: number, cotas: number, recalc = false) {
  return `${MARCA_AUTO}${fonte}) — ${valorPorCota.toFixed(4)}/cota × ${cotas}${recalc ? " (recalc)" : ""}`;
}

function foiCriadoPelaSync(l: LancDividendo): boolean {
  return (l.observacao ?? "").startsWith(MARCA_AUTO);
}

export function arred(v: number): number {
  return Math.round(v * 100) / 100;
}

const mes = (d: Date) => d.toISOString().slice(0, 7);
const dia = (d: Date) => d.toISOString().slice(0, 10);

function agrupaPorMes<T>(itens: T[], data: (t: T) => Date): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of itens) {
    const k = mes(data(it));
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

/**
 * @param existentes lançamentos DIVIDENDO já gravados para o ativo/carteira
 * @param divs       distribuições vindas da fonte externa
 * @param cotasEm    posição do usuário numa data (0 => distribuição ignorada)
 */
export function planejarSyncDividendos(
  existentes: LancDividendo[],
  divs: DivExterno[],
  cotasEm: (data: Date) => number,
): Plano {
  const plano: Plano = { criar: [], atualizar: [], preservados: [] };

  // Só interessam distribuições em que já havia posição.
  const candidatos = divs
    .map((d) => {
      const cotas = cotasEm(d.data);
      return { data: d.data, valorPorCota: d.valor, cotas, valor: arred(d.valor * cotas) };
    })
    .filter((c) => c.cotas > 0)
    .sort((a, b) => a.data.getTime() - b.data.getTime());

  const existentesPorMes = agrupaPorMes(existentes, (l) => l.data);
  const candidatosPorMes = agrupaPorMes(candidatos, (c) => c.data);

  for (const [chaveMes, doMes] of candidatosPorMes) {
    const disponiveis = [...(existentesPorMes.get(chaveMes) ?? [])].sort(
      (a, b) => a.data.getTime() - b.data.getTime(),
    );
    const semPar: typeof doMes = [];

    // 1ª passada: data exata. É o caso comum quando a fonte não mudou.
    for (const c of doMes) {
      const i = disponiveis.findIndex((l) => dia(l.data) === dia(c.data));
      if (i >= 0) parear(plano, disponiveis.splice(i, 1)[0], c);
      else semPar.push(c);
    }

    // 2ª passada: sobra do mês pareada em ordem cronológica. Cobre a diferença
    // ex-date/pagamento sem inventar duplicata para o histórico já gravado.
    for (const c of semPar) {
      const par = disponiveis.shift();
      if (par) parear(plano, par, c);
      else plano.criar.push({ ...c, key: chaveMes });
    }
  }

  return plano;
}

function parear(plano: Plano, existente: LancDividendo, c: { valor: number; cotas: number; valorPorCota: number }) {
  // Valor digitado pelo usuário é a fonte da verdade — a estimativa da API não
  // pode sobrescrever o que veio do informe de rendimentos.
  if (!foiCriadoPelaSync(existente)) {
    plano.preservados.push({ id: existente.id, motivo: "manual" });
    return;
  }
  if (Math.abs(arred(existente.valorTotal) - c.valor) < 0.01) {
    plano.preservados.push({ id: existente.id, motivo: "sem_mudanca" });
    return;
  }
  plano.atualizar.push({
    id: existente.id,
    valorAntigo: existente.valorTotal,
    valorNovo: c.valor,
    cotas: c.cotas,
    valorPorCota: c.valorPorCota,
  });
}
