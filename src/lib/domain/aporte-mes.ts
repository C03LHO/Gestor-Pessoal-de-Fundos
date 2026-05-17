import { prisma } from "../prisma";

export type AporteDoMes = {
  metaMinima: number;        // salário × percentual
  salario: number;
  percentual: number;
  investidoNoMes: number;    // soma de COMPRA + REINVESTIMENTO + APORTE no mês atual
  faltaInvestir: number;
  progresso: number;         // 0..1
  diasRestantesNoMes: number;
  ritmoIdeal: number;        // quanto deveria ter investido até hoje proporcional ao dia
  estaAdiantado: boolean;
  investidoMesAnterior: number;
};

export async function aporteDoMesAtual(carteiraId?: string): Promise<AporteDoMes> {
  const [meta, lancsMes, lancsMesAnt] = await Promise.all([
    prisma.meta.findFirst({ where: { ativa: true } }),
    prisma.lancamento.findMany({
      where: {
        ...(carteiraId ? { carteiraId } : {}),
        tipo: { in: ["COMPRA", "REINVESTIMENTO", "APORTE"] },
        data: { gte: inicioDoMes(), lt: inicioDoProximoMes() },
      },
    }),
    prisma.lancamento.findMany({
      where: {
        ...(carteiraId ? { carteiraId } : {}),
        tipo: { in: ["COMPRA", "REINVESTIMENTO", "APORTE"] },
        data: { gte: inicioDoMesAnterior(), lt: inicioDoMes() },
      },
    }),
  ]);

  const salario = meta?.salarioMensal ?? 0;
  const percentual = meta?.percentualAporte ?? 0.3;
  const metaMinima = salario * percentual;

  const investidoNoMes = lancsMes.reduce((s, l) => s + l.valorTotal, 0);
  const investidoMesAnterior = lancsMesAnt.reduce((s, l) => s + l.valorTotal, 0);

  const hoje = new Date();
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diaAtual = hoje.getDate();
  const diasRestantesNoMes = Math.max(0, ultimoDia - diaAtual);

  const ritmoIdeal = metaMinima * (diaAtual / ultimoDia);
  const estaAdiantado = investidoNoMes >= ritmoIdeal;

  return {
    metaMinima,
    salario,
    percentual,
    investidoNoMes,
    faltaInvestir: Math.max(0, metaMinima - investidoNoMes),
    progresso: metaMinima > 0 ? investidoNoMes / metaMinima : 0,
    diasRestantesNoMes,
    ritmoIdeal,
    estaAdiantado,
    investidoMesAnterior,
  };
}

function inicioDoMes() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}
function inicioDoProximoMes() {
  const d = inicioDoMes(); d.setMonth(d.getMonth() + 1); return d;
}
function inicioDoMesAnterior() {
  const d = inicioDoMes(); d.setMonth(d.getMonth() - 1); return d;
}
