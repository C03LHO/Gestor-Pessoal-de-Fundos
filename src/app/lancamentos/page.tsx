import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { LancamentosClient } from "./LancamentosClient";

export const dynamic = "force-dynamic";

export default async function LancamentosPage() {
  const carteiraId = await getCarteiraAtivaId();
  const lancamentos = await prisma.lancamento.findMany({
    where: { carteiraId },
    include: { ativo: true },
    orderBy: { data: "desc" },
    take: 500,
  });

  const ativosComUltimoPreco = await prisma.ativo.findMany({
    include: {
      lancamentos: {
        where: { tipo: { in: ["COMPRA", "REINVESTIMENTO"] }, precoUnit: { not: null } },
        orderBy: { data: "desc" },
        take: 1,
        select: { precoUnit: true },
      },
    },
    orderBy: { ticker: "asc" },
  });

  const ativos = ativosComUltimoPreco.map((a) => ({
    id: a.id,
    ticker: a.ticker,
    nome: a.nome,
    precoAtual: a.precoAtual,
    ultimoPrecoCompra: a.lancamentos[0]?.precoUnit ?? null,
  }));

  return (
    <LancamentosClient
      lancamentos={JSON.parse(JSON.stringify(lancamentos))}
      ativos={JSON.parse(JSON.stringify(ativos))}
    />
  );
}
