import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { getPrecos, getHistoricoTodos, variacaoNDias } from "@/lib/cripto/coingecko";
import { calcularPosicoesCripto, resumoCarteiraCripto } from "@/lib/cripto/carteira";
import { analisar } from "@/lib/cripto/analise";
import { CRYPTO_ASSETS, isEntradaGratuita } from "@/lib/cripto/constants";
import { DashboardCriptoClient } from "./DashboardCriptoClient";

export const dynamic = "force-dynamic";

export default async function CriptoDashboard() {
  const carteiraId = await getCarteiraAtivaId();
  const [precos, historicos, lancsRecentes, lancsTodos] = await Promise.all([
    getPrecos(),
    getHistoricoTodos(90),
    prisma.cryptoTransaction.findMany({
      where: { carteiraId },
      orderBy: { data: "desc" },
      take: 5,
    }),
    prisma.cryptoTransaction.findMany({
      where: { carteiraId },
      orderBy: { data: "asc" },
    }),
  ]);

  const posicoes = await calcularPosicoesCripto(carteiraId, precos);
  const resumo = resumoCarteiraCripto(posicoes, precos);

  // Cards de mercado: anexa variação 7d e análise resumida
  const mercado = CRYPTO_ASSETS.map((a) => {
    const preco = precos.find((p) => p.cryptoId === a.id);
    const hist = historicos.find((h) => h.cryptoId === a.id);
    const ana = hist ? analisar(hist, preco?.precoBrl ?? 0) : null;
    return {
      cryptoId: a.id,
      symbol: a.symbol,
      nome: a.name,
      color: a.color,
      precoBrl: preco?.precoBrl ?? 0,
      precoUsd: preco?.precoUsd ?? null,
      variacao24h: preco?.variacao24h ?? null,
      variacao7d: hist ? variacaoNDias(hist.pontos, 7) : null,
      volume24hBrl: preco?.volume24hBrl ?? null,
      offline: preco?.offline ?? false,
      sparkline: (hist?.pontos ?? []).slice(-30),
      score: ana?.score ?? null,
      sinal: ana?.sinal ?? null,
      tendencia: ana?.indicadores?.tendencia.valor ?? null,
      resumo: ana?.resumo ?? "",
    };
  });

  // Dominância: maior variação 24h positiva
  const candidatas = mercado.filter((m) => m.variacao24h !== null && m.variacao24h > 0);
  const dominante = candidatas.sort((a, b) => (b.variacao24h ?? 0) - (a.variacao24h ?? 0))[0] ?? null;

  // Desempenho 30 dias: série diária do valor da carteira
  const valorCarteiraSerie = calcularSerieDiaria(lancsTodos, historicos);

  const algumOffline = precos.some((p) => p.offline);

  return (
    <DashboardCriptoClient
      mercado={JSON.parse(JSON.stringify(mercado))}
      resumo={JSON.parse(JSON.stringify(resumo))}
      posicoes={JSON.parse(JSON.stringify(posicoes))}
      lancamentosRecentes={JSON.parse(JSON.stringify(lancsRecentes))}
      dominante={dominante ? JSON.parse(JSON.stringify(dominante)) : null}
      valorCarteiraSerie={valorCarteiraSerie}
      algumOffline={algumOffline}
    />
  );
}

/**
 * Constrói série diária do valor da carteira nos últimos 30 dias.
 * Para cada dia, calcula:
 *   posição (qtd) de cada ativo nesse dia (somando lançamentos até a data)
 *   × preço histórico desse dia daquele ativo
 */
function calcularSerieDiaria(
  lancs: { tipo: string; data: Date; cryptoId: string; quantidade: number }[],
  historicos: { cryptoId: string; pontos: { t: number; p: number }[] }[],
): { t: number; v: number }[] {
  if (lancs.length === 0) return [];

  const agora = Date.now();
  const inicio = agora - 30 * 86400000;
  const dias: number[] = [];
  for (let t = inicio; t <= agora; t += 86400000) dias.push(t);

  // Mapa de preço diário por ativo (último preço de cada dia)
  const precoPorDia: Record<string, Map<number, number>> = {};
  for (const h of historicos) {
    const m = new Map<number, number>();
    for (const pt of h.pontos) {
      m.set(Math.floor(pt.t / 86400000), pt.p);
    }
    precoPorDia[h.cryptoId] = m;
  }

  const serie: { t: number; v: number }[] = [];
  for (const t of dias) {
    const diaKey = Math.floor(t / 86400000);
    // calcula quantidade de cada ativo até essa data
    const qtds: Record<string, number> = {};
    for (const l of lancs) {
      if (l.data.getTime() > t) continue;
      const q = qtds[l.cryptoId] ?? 0;
      if (l.tipo === "COMPRA" || isEntradaGratuita(l.tipo)) qtds[l.cryptoId] = q + l.quantidade;
      else if (l.tipo === "VENDA") qtds[l.cryptoId] = q - l.quantidade;
    }
    let valor = 0;
    for (const [cId, qtd] of Object.entries(qtds)) {
      if (qtd <= 0) continue;
      const m = precoPorDia[cId];
      if (!m) continue;
      // Procura o preço mais recente até esse dia
      let preco = 0;
      for (let d = diaKey; d >= diaKey - 30; d--) {
        const p = m.get(d);
        if (p) { preco = p; break; }
      }
      valor += qtd * preco;
    }
    serie.push({ t, v: valor });
  }
  return serie;
}
