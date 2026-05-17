import { prisma } from "@/lib/prisma";
import { calcularPosicoes, resumoCarteira } from "@/lib/domain/posicao";
import { historicoAportes } from "@/lib/domain/historico";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { MetasClient } from "./MetasClient";

export const dynamic = "force-dynamic";

export default async function MetasPage() {
  const carteiraId = await getCarteiraAtivaId();
  const [meta, cfg, posicoes, hist] = await Promise.all([
    prisma.meta.findFirst({ where: { ativa: true } }),
    prisma.configuracao.findFirst(),
    calcularPosicoes(carteiraId),
    historicoAportes(12, carteiraId),
  ]);
  const resumo = resumoCarteira(posicoes);

  return (
    <MetasClient
      meta={meta ? JSON.parse(JSON.stringify(meta)) : null}
      cfg={cfg ? JSON.parse(JSON.stringify(cfg)) : null}
      patrimonio={resumo.valorAtual}
      rendaAtual={resumo.mediaMensal}
      yieldRealizado={resumo.yieldOnCost}
      aporteMedioReal={hist.mediaMensal12m}
    />
  );
}
