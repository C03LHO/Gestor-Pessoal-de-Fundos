import { getCarteiraAtivaId } from "@/lib/carteira";
import { getPrecos } from "@/lib/cripto/coingecko";
import { calcularPosicoesCripto, resumoCarteiraCripto } from "@/lib/cripto/carteira";
import { CarteiraCriptoClient } from "./CarteiraCriptoClient";

export const dynamic = "force-dynamic";

export default async function CriptoCarteiraPage() {
  const carteiraId = await getCarteiraAtivaId();
  const precos = await getPrecos();
  const posicoes = await calcularPosicoesCripto(carteiraId, precos);
  const resumo = resumoCarteiraCripto(posicoes, precos);

  // Mapeia rate BRL/USD por ativo para que o cliente possa formatar em USD sem conversão extra.
  const precosMap = Object.fromEntries(precos.map((p) => [p.cryptoId, { brl: p.precoBrl, usd: p.precoUsd }]));

  return (
    <CarteiraCriptoClient
      posicoes={JSON.parse(JSON.stringify(posicoes))}
      resumo={JSON.parse(JSON.stringify(resumo))}
      precosMap={precosMap}
    />
  );
}
