import { MoedaProvider } from "@/lib/cripto/moeda";
import { MoedaToggle } from "@/components/cripto/MoedaToggle";
import { getPrecos } from "@/lib/cripto/coingecko";
import { CRYPTO_ASSETS } from "@/lib/cripto/constants";

export const dynamic = "force-dynamic";

export default async function CriptoLayout({ children }: { children: React.ReactNode }) {
  // Calcula rate BRL/USD do BTC como fallback global (caso algum dado não traga USD direto)
  const precos = await getPrecos();
  const btc = precos.find((p) => p.cryptoId === "bitcoin");
  const rate = btc && btc.precoUsd ? btc.precoBrl / btc.precoUsd : 5;

  return (
    <MoedaProvider rateInicial={rate}>
      <div className="flex justify-end mb-4">
        <MoedaToggle />
      </div>
      {children}
    </MoedaProvider>
  );
}
