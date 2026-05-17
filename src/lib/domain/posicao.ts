import { prisma } from "../prisma";
import { somarLista } from "../money";

export type Posicao = {
  ativoId: string;
  ticker: string;
  nome: string | null;
  segmento: string | null;
  cotas: number;
  precoMedio: number;
  investido: number;
  precoAtual: number | null;
  valorAtual: number;
  dividendos12m: number;
  ultimoDividendo: number;
  yieldOnCost: number;
};

export async function calcularPosicoes(carteiraId?: string): Promise<Posicao[]> {
  const ativos = await prisma.ativo.findMany({
    include: {
      lancamentos: { where: carteiraId ? { carteiraId } : undefined },
    },
  });
  const doze = new Date();
  doze.setMonth(doze.getMonth() - 12);

  return ativos
    .map<Posicao>((a) => {
      let cotas = 0;
      let investido = 0;
      let dividendos12m = 0;
      let ultimoDividendo = 0;
      let ultimaDataDiv = new Date(0);

      for (const l of a.lancamentos) {
        if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") {
          cotas += l.quantidade ?? 0;
          investido += l.valorTotal;
        } else if (l.tipo === "VENDA") {
          cotas -= l.quantidade ?? 0;
          investido -= l.valorTotal;
        } else if (l.tipo === "DIVIDENDO") {
          if (l.data >= doze) dividendos12m += l.valorTotal;
          if (l.data > ultimaDataDiv) { ultimaDataDiv = l.data; ultimoDividendo = l.valorTotal; }
        }
      }

      const precoMedio = cotas > 0 ? investido / cotas : 0;
      const valorAtual = a.precoAtual != null ? a.precoAtual * cotas : investido;
      const yieldOnCost = investido > 0 ? dividendos12m / investido : 0;

      return {
        ativoId: a.id,
        ticker: a.ticker,
        nome: a.nome,
        segmento: a.segmento,
        cotas,
        precoMedio,
        investido,
        precoAtual: a.precoAtual,
        valorAtual,
        dividendos12m,
        ultimoDividendo,
        yieldOnCost,
      };
    })
    .filter((p) => p.cotas > 0)
    .sort((a, b) => b.valorAtual - a.valorAtual);
}

export function resumoCarteira(posicoes: Posicao[]) {
  const investido     = somarLista(posicoes, (p) => p.investido);
  const valorAtual    = somarLista(posicoes, (p) => p.valorAtual);
  const dividendos12m = somarLista(posicoes, (p) => p.dividendos12m);
  return {
    investido,
    valorAtual,
    dividendos12m,
    mediaMensal: dividendos12m / 12,
    yieldOnCost: investido > 0 ? dividendos12m / investido : 0,
  };
}
