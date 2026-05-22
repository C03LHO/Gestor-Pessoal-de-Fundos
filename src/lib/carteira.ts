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

/**
 * Devolve { id, tipo } da carteira ativa. Tipo é "FII" | "CRIPTO".
 * Usado pelo layout para decidir qual navegação renderizar.
 */
export async function getCarteiraAtiva(): Promise<{ id: string; tipo: "FII" | "CRIPTO" }> {
  const id = await getCarteiraAtivaId();
  const c = await prisma.carteira.findUnique({ where: { id }, select: { tipo: true } });
  const tipo = (c?.tipo === "CRIPTO" ? "CRIPTO" : "FII") as "FII" | "CRIPTO";
  return { id, tipo };
}
