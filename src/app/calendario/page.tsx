import { prisma } from "@/lib/prisma";
import { previsaoProximoMes } from "@/lib/domain/previsao";
import { proximosDividendos } from "@/lib/domain/proximos-dividendos";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { CalendarioClient } from "./CalendarioClient";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const carteiraId = await getCarteiraAtivaId();
  const [divs, previsao, proximos] = await Promise.all([
    prisma.lancamento.findMany({
      where: { tipo: "DIVIDENDO", carteiraId },
      include: { ativo: true },
      orderBy: { data: "desc" },
      take: 200,
    }),
    previsaoProximoMes(carteiraId),
    proximosDividendos(carteiraId),
  ]);

  return (
    <CalendarioClient
      lancamentos={JSON.parse(JSON.stringify(divs))}
      previsao={JSON.parse(JSON.stringify(previsao))}
      proximos={JSON.parse(JSON.stringify(proximos))}
    />
  );
}
