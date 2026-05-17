import { prisma } from "@/lib/prisma";
import { ConfigClient } from "./ConfigClient";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const [cfg, ultimaSync, carteiras] = await Promise.all([
    prisma.configuracao.findFirst(),
    prisma.ativo.findFirst({ orderBy: { atualizadoEm: "desc" }, select: { atualizadoEm: true } }),
    prisma.carteira.findMany({ orderBy: { criadaEm: "asc" } }),
  ]);

  return (
    <ConfigClient
      cfg={cfg ? JSON.parse(JSON.stringify(cfg)) : null}
      ultimaSync={ultimaSync?.atualizadoEm?.toISOString() ?? null}
      carteiras={JSON.parse(JSON.stringify(carteiras))}
    />
  );
}
