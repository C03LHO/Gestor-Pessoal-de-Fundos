/**
 * Camada de dados — busca lancamentos do banco e delega TODO o cálculo à
 * engine pura em `./portfolio.ts`. Os tipos exportados aqui são apenas o
 * shape que a UI já consome — internamente é o `EstadoAtivo` da engine.
 */
import { prisma } from "../prisma";
import { somarLista } from "../money";
import { recalcularPortfolio, type LancamentoInput, type AtivoInfo } from "./portfolio";

export type Posicao = {
  ativoId: string;
  ticker: string;
  nome: string | null;
  segmento: string | null;
  cotas: number;
  precoMedio: number;
  investido: number;       // alias de custoTotal — mantido por compat. com UI
  precoAtual: number | null;
  valorAtual: number;
  dividendos12m: number;
  ultimoDividendo: number;
  yieldOnCost: number;
  lucroRealizado: number;
  lucroNaoRealizado: number;
};

export async function calcularPosicoes(carteiraId?: string): Promise<Posicao[]> {
  const [ativos, lancamentos] = await Promise.all([
    prisma.ativo.findMany({
      select: { id: true, ticker: true, nome: true, segmento: true, precoAtual: true },
    }),
    prisma.lancamento.findMany({
      where: carteiraId ? { carteiraId } : undefined,
      select: {
        id: true,
        tipo: true,
        data: true,
        ativoId: true,
        quantidade: true,
        precoUnit: true,
        valorTotal: true,
      },
    }),
  ]);

  const ativoInfo: AtivoInfo[] = ativos;
  const lancsInput: LancamentoInput[] = lancamentos.map((l) => ({
    id: l.id,
    tipo: l.tipo as LancamentoInput["tipo"],
    data: l.data,
    ativoId: l.ativoId,
    quantidade: l.quantidade,
    precoUnit: l.precoUnit,
    valorTotal: l.valorTotal,
  }));

  const { ativos: estados } = recalcularPortfolio(ativoInfo, lancsInput);

  // Mantém só ativos com posição em aberto, no formato consumido pela UI.
  return estados
    .filter((e) => e.cotas > 0)
    .map<Posicao>((e) => ({
      ativoId: e.ativoId,
      ticker: e.ticker,
      nome: e.nome,
      segmento: e.segmento,
      cotas: e.cotas,
      precoMedio: e.precoMedio,
      investido: e.custoTotal,
      precoAtual: e.precoAtual,
      valorAtual: e.valorAtual,
      dividendos12m: e.dividendos12m,
      ultimoDividendo: e.ultimoDividendo,
      yieldOnCost: e.yieldOnCost,
      lucroRealizado: e.lucroRealizado,
      lucroNaoRealizado: e.lucroNaoRealizado,
    }));
}

export function resumoCarteira(posicoes: Posicao[]) {
  const investido     = somarLista(posicoes, (p) => p.investido);
  const valorAtual    = somarLista(posicoes, (p) => p.valorAtual);
  const dividendos12m = somarLista(posicoes, (p) => p.dividendos12m);
  const lucroRealizado = somarLista(posicoes, (p) => p.lucroRealizado);
  const lucroNaoRealizado = somarLista(posicoes, (p) => p.lucroNaoRealizado);
  return {
    investido,
    valorAtual,
    dividendos12m,
    lucroRealizado,
    lucroNaoRealizado,
    mediaMensal: dividendos12m / 12,
    yieldOnCost: investido > 0 ? dividendos12m / investido : 0,
  };
}
