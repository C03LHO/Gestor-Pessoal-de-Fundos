import { prisma } from "@/lib/prisma";
import { IaClient } from "./IaClient";

export const dynamic = "force-dynamic";

export default async function IaPage() {
  const cfg = await prisma.configuracao.findFirst();
  const configurada = Boolean(cfg?.iaProvedor && cfg?.iaApiKey);
  return <IaClient configurada={configurada} provedor={cfg?.iaProvedor ?? null} />;
}
