import { prisma } from "../prisma";
import { buscarDividendos } from "../mercado/yahoo";
import { regressaoLinear } from "./estatistica";

export type PrevisaoAtivo = {
  ticker: string;
  cotas: number;
  valorPorCotaMedio: number;
  previsao: number;
  fonte: "historico" | "mercado" | "indisponivel";
  metodo: "regressao" | "media" | "ultimo";
  tendencia: "crescente" | "estavel" | "decrescente";
  ultimosPagamentos: { data: string; valor: number; valorPorCota: number }[];
};

export type PrevisaoMes = {
  total: number;
  itens: PrevisaoAtivo[];
};

/**
 * Estima o quanto o usuário vai receber em dividendos no próximo mês.
 *
 * Estratégia:
 * - Para cada ativo com cotas atuais > 0:
 *   1) tenta usar dividendos já registrados no histórico (mais confiável)
 *   2) se não houver, busca os últimos pagamentos do Yahoo
 * - Calcula a média de R$/cota nos últimos 3 pagamentos
 * - Multiplica pelas cotas atuais
 *
 * Premissa: a maioria dos FIIs paga mensalmente. Para fundos com cadência
 * trimestral, a previsão fica conservadora (a média mensal divide o valor).
 */
export async function previsaoProximoMes(carteiraId?: string): Promise<PrevisaoMes> {
  const ativos = await prisma.ativo.findMany({
    include: {
      lancamentos: {
        where: carteiraId ? { carteiraId } : undefined,
        orderBy: { data: "asc" },
      },
    },
  });

  // Filtra ativos com cotas > 0 ANTES de qualquer fetch externo
  const ativosComCotas = ativos
    .map((a) => ({ ativo: a, cotas: cotasAgora(a.lancamentos) }))
    .filter((x) => x.cotas > 0);

  // Paraleliza todas as buscas de "valor por cota" (Yahoo ou histórico local)
  const ultimosPorTicker = await Promise.all(
    ativosComCotas.map((x) => pegarValorPorCota(x.ativo.ticker, x.ativo.lancamentos)),
  );

  const itens: PrevisaoAtivo[] = [];

  for (let i = 0; i < ativosComCotas.length; i++) {
    const a = ativosComCotas[i].ativo;
    const cotasAtuais = ativosComCotas[i].cotas;
    const ultimos = ultimosPorTicker[i];

    if (ultimos.length === 0) {
      itens.push({
        ticker: a.ticker,
        cotas: cotasAtuais,
        valorPorCotaMedio: 0,
        previsao: 0,
        fonte: "indisponivel",
        metodo: "ultimo",
        tendencia: "estavel",
        ultimosPagamentos: [],
      });
      continue;
    }

    // Regressão se ≥ 6 pagamentos. Aplica peso de sazonalidade do mesmo mês.
    const top = ultimos.slice(-3);
    let valorEstimado: number;
    let metodo: "regressao" | "media" | "ultimo";

    // Mês alvo = próximo
    const proximoMesIdx = ((new Date().getMonth() + 1) % 12);
    const mesmoMes = ultimos.filter((u) => u.data.getMonth() === proximoMesIdx);
    const ajustaSazonal = (base: number) => {
      if (mesmoMes.length === 0) return base;
      const mediaSazonal = mesmoMes.reduce((s, x) => s + x.valorPorCota, 0) / mesmoMes.length;
      const mediaGeral = ultimos.reduce((s, x) => s + x.valorPorCota, 0) / ultimos.length;
      if (mediaGeral === 0) return base;
      const fator = mediaSazonal / mediaGeral;
      // mistura 70% base + 30% peso sazonal
      return base * (0.7 + 0.3 * fator);
    };

    if (ultimos.length >= 6) {
      const pontos = ultimos.slice(-12).map((u, i) => ({ x: i, y: u.valorPorCota }));
      const { a: ra, b: rb, r2 } = regressaoLinear(pontos);
      if (r2 >= 0.25) {
        valorEstimado = Math.max(0, ajustaSazonal(ra + rb * pontos.length));
        metodo = "regressao";
      } else {
        const m = top.reduce((s, x) => s + x.valorPorCota, 0) / top.length;
        valorEstimado = ajustaSazonal(m);
        metodo = "media";
      }
    } else if (ultimos.length >= 2) {
      const m = top.reduce((s, x) => s + x.valorPorCota, 0) / top.length;
      valorEstimado = ajustaSazonal(m);
      metodo = "media";
    } else {
      valorEstimado = ultimos[0].valorPorCota;
      metodo = "ultimo";
    }

    const mediaAntiga = ultimos.length >= 6
      ? ultimos.slice(0, Math.floor(ultimos.length / 2)).reduce((s, x) => s + x.valorPorCota, 0) / Math.floor(ultimos.length / 2)
      : valorEstimado;
    const mediaRecente = top.reduce((s, x) => s + x.valorPorCota, 0) / top.length;
    const variacao = mediaAntiga > 0 ? (mediaRecente - mediaAntiga) / mediaAntiga : 0;
    const tendencia: PrevisaoAtivo["tendencia"] =
      variacao > 0.05 ? "crescente" : variacao < -0.05 ? "decrescente" : "estavel";

    itens.push({
      ticker: a.ticker,
      cotas: cotasAtuais,
      valorPorCotaMedio: valorEstimado,
      previsao: valorEstimado * cotasAtuais,
      fonte: ultimos[0].fonte,
      metodo,
      tendencia,
      ultimosPagamentos: top.map((x) => ({
        data: x.data.toISOString().slice(0, 10),
        valor: x.valorPorCota * cotasAtuais,
        valorPorCota: x.valorPorCota,
      })),
    });
  }

  itens.sort((a, b) => b.previsao - a.previsao);
  const total = itens.reduce((s, x) => s + x.previsao, 0);
  return { total, itens };
}

type Pagamento = { data: Date; valorPorCota: number; fonte: "historico" | "mercado" };

async function pegarValorPorCota(
  ticker: string,
  lancs: { tipo: string; data: Date; quantidade: number | null; valorTotal: number }[],
): Promise<Pagamento[]> {
  const divsHist = lancs.filter((l) => l.tipo === "DIVIDENDO").sort((a, b) => +a.data - +b.data);

  if (divsHist.length >= 2) {
    return divsHist.map((d) => {
      const cotas = cotasNoMomento(lancs, d.data);
      return {
        data: d.data,
        valorPorCota: cotas > 0 ? d.valorTotal / cotas : 0,
        fonte: "historico" as const,
      };
    }).filter((x) => x.valorPorCota > 0);
  }

  try {
    const yahoo = await buscarDividendos(ticker, 1);
    return yahoo
      .sort((a, b) => +a.data - +b.data)
      .map((d) => ({ data: d.data, valorPorCota: d.valor, fonte: "mercado" as const }));
  } catch {
    return [];
  }
}

function cotasAgora(lancs: { tipo: string; quantidade: number | null }[]): number {
  let c = 0;
  for (const l of lancs) {
    if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") c += l.quantidade ?? 0;
    else if (l.tipo === "VENDA") c -= l.quantidade ?? 0;
  }
  return c;
}

function cotasNoMomento(
  lancs: { tipo: string; data: Date; quantidade: number | null }[],
  data: Date,
): number {
  let c = 0;
  for (const l of lancs) {
    if (l.data > data) continue;
    if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") c += l.quantidade ?? 0;
    else if (l.tipo === "VENDA") c -= l.quantidade ?? 0;
  }
  return c;
}
