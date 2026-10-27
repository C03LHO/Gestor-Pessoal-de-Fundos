import { prisma } from "./prisma";

/**
 * Devolve a linha única de Configuracao, criando-a com os defaults do schema
 * se ainda não existir. Bancos que nunca salvaram a tela de configurações não
 * têm a linha, e as rotas que só faziam `update` respondiam 500
 * "sem configuração" (backup, logout de todos, configurações completas).
 */
export async function garantirConfiguracao() {
  const atual = await prisma.configuracao.findFirst();
  if (atual) return atual;
  return prisma.configuracao.create({ data: {} });
}
