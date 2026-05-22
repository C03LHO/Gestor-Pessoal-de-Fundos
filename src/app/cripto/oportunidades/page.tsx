import { getPrecos, getHistoricoTodos } from "@/lib/cripto/coingecko";
import { analisar } from "@/lib/cripto/analise";
import { calcularProjecao } from "@/lib/cripto/projecoes";
import { CRYPTO_ASSETS } from "@/lib/cripto/constants";
import { OportunidadesCriptoClient } from "./OportunidadesCriptoClient";

export const dynamic = "force-dynamic";

export default async function OportunidadesCriptoPage() {
  const precos = await getPrecos();
  const historicos = await getHistoricoTodos(365);

  const itens = CRYPTO_ASSETS.map((a) => {
    const preco = precos.find((p) => p.cryptoId === a.id);
    const hist = historicos.find((h) => h.cryptoId === a.id);
    const ana = hist ? analisar(hist, preco?.precoBrl ?? 0) : null;
    const proj = hist ? calcularProjecao(hist, preco?.precoBrl ?? 0) : null;
    return {
      cryptoId: a.id,
      symbol: a.symbol,
      nome: a.name,
      color: a.color,
      precoAtualBrl: preco?.precoBrl ?? 0,
      precoAtualUsd: preco?.precoUsd ?? null,
      variacao24h: preco?.variacao24h ?? null,
      offline: preco?.offline ?? false,
      analise: ana,
      projecao: proj,
      sparkline: (hist?.pontos ?? []).slice(-30),
    };
  });

  itens.sort((a, b) => (b.analise?.score ?? -1) - (a.analise?.score ?? -1));

  return <OportunidadesCriptoClient itens={JSON.parse(JSON.stringify(itens))} />;
}
