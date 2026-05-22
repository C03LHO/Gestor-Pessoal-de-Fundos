import { prisma } from "@/lib/prisma";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { getPrecos } from "@/lib/cripto/coingecko";
import { CRYPTO_ASSETS, isEntradaGratuita } from "@/lib/cripto/constants";
import { LancamentosCriptoClient } from "./LancamentosCriptoClient";

export const dynamic = "force-dynamic";

export default async function LancamentosCriptoPage() {
  const carteiraId = await getCarteiraAtivaId();
  const [lancs, precos] = await Promise.all([
    prisma.cryptoTransaction.findMany({
      where: { carteiraId },
      orderBy: { data: "desc" },
      take: 500,
    }),
    getPrecos(),
  ]);

  // saldo por ativo (igual à lógica de quantidadeAtual, mas calculado em memória)
  const saldos: Record<string, number> = {};
  for (const a of CRYPTO_ASSETS) saldos[a.id] = 0;
  // refetch all em ordem cronológica para saldos
  const todos = await prisma.cryptoTransaction.findMany({
    where: { carteiraId },
    orderBy: { data: "asc" },
  });
  for (const l of todos) {
    if (l.tipo === "COMPRA" || isEntradaGratuita(l.tipo)) saldos[l.cryptoId] = (saldos[l.cryptoId] ?? 0) + l.quantidade;
    else if (l.tipo === "VENDA") saldos[l.cryptoId] = (saldos[l.cryptoId] ?? 0) - l.quantidade;
  }

  const precosSnap = precos.map((p) => ({ cryptoId: p.cryptoId, precoBrl: p.precoBrl, precoUsd: p.precoUsd }));

  return (
    <LancamentosCriptoClient
      lancamentos={JSON.parse(JSON.stringify(lancs))}
      precos={precosSnap}
      saldos={saldos}
    />
  );
}
