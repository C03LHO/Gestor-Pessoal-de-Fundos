import "server-only";
import { tentarBackupAgendado } from "./backup";
import { aplicarPragmasSqlite, limparCotacoesAntigas } from "./db-init";
import { log } from "./log";

let timer: NodeJS.Timeout | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;
const INTERVALO_MS = 15 * 60 * 1000;
const CLEANUP_MS = 24 * 60 * 60 * 1000; // 1 vez por dia

export function iniciarScheduler() {
  if (timer) return;
  log.info("scheduler.start", { intervaloMin: INTERVALO_MS / 60_000 });

  // PRAGMAs do SQLite (WAL etc.) no startup
  aplicarPragmasSqlite().catch((e) => log.warn("pragmas.fail", { erro: e?.message }));

  // Primeira tentativa de backup após 30s pra dar tempo do app subir
  setTimeout(() => {
    tentarBackupAgendado().catch((e) => log.warn("backup.tick.fail", { erro: e?.message }));
  }, 30_000);

  // Cleanup da tabela de cotações: 1 hora após o boot, depois 1×/dia
  setTimeout(() => {
    limparCotacoesAntigas().catch(() => {});
    cleanupTimer = setInterval(() => {
      limparCotacoesAntigas().catch(() => {});
    }, CLEANUP_MS);
    if (cleanupTimer && typeof cleanupTimer.unref === "function") cleanupTimer.unref();
  }, 60 * 60 * 1000);

  timer = setInterval(() => {
    tentarBackupAgendado().catch((e) => log.warn("backup.tick.fail", { erro: e?.message }));
  }, INTERVALO_MS);

  if (typeof timer.unref === "function") timer.unref();
}
