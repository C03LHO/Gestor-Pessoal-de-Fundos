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
 *
 * Todos os PRAGMAs passam por $queryRawUnsafe: os que consultam/definem um valor
 * (journal_mode, busy_timeout) devolvem uma linha de resultado, e o driver rejeita
 * isso em $executeRawUnsafe ("Execute returned results, which is not allowed in
 * SQLite"). $queryRawUnsafe também aceita statements sem retorno — devolve [].
 *
 * Escopo: journal_mode é gravado no cabeçalho do arquivo .db, então vale para todas
 * as conexões e sobrevive a restarts. Já synchronous e busy_timeout são por conexão,
 * e o Prisma mantém um pool — na prática só valem para a conexão que atendeu este
 * comando. São, portanto, best-effort; não conte com busy_timeout como garantia
 * contra SQLITE_BUSY em escritas concorrentes.
 */
export async function aplicarPragmasSqlite() {
  if (aplicado) return;
  try {
    const modo = await prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>(
      "PRAGMA journal_mode=WAL",
    );
    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL");
    const espera = await prisma.$queryRawUnsafe<Array<{ timeout: number }>>(
      "PRAGMA busy_timeout=5000",
    );
    aplicado = true;
    log.info("db.pragmas_aplicados", {
      journal_mode: modo?.[0]?.journal_mode,
      busy_timeout: Number(espera?.[0]?.timeout ?? 0),
    });
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
    // DELETE não devolve linhas — $executeRawUnsafe é o método correto aqui.
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
