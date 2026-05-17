import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE = "fundos_carteira";

/**
 * Devolve o ID da carteira ativa (do cookie, ou primeira existente).
 * Sempre retorna um ID válido — cria "Principal" se não houver nenhuma.
 */
export async function getCarteiraAtivaId(): Promise<string> {
  const c = (await cookies()).get(COOKIE)?.value;
  if (c) {
    const existe = await prisma.carteira.findUnique({ where: { id: c }, select: { id: true } });
    if (existe) return existe.id;
  }

  const primeira = await prisma.carteira.findFirst({ orderBy: { criadaEm: "asc" } });
  if (primeira) return primeira.id;

  // Idempotente: se outra request criou em paralelo, upsert por nome único evita duplicata
  const nova = await prisma.carteira.upsert({
    where: { nome: "Principal" },
    create: { nome: "Principal", cor: "#10b981" },
    update: {},
  });
  return nova.id;
}

export async function listarCarteiras() {
  return prisma.carteira.findMany({ orderBy: { criadaEm: "asc" } });
}
