import { calcularPosicoes, resumoCarteira } from "@/lib/domain/posicao";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { CarteiraClient } from "./CarteiraClient";

export const dynamic = "force-dynamic";

export default async function CarteiraPage() {
  const carteiraId = await getCarteiraAtivaId();
  const posicoes = await calcularPosicoes(carteiraId);
  const resumo = resumoCarteira(posicoes);

  return (
    <CarteiraClient
      posicoes={JSON.parse(JSON.stringify(posicoes))}
      patrimonio={resumo.valorAtual}
    />
  );
}
