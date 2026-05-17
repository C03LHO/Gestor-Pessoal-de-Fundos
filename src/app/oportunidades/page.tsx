import { calcularOportunidades } from "@/lib/domain/watchlist";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { OportunidadesClient } from "./OportunidadesClient";

export const dynamic = "force-dynamic";

export default async function OportunidadesPage() {
  const carteiraId = await getCarteiraAtivaId();
  const oport = await calcularOportunidades(carteiraId);
  return <OportunidadesClient oportunidades={JSON.parse(JSON.stringify(oport))} />;
}
