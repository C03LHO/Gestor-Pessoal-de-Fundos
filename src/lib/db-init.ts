import "server-only";
import { prisma } from "./prisma";
import { log } from "./log";

let aplicado = false;

/**
 * Aplica configurações de runtime no SQLite que melhoram performance/concorrência.
 * Chamado uma vez na inicialização do servidor (via instrumentation).
 *
 * - WAL: permite leituras concorrentes a escritas (sem lock global)
 * - synchronous=NORMAL: faster + safe with WAL
 * - busy_timeout: espera 5s em vez de retornar SQLITE_BUSY na hora
 */
export async function aplicarPragmasSqlite() {
  if (aplicado) return;
  try {
    // journal_mode retorna uma linha com o modo aplicado — usa $queryRawUnsafe.
    const modo = await prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>("PRAGMA journal_mode=WAL");
    await prisma.$executeRawUnsafe("PRAGMA synchronous=NORMAL");
    await prisma.$executeRawUnsafe("PRAGMA busy_timeout=5000");
    aplicado = true;
    log.info("db.pragmas_aplicados", { journal_mode: modo?.[0]?.journal_mode });
  } catch (e: any) {
    log.warn("db.pragmas_falhou", { erro: e?.message });
  }
}

/**
 * Mantém apenas 1 registro de Cotacao por dia/ticker (o mais recente).
 * Previne crescimento descontrolado da tabela.
 *
 * Roda em background; falhar silenciosamente é OK (otimização).
 */
export async function limparCotacoesAntigas() {
  try {
    // Estratégia: mantém o registro de id mais alto (mais recente) por (ticker, data dia)
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM Cotacao
      WHERE id NOT IN (
        SELECT id FROM Cotacao c1
        WHERE id = (
          SELECT id FROM Cotacao c2
          WHERE c2.ticker = c1.ticker
            AND date(c2.data) = date(c1.data)
          ORDER BY c2.data DESC LIMIT 1
        )
      )
    `);
    log.info("db.cotacao_cleanup", { removidos: result });
  } catch (e: any) {
    log.warn("db.cotacao_cleanup_falhou", { erro: e?.message });
  }
}
