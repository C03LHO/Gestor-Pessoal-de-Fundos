import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

/**
 * Verifica se o cookie do usuário foi emitido em uma versão de auth ainda
 * válida. Se não, força logout. Roda no layout (server component).
 */
export async function validarSessao() {
  if (!process.env.APP_PASSWORD) return; // auth desabilitada
  const c = (await cookies()).get("fundos_auth")?.value;
  if (!c) return;
  const partes = c.split(".");
  const v = parseInt(partes[1] ?? "0");
  if (!v) return;
  const cfg = await prisma.configuracao.findFirst();
  const atual = cfg?.authVersion ?? 1;
  if (v < atual) redirect("/login?expired=1");
}
