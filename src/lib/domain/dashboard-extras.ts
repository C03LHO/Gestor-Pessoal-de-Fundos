/**
 * Funções puras de cálculo para as 3 visualizações novas do dashboard:
 *   - rendaAcumuladaMensal  → barras (mês) + linha (acumulado), desde sempre
 *   - topPerformersDoMes    → valorização e dividendos do mês atual/anterior
 *   - evolucaoPatrimonio    → série + KPIs, com período variável
 *
 * Nenhuma criação de tabela. Tudo derivado de Lancamento, Ativo, Cotacao.
 */
import { prisma } from "../prisma";
import { somarLista, toCent, toReais } from "../money";
import { recalcularPortfolio, type LancamentoInput, type AtivoInfo } from "./portfolio";

// ===================== TIPOS =====================

export type PontoRenda = {
  mes: string;          // "2025-04"
  rotulo: string;       // "Abr/25"
  mensal: number;
  acumulado: number;
  ehMesAtual: boolean;
};

export type RendaAcumulada = {
  serie: PontoRenda[];
  total: number;
  melhorMes: { rotulo: string; valor: number } | null;
  mesAtual: { rotulo: string; valor: number };
  meses: number;        // qtd de meses na série
};

export type Performer = {
  ticker: string;
  nome: string | null;
  precoAtual: number;
  precoBase: number | null;
  variacaoPct: number | null;
  variacaoAbs: number | null;
  dividendoPago: number;
  dyDoMes: number | null;  // dividendo / precoAtual
  precisao: "exata" | "aproximada" | "indisponivel";
};

export type TopPerformers = {
  mesRotulo: string;            // "Maio/2025"
  topValorizacao: Performer[];  // até 3
  topQueda: Performer | null;
  topDividendos: Performer[];   // até 3
  avisos: string[];
};

export type PontoPatrimonio = {
  mes: string;
  rotulo: string;
  valor: number;            // valor de mercado naquele mês
  investido: number;        // custo total acumulado naquele mês
  rentabilidade: number;    // (valor - investido) / investido
  ehMaiorPatrimonio?: boolean;
  ehMaiorQueda?: boolean;
};

export type EvolucaoPatrimonio = {
  serie: PontoPatrimonio[];
  kpis: {
    valorAtual: number;
    investido: number;
    lucro: number;
    lucroPct: number;
    variacaoMes: number;
    variacaoMesPct: number;
  };
  avisos: string[];
};

// ===================== HELPERS =====================

const MESES_ABBR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_LONG = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function chaveMes(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function rotuloCurto(d: Date) {
  return `${MESES_ABBR[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}
function rotuloLongo(d: Date) {
  return `${MESES_LONG[d.getMonth()]}/${d.getFullYear()}`;
}
function inicioDoMes(d: Date) {
  const r = new Date(d);
  r.setDate(1); r.setHours(0, 0, 0, 0);
  return r;
}
function proximoMes(d: Date) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + 1);
  return r;
}

// ===================== 1) RENDA ACUMULADA =====================

export async function rendaAcumuladaMensal(carteiraId?: string): Promise<RendaAcumulada> {
  const divs = await prisma.lancamento.findMany({
    where: { tipo: "DIVIDENDO", ...(carteiraId ? { carteiraId } : {}) },
    select: { data: true, valorTotal: true },
    orderBy: { data: "asc" },
  });

  if (divs.length === 0) {
    const hoje = new Date();
    return {
      serie: [],
      total: 0,
      melhorMes: null,
      mesAtual: { rotulo: rotuloLongo(hoje), valor: 0 },
      meses: 0,
    };
  }

  // Bucket: acumula em centavos por mês.
  const buckets = new Map<string, number>(); // YYYY-MM -> centavos
  for (const d of divs) {
    const k = chaveMes(d.data);
    buckets.set(k, (buckets.get(k) ?? 0) + toCent(d.valorTotal));
  }

  // Preenche todos os meses entre primeiro dividendo e hoje (zero quando não houve).
  const primeiro = inicioDoMes(divs[0].data);
  const hoje = new Date();
  const limite = inicioDoMes(hoje);
  const chaveAtual = chaveMes(limite);

  const serie: PontoRenda[] = [];
  let acumuladoCent = 0;
  let melhor: { rotulo: string; valor: number } | null = null;

  for (let cur = new Date(primeiro); cur <= limite; cur = proximoMes(cur)) {
    const k = chaveMes(cur);
    const mensalCent = buckets.get(k) ?? 0;
    acumuladoCent += mensalCent;
    const mensal = toReais(mensalCent);
    serie.push({
      mes: k,
      rotulo: rotuloCurto(cur),
      mensal,
      acumulado: toReais(acumuladoCent),
      ehMesAtual: k === chaveAtual,
    });
    if (mensal > 0 && (!melhor || mensal > melhor.valor)) {
      melhor = { rotulo: rotuloLongo(cur), valor: mensal };
    }
  }

  const valorMesAtual = toReais(buckets.get(chaveAtual) ?? 0);
  return {
    serie,
    total: toReais(acumuladoCent),
    melhorMes: melhor,
    mesAtual: { rotulo: rotuloLongo(hoje), valor: valorMesAtual },
    meses: serie.length,
  };
}

// ===================== 2) TOP PERFORMERS DO MÊS =====================

/**
 * @param refMes  Início do mês de referência (default: mês atual). Para o
 *                ranking de "mês anterior", passe o início do mês passado.
 */
export async function topPerformersDoMes(
  carteiraId?: string,
  refMes: Date = inicioDoMes(new Date()),
): Promise<TopPerformers> {
  const inicio = inicioDoMes(refMes);
  const fim = proximoMes(inicio);

  // 1) Ativos com posição na carteira ativa
  const [ativos, divsMes, cotacoes] = await Promise.all([
    prisma.ativo.findMany({
      include: {
        lancamentos: { where: carteiraId ? { carteiraId } : undefined },
      },
    }),
    prisma.lancamento.findMany({
      where: {
        tipo: "DIVIDENDO",
        data: { gte: inicio, lt: fim },
        ...(carteiraId ? { carteiraId } : {}),
      },
      include: { ativo: true },
    }),
    // Para cada ticker, pega Cotacoes <= inicioDoMes pra achar a base
    prisma.cotacao.findMany({
      where: { data: { lte: fim } },
      orderBy: { data: "desc" },
    }),
  ]);

  // Mais recente <= inicio por ticker (pra preço de início) e <= fim (pra atual aprox)
  const baseTicker = new Map<string, { preco: number; data: Date }>();
  for (const c of cotacoes) {
    if (c.data > inicio) continue;
    if (baseTicker.has(c.ticker)) continue;
    baseTicker.set(c.ticker, { preco: c.preco, data: c.data });
  }

  const lancsTodos: LancamentoInput[] = [];
  const ativoInfo: AtivoInfo[] = [];
  for (const a of ativos) {
    ativoInfo.push({ id: a.id, ticker: a.ticker, nome: a.nome, segmento: a.segmento, precoAtual: a.precoAtual });
    for (const l of a.lancamentos) {
      lancsTodos.push({
        id: l.id, tipo: l.tipo as any, data: l.data, ativoId: l.ativoId,
        quantidade: l.quantidade, precoUnit: l.precoUnit, valorTotal: l.valorTotal,
      });
    }
  }
  const { ativos: estados } = recalcularPortfolio(ativoInfo, lancsTodos);

  const performers: Performer[] = [];
  let avisos: string[] = [];

  for (const e of estados) {
    if (e.cotas <= 0) continue;
    const precoAtual = e.precoAtual ?? 0;
    if (precoAtual <= 0) continue;

    const base = baseTicker.get(e.ticker);
    const precoBase = base?.preco ?? null;
    const diffDias = base ? Math.round((+inicio - +base.data) / 86400000) : null;
    const precisao: Performer["precisao"] =
      base == null ? "indisponivel"
      : diffDias != null && diffDias <= 7 ? "exata"
      : "aproximada";

    const variacaoAbs = precoBase != null ? precoAtual - precoBase : null;
    const variacaoPct = precoBase != null && precoBase > 0 ? variacaoAbs! / precoBase : null;

    const divsAtivo = divsMes.filter((d) => d.ativoId === e.ativoId);
    const dividendoPago = somarLista(divsAtivo, (d) => d.valorTotal);
    const dyDoMes = dividendoPago > 0 && precoAtual > 0 && e.cotas > 0
      ? dividendoPago / (precoAtual * e.cotas) : null;

    performers.push({
      ticker: e.ticker, nome: e.nome,
      precoAtual, precoBase, variacaoPct, variacaoAbs,
      dividendoPago, dyDoMes, precisao,
    });
  }

  if (performers.length === 0) {
    return {
      mesRotulo: rotuloLongo(inicio),
      topValorizacao: [], topQueda: null, topDividendos: [],
      avisos: ["Sem posição ativa para ranquear performers neste mês."],
    };
  }

  const comVariacao = performers.filter((p) => p.variacaoPct != null);
  const semBaseCount = performers.length - comVariacao.length;
  if (semBaseCount > 0) {
    avisos.push(`${semBaseCount} ativo(s) sem cotação no início do mês — usei o histórico mais próximo.`);
  }

  const topValorizacao = [...comVariacao]
    .filter((p) => (p.variacaoPct ?? 0) > 0)
    .sort((a, b) => (b.variacaoPct ?? 0) - (a.variacaoPct ?? 0))
    .slice(0, 3);

  const topQueda = [...comVariacao]
    .filter((p) => (p.variacaoPct ?? 0) < 0)
    .sort((a, b) => (a.variacaoPct ?? 0) - (b.variacaoPct ?? 0))[0] ?? null;

  const topDividendos = [...performers]
    .filter((p) => p.dividendoPago > 0)
    .sort((a, b) => b.dividendoPago - a.dividendoPago)
    .slice(0, 3);

  return {
    mesRotulo: rotuloLongo(inicio),
    topValorizacao,
    topQueda,
    topDividendos,
    avisos,
  };
}

// ===================== 3) EVOLUÇÃO DO PATRIMÔNIO =====================

/**
 * Reconstrói série mensal do patrimônio + KPIs comparativos.
 *
 * @param meses  Número de meses na janela (3, 6, 12, ou um número grande
 *               para "máximo"). Se exceder o histórico, ajusta automaticamente.
 */
export async function evolucaoPatrimonio(
  carteiraId?: string,
  meses = 12,
): Promise<EvolucaoPatrimonio> {
  const [ativos, lancsTodos, cotacoes, primeiroLanc] = await Promise.all([
    prisma.ativo.findMany({
      select: { id: true, ticker: true, nome: true, segmento: true, precoAtual: true },
    }),
    prisma.lancamento.findMany({
      where: { ...(carteiraId ? { carteiraId } : {}), tipo: { in: ["COMPRA", "VENDA", "REINVESTIMENTO"] } },
      orderBy: { data: "asc" },
    }),
    prisma.cotacao.findMany({ orderBy: { data: "asc" } }),
    prisma.lancamento.findFirst({
      where: { ...(carteiraId ? { carteiraId } : {}), tipo: { in: ["COMPRA", "REINVESTIMENTO"] } },
      orderBy: { data: "asc" },
      select: { data: true },
    }),
  ]);

  const avisos: string[] = [];

  if (!primeiroLanc) {
    return {
      serie: [],
      kpis: { valorAtual: 0, investido: 0, lucro: 0, lucroPct: 0, variacaoMes: 0, variacaoMesPct: 0 },
      avisos: ["Sem lançamentos para reconstruir patrimônio."],
    };
  }

  const hoje = new Date();
  const fimSerie = inicioDoMes(hoje);
  const limiteInicio = inicioDoMes(primeiroLanc.data);
  const desejado = new Date(fimSerie);
  desejado.setMonth(desejado.getMonth() - (meses - 1));
  const inicio = desejado < limiteInicio ? limiteInicio : desejado;

  // Indexa cotacoes por ticker, ordem cronológica
  const seriesCotacao = new Map<string, { data: Date; preco: number }[]>();
  for (const c of cotacoes) {
    if (!seriesCotacao.has(c.ticker)) seriesCotacao.set(c.ticker, []);
    seriesCotacao.get(c.ticker)!.push({ data: c.data, preco: c.preco });
  }

  const lancsInput: LancamentoInput[] = lancsTodos.map((l) => ({
    id: l.id, tipo: l.tipo as any, data: l.data, ativoId: l.ativoId,
    quantidade: l.quantidade, precoUnit: l.precoUnit, valorTotal: l.valorTotal,
  }));

  const serie: PontoPatrimonio[] = [];
  let semPrecoEmAlgumMes = false;

  for (let cur = new Date(inicio); cur <= fimSerie; cur = proximoMes(cur)) {
    const fim = proximoMes(cur);
    fim.setMilliseconds(-1); // último ms do mês

    // Preço por ativo no fim do mês: última cotacao <= fim, ou precoAtual fallback
    const ativosNoMes: AtivoInfo[] = ativos.map((a) => {
      const serieT = seriesCotacao.get(a.ticker) ?? [];
      let precoMes: number | null = null;
      for (const c of serieT) {
        if (c.data <= fim) precoMes = c.preco;
        else break;
      }
      if (precoMes == null) semPrecoEmAlgumMes = true;
      return { ...a, precoAtual: precoMes ?? a.precoAtual };
    });
    const lancsAteMes = lancsInput.filter((l) => l.data <= fim);
    const { consolidado } = recalcularPortfolio(ativosNoMes, lancsAteMes, fim);

    const valor = consolidado.valorAtual > 0 ? consolidado.valorAtual : consolidado.custoTotal;
    const investido = consolidado.custoTotal;
    const rentabilidade = investido > 0 ? (valor - investido) / investido : 0;

    serie.push({
      mes: chaveMes(cur),
      rotulo: rotuloCurto(cur),
      valor,
      investido,
      rentabilidade,
    });
  }

  if (semPrecoEmAlgumMes) {
    avisos.push("Alguns meses não tinham cotação registrada — usei o preço mais recente disponível.");
  }

  // Marcadores de extremo
  if (serie.length > 0) {
    let idxMaior = 0;
    let idxMaiorQueda = -1;
    let maxValor = serie[0].valor;
    let maiorQueda = 0;
    for (let i = 1; i < serie.length; i++) {
      if (serie[i].valor > maxValor) { maxValor = serie[i].valor; idxMaior = i; }
      const queda = serie[i - 1].valor - serie[i].valor;
      if (queda > maiorQueda) { maiorQueda = queda; idxMaiorQueda = i; }
    }
    serie[idxMaior].ehMaiorPatrimonio = true;
    if (idxMaiorQueda >= 0) serie[idxMaiorQueda].ehMaiorQueda = true;
  }

  const ultimo = serie[serie.length - 1];
  const penultimo = serie.length >= 2 ? serie[serie.length - 2] : null;

  return {
    serie,
    kpis: {
      valorAtual: ultimo?.valor ?? 0,
      investido: ultimo?.investido ?? 0,
      lucro: ultimo ? ultimo.valor - ultimo.investido : 0,
      lucroPct: ultimo?.rentabilidade ?? 0,
      variacaoMes: ultimo && penultimo ? ultimo.valor - penultimo.valor : 0,
      variacaoMesPct: ultimo && penultimo && penultimo.valor > 0
        ? (ultimo.valor - penultimo.valor) / penultimo.valor : 0,
    },
    avisos,
  };
}
