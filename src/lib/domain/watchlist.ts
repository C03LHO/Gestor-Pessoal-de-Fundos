import { prisma } from "../prisma";
import { buscarHistorico52s, buscarCotacao } from "../mercado/yahoo";

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
  max52s: number;
  min52s: number;
  mediana52s: number;
  drawdown: number;       // (max - atual) / max
  percentil: number;      // 0=min, 1=max
  scoreOportunidade: number; // 0..100, maior = melhor oportunidade
  cotasAtuais: number;
  investido: number;
  metaInvestimento: number;
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

    let cotas = 0, investido = 0;
    if (ativo) {
      for (const l of ativo.lancamentos) {
        if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") {
          cotas += l.quantidade ?? 0; investido += l.valorTotal;
        } else if (l.tipo === "VENDA") {
          cotas -= l.quantidade ?? 0; investido -= l.valorTotal;
        }
      }
    }

    const drawdown = (historico.max - historico.precoAtual) / historico.max;
    const range = historico.max - historico.min;
    const percentil = range > 0 ? (historico.precoAtual - historico.min) / range : 0.5;

    const scoreOportunidade = Math.max(0, Math.min(100,
      drawdown * 100 * 0.5 + (1 - percentil) * 100 * 0.5,
    ));

    const faltaInvestir = Math.max(0, w.metaInvestimento - investido);
    const cotasParaMeta = historico.precoAtual > 0 ? Math.ceil(faltaInvestir / historico.precoAtual) : 0;

    oportunidades.push({
      ticker: w.ticker,
      nome: ativo?.nome ?? null,
      segmento: ativo?.segmento ?? null,
      ordem: w.ordem,
      notas: w.notas,
      precoAtual: historico.precoAtual,
      max52s: historico.max,
      min52s: historico.min,
      mediana52s: historico.mediana,
      drawdown,
      percentil,
      scoreOportunidade,
      cotasAtuais: cotas,
      investido,
      metaInvestimento: w.metaInvestimento,
      progressoMeta: w.metaInvestimento > 0 ? investido / w.metaInvestimento : 0,
      cotasParaMeta,
      faltaInvestir,
    });
  }

  return oportunidades;
}
