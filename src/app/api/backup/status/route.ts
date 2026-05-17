import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listarRemotes, rcloneInstalado, caminhoRcloneDetectado } from "@/lib/backup";

export const runtime = "nodejs";

export async function GET() {
  const [instalado, caminho, cfg] = await Promise.all([
    rcloneInstalado(),
    caminhoRcloneDetectado(),
    prisma.configuracao.findFirst(),
  ]);
  const remotes = instalado ? await listarRemotes() : [];

  return NextResponse.json({
    rcloneInstalado: instalado,
    rcloneCaminhoDetectado: caminho,
    rcloneCaminhoCustom: cfg?.rcloneCaminho ?? null,
    remotesDisponiveis: remotes,
    habilitado: cfg?.backupHabilitado ?? false,
    remote: cfg?.backupRemote ?? null,
    horario: cfg?.backupHorario ?? 23,
    retencaoDias: cfg?.backupRetencaoDias ?? 30,
    ultimoEm: cfg?.backupUltimoEm ?? null,
    ultimoStatus: cfg?.backupUltimoStatus ?? null,
    ultimoArquivo: cfg?.backupUltimoArquivo ?? null,
  });
}
