import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Export em JSON, para migração/inspeção. Para restauração completa use
 * /api/backup/exportar, que baixa o banco inteiro.
 *
 * ATENÇÃO: `configuracao` inclui tokens de API e a chave VAPID privada. O
 * arquivo deve ser tratado como segredo.
 *
 * Caches (CryptoPriceCache/CryptoHistoryCache), credenciais de login (Passkey,
 * ChallengeAuth) e inscrições push ficam de fora de propósito: são
 * reconstruíveis ou atrelados ao dispositivo.
 */
export async function GET() {
  const [
    carteiras, ativos, lancamentos, meta, configuracao, cotacoes,
    cryptoTransactions, watchlist,
  ] = await Promise.all([
    prisma.carteira.findMany(),
    prisma.ativo.findMany(),
    prisma.lancamento.findMany(),
    prisma.meta.findFirst(),
    prisma.configuracao.findFirst(),
    prisma.cotacao.findMany({ orderBy: { data: "desc" }, take: 5000 }),
    prisma.cryptoTransaction.findMany(),
    prisma.watchlistAtivo.findMany(),
  ]);

  const payload = {
    versao: 2,
    geradoEm: new Date().toISOString(),
    carteiras,
    ativos,
    lancamentos,
    meta,
    configuracao,
    cotacoes,
    cryptoTransactions,
    watchlist,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename=fundos-${new Date().toISOString().slice(0, 10)}.json`,
      "Cache-Control": "no-store",
    },
  });
}
