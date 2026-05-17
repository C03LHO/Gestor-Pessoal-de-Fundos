import { prisma } from "@/lib/prisma";
import { calcularPosicoes, resumoCarteira } from "@/lib/domain/posicao";
import { historicoAportes } from "@/lib/domain/historico";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { SimuladorClient } from "./SimuladorClient";

export const dynamic = "force-dynamic";

export default async function SimuladorPage() {
  const carteiraId = await getCarteiraAtivaId();
  const [cfg, meta, posicoes, hist] = await Promise.all([
    prisma.configuracao.findFirst(),
    prisma.meta.findFirst({ where: { ativa: true } }),
    calcularPosicoes(carteiraId),
    historicoAportes(12, carteiraId),
  ]);
  const resumo = resumoCarteira(posicoes);

  return (
    <SimuladorClient
      patrimonio={resumo.valorAtual}
      yieldRealizado={resumo.yieldOnCost}
      metaMensal={meta?.rendaMensalAlvo ?? 10000}
      historico={hist}
      cenarios={{
        conservador: cfg?.cenarioConservador ?? 0.06,
        moderado: cfg?.cenarioModerado ?? 0.09,
        otimista: cfg?.cenarioOtimista ?? 0.12,
      }}
    />
  );
}
