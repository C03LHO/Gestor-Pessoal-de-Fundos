import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buscarDividendos } from "@/lib/mercado/yahoo";
import { AtivoClient } from "./AtivoClient";

export const dynamic = "force-dynamic";

export default async function AtivoPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const t = ticker.toUpperCase();

  const ativo = await prisma.ativo.findUnique({
    where: { ticker: t },
    include: { lancamentos: { orderBy: { data: "desc" } } },
  });
  if (!ativo) return notFound();

  const [cotacoes, dividendosYahoo] = await Promise.all([
    prisma.cotacao.findMany({ where: { ticker: t }, orderBy: { data: "asc" } }),
    buscarDividendos(t, 5).catch(() => []),
  ]);

  return (
    <AtivoClient
      ativo={JSON.parse(JSON.stringify(ativo))}
      cotacoes={JSON.parse(JSON.stringify(cotacoes))}
      dividendosYahoo={JSON.parse(JSON.stringify(dividendosYahoo))}
    />
  );
}
