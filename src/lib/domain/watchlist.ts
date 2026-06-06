import { prisma } from "../prisma";
import { buscarHistorico52s, buscarCotacao } from "../mercado/yahoo";
import { analisarValuation, type Valuation } from "./valuation";
import { recalcularAtivo, type LancamentoInput } from "./portfolio";

export const TOP_10_DEFAULT: { ticker: string; ordem: number; notas: string }[] = [
  { ticker: "MXRF11", ordem: 1,  notas: "Papel CRI · XP · maior liquidez" },
  { ticker: "TRXF11", ordem: 2,  notas: "Renda urbana · TRX · triple-net" },
  { ticker: "HGLG11", ordem: 3,  notas: "Logística · CSHG · galpões classe A" },
  { ticker: "KNRI11", ordem: 4,  notas: "Híbrido · Kinea · lajes + galpões" },
  { ticker: "XPLG11", ordem: 5,  notas: "Logística · XP · diversificado" },
  { ticker: "VISC11", ordem: 6,  notas: "Shoppings · Vinci · dominantes regionais" },
  { ticker: "HGRU11", ordem: 7,  notas: "Renda urbana · CSHG · atacarejo + educacional" },
  { ticker: "BTLG11", ordem: 8,  notas: "Logística · BTG · galpões premium" },
  { ticker: "KNCR11", ordem: 9,  notas: "Papel pós · Kinea · CDI+" },
  { ticker: "RECR11", ordem: 10, notas: "Papel high-grade · REC" },
];

let seedEmAndamento: Promise<void> | null = null;

export async function garantirWatchlistInicial() {
  // Evita corrida: múltiplas requisições simultâneas reutilizam a mesma Promise.
  if (seedEmAndamento) return seedEmAndamento;
  const total = await prisma.watchlistAtivo.count();
  if (total > 0) return;

  seedEmAndamento = (async () => {
    // Busca cotações em paralelo
    const cotacoes = await Promise.all(
      TOP_10_DEFAULT.map((i) => buscarCotacao(i.ticker).catch(() => null)),
    );
    // Cria watchlist + ativo em paralelo, idempotente via upsert
    await Promise.all(TOP_10_DEFAULT.map(async (item, idx) => {
      const cot = cotacoes[idx];
      await prisma.watchlistAtivo.upsert({
        where: { ticker: item.ticker },
        create: {
          ticker: item.ticker,
          metaInvestimento: 10000,
          ordem: item.ordem,
          notas: item.notas,
        },
        update: {},
      });
      const existente = await prisma.ativo.findUnique({ where: { ticker: item.ticker } });
      if (!existente) {
        await prisma.ativo.create({
          data: cot
            ? { ticker: item.ticker, nome: cot.nome, precoAtual: cot.preco, atualizadoEm: new Date() }
            : { ticker: item.ticker },
        });
      }
    }));
  })().finally(() => { seedEmAndamento = null; });

  return seedEmAndamento;
}

export type Oportunidade = {
  ticker: string;
  nome: string | null;
  segmento: string | null;
  ordem: number;
  notas: string | null;
  precoAtual: number;
  // Janela analisada (12m dia a dia)
  janelaDias: number;
  // Análise completa de valuation (engine centralizada)
  valuation: Valuation;
  // Campos legacy mantidos por compat. com a UI antiga — derivados do valuation.
  max52s: number;
  min52s: number;
  mediana52s: number;
  drawdown: number;
  percentil: number;       // 0..1 — posição linear, mantido por compat
  scoreOportunidade: number; // 0..100 (alias de valuation.score)
  cotasAtuais: number;
  investido: number;
  metaTipo: "VALOR" | "COTAS";
  metaInvestimento: number;   // R$ — efetivo (se meta por COTAS, = metaCotas × preço)
  metaCotas: number;          // nº de cotas alvo (relevante quando metaTipo = COTAS)
  progressoMeta: number;
  cotasParaMeta: number;
  faltaInvestir: number;
};

export async function calcularOportunidades(carteiraId?: string): Promise<Oportunidade[]> {
  await garantirWatchlistInicial();

  const watchlist = await prisma.watchlistAtivo.findMany({ orderBy: { ordem: "asc" } });
  const ativos = await prisma.ativo.findMany({
    where: { ticker: { in: watchlist.map((w) => w.ticker) } },
    include: {
      lancamentos: { where: carteiraId ? { carteiraId } : undefined },
    },
  });

  // Busca todos os históricos do Yahoo em paralelo (com cache de 1h)
  const historicos = await Promise.all(
    watchlist.map((w) => buscarHistorico52s(w.ticker).catch(() => null)),
  );

  const oportunidades: Oportunidade[] = [];

  for (let i = 0; i < watchlist.length; i++) {
    const w = watchlist[i];
    const historico = historicos[i];
    if (!historico) continue;
    const ativo = ativos.find((a) => a.ticker === w.ticker);

    // Posição via engine centralizada (PM correto + lucro realizado etc.)
    let cotas = 0, investido = 0;
    if (ativo) {
      const lancs: LancamentoInput[] = ativo.lancamentos.map((l) => ({
        id: l.id,
        tipo: l.tipo as LancamentoInput["tipo"],
        data: l.data,
        ativoId: l.ativoId,
        quantidade: l.quantidade,
        precoUnit: l.precoUnit,
        valorTotal: l.valorTotal,
      }));
      const estado = recalcularAtivo(
        { id: ativo.id, ticker: ativo.ticker, nome: ativo.nome, segmento: ativo.segmento, precoAtual: ativo.precoAtual },
        lancs,
      );
      cotas = estado.cotas;
      investido = estado.custoTotal;
    }

    // Valuation pela engine central — separa o "atual" do "histórico".
    const precosHistoricos = historico.precos.filter((p) => p !== historico.precoAtual);
    const valuation = analisarValuation(precosHistoricos, historico.precoAtual);

    // Meta pode ser por VALOR (R$) ou por COTAS (quantidade-alvo). Os campos
    // metaTipo/metaCotas são lidos via ponte porque o client Prisma só passa a
    // conhecê-los após `prisma generate` (rodado no start-fundos.bat).
    const metaTipo = ((w as any).metaTipo === "COTAS" ? "COTAS" : "VALOR") as "VALOR" | "COTAS";
    const metaCotas = Number((w as any).metaCotas ?? 0);
    const preco = historico.precoAtual;

    let metaInvestimento: number;
    let progressoMeta: number;
    let faltaInvestir: number;
    let cotasParaMeta: number;

    if (metaTipo === "COTAS") {
      metaInvestimento = metaCotas * preco; // R$ equivalente, p/ totais e UI legacy
      progressoMeta = metaCotas > 0 ? cotas / metaCotas : 0;
      const faltaCotas = Math.max(0, metaCotas - cotas);
      cotasParaMeta = Math.ceil(faltaCotas);
      faltaInvestir = faltaCotas * preco;
    } else {
      metaInvestimento = w.metaInvestimento;
      faltaInvestir = Math.max(0, metaInvestimento - investido);
      cotasParaMeta = preco > 0 ? Math.ceil(faltaInvestir / preco) : 0;
      progressoMeta = metaInvestimento > 0 ? investido / metaInvestimento : 0;
    }

    oportunidades.push({
      ticker: w.ticker,
      nome: ativo?.nome ?? null,
      segmento: ativo?.segmento ?? null,
      ordem: w.ordem,
      notas: w.notas,
      precoAtual: preco,
      janelaDias: historico.precos.length,
      valuation,
      // Aliases legacy (não usados pela UI nova, mas mantidos por compat.)
      max52s: valuation.max,
      min52s: valuation.min,
      mediana52s: valuation.mediana,
      drawdown: valuation.distMaxima,
      percentil: valuation.posicaoLinear / 100,
      scoreOportunidade: valuation.score,
      cotasAtuais: cotas,
      investido,
      metaTipo,
      metaInvestimento,
      metaCotas,
      progressoMeta,
      cotasParaMeta,
      faltaInvestir,
    });
  }

  return oportunidades;
}
