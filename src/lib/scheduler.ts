import "server-only";
import { tentarBackupAgendado } from "./backup";
import { log } from "./log";

let timer: NodeJS.Timeout | null = null;
const INTERVALO_MS = 15 * 60 * 1000; // checa a cada 15 minutos

/**
 * Inicia o scheduler in-process. Chamado uma vez pelo instrumentation.ts.
 * Verifica regularmente se o backup agendado precisa rodar.
 */
export function iniciarScheduler() {
  if (timer) return;
  log.info("scheduler.start", { intervaloMin: INTERVALO_MS / 60_000 });

  // Primeira tentativa após 30s pra dar tempo do app subir
  setTimeout(() => {
    tentarBackupAgendado().catch((e) => log.warn("backup.tick.fail", { erro: e?.message }));
  }, 30_000);

  timer = setInterval(() => {
    tentarBackupAgendado().catch((e) => log.warn("backup.tick.fail", { erro: e?.message }));
  }, INTERVALO_MS);

  // Não impede o processo de fechar
  if (typeof timer.unref === "function") timer.unref();
}
