import { getPrecos, getHistoricoTodos, variacaoNDias } from "@/lib/cripto/coingecko";
import { analisar } from "@/lib/cripto/analise";
import { CRYPTO_ASSETS } from "@/lib/cripto/constants";
import { GraficosCriptoClient } from "./GraficosCriptoClient";

export const dynamic = "force-dynamic";

export default async function GraficosCriptoPage() {
  const precos = await getPrecos();
  const historicos = await getHistoricoTodos(365);

  const dados = CRYPTO_ASSETS.map((a) => {
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
      variacao30d: hist ? variacaoNDias(hist.pontos, 30) : null,
      volume24hBrl: preco?.volume24hBrl ?? null,
      offline: preco?.offline ?? false,
      historico: hist?.pontos ?? [],
      score: ana?.score ?? null,
      tendencia: ana?.indicadores?.tendencia.valor ?? null,
    };
  });

  return <GraficosCriptoClient dados={JSON.parse(JSON.stringify(dados))} />;
}
