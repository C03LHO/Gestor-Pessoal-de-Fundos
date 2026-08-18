import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Corrige DIVIDENDOs órfãos (sem carteiraId), devolvendo cada um à carteira que
 * de fato tem posição naquele ativo.
 *
 * A versão anterior atribuía TODOS os órfãos à carteira ativa (a do cookie).
 * Com mais de uma carteira isso movia dividendo de FII para dentro da carteira
 * de cripto, por exemplo — trocava um problema de visibilidade por um de
 * atribuição errada, que é pior porque contamina os totais silenciosamente.
 *
 * Regra: só adota quando o destino é inequívoco (exatamente uma carteira tem
 * COMPRA/REINVESTIMENTO daquele ativo). Casos ambíguos são reportados e
 * deixados intactos — nunca se chuta o destino de um registro financeiro.
 *
 * Nenhum registro é apagado em nenhum caminho.
 *
 * POST /api/debug/adotar-dividendos
 */
export async function POST() {
  const { adotaveis, ambiguos, semDono } = await classificar();

  let adotados = 0;
  for (const [carteiraId, ids] of adotaveis) {
    const r = await prisma.lancamento.updateMany({
      where: { id: { in: ids } },
      data: { carteiraId },
    });
    adotados += r.count;
  }

  return NextResponse.json({
    adotados,
    ambiguos: ambiguos.length,
    semDono: semDono.length,
    detalhe: {
      ambiguos: ambiguos.map((a) => ({ ticker: a.ticker, carteiras: a.carteiras })),
      semDono: semDono.map((s) => s.ticker),
    },
  });
}

export async function GET() {
  const { adotaveis, ambiguos, semDono } = await classificar();
  const adotaveisTotal = [...adotaveis.values()].reduce((n, ids) => n + ids.length, 0);
  return NextResponse.json({
    orfaos: adotaveisTotal + ambiguos.length + semDono.length,
    adotaveis: adotaveisTotal,
    ambiguos: ambiguos.map((a) => ({ ticker: a.ticker, carteiras: a.carteiras })),
    semDono: semDono.map((s) => s.ticker),
  });
}

/**
 * Separa os órfãos em: adotáveis (uma carteira dona), ambíguos (mais de uma)
 * e sem dono (nenhuma carteira tem posição naquele ativo).
 */
async function classificar() {
  const orfaos = await prisma.lancamento.findMany({
    where: { tipo: "DIVIDENDO", carteiraId: null },
    select: { id: true, ativoId: true, ativo: { select: { ticker: true } } },
  });

  const adotaveis = new Map<string, string[]>(); // carteiraId -> ids de lançamento
  const ambiguos: { ticker: string; carteiras: number }[] = [];
  const semDono: { ticker: string }[] = [];

  // Cache por ativo: vários órfãos do mesmo ativo compartilham o mesmo dono.
  const donoPorAtivo = new Map<string, string[]>();

  for (const o of orfaos) {
    const ticker = o.ativo?.ticker ?? "(sem ativo)";
    if (!o.ativoId) {
      semDono.push({ ticker });
      continue;
    }

    let donos = donoPorAtivo.get(o.ativoId);
    if (!donos) {
      const posicoes = await prisma.lancamento.findMany({
        where: {
          ativoId: o.ativoId,
          tipo: { in: ["COMPRA", "REINVESTIMENTO"] },
          carteiraId: { not: null },
        },
        select: { carteiraId: true },
        distinct: ["carteiraId"],
      });
      donos = posicoes.map((p) => p.carteiraId!).filter(Boolean);
      donoPorAtivo.set(o.ativoId, donos);
    }

    if (donos.length === 1) {
      const lista = adotaveis.get(donos[0]);
      if (lista) lista.push(o.id);
      else adotaveis.set(donos[0], [o.id]);
    } else if (donos.length > 1) {
      ambiguos.push({ ticker, carteiras: donos.length });
    } else {
      semDono.push({ ticker });
    }
  }

  return { adotaveis, ambiguos, semDono };
}
