import "server-only";
import { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { log } from "./log";

// Lazy load de Node built-ins via require pra evitar webpack tentar bundlear
function nodeMod<T = any>(name: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const req = eval("require") as NodeRequire;
  return req(name);
}

type FS = typeof import("fs");
type PATH = typeof import("path");

/** Cabeçalho de todo arquivo SQLite 3 (16 bytes, terminado em NUL). */
const MAGIC_SQLITE = "SQLite format 3\0";

export function caminhoDoBanco(): string {
  const fs = nodeMod<FS>("fs");
  const path = nodeMod<PATH>("path");
  const prod = "/app/data/data.db";
  if (fs.existsSync(prod)) return prod;
  return path.resolve("./data.db");
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

/**
 * Move o conteúdo do -wal para dentro do .db.
 *
 * Em modo WAL as escritas recentes ficam no arquivo lateral; copiar só o .db
 * sem isso produz um backup sem os últimos lançamentos. Retorna as páginas
 * movidas, ou null se o checkpoint falhou (o export segue mesmo assim, mas o
 * chamador consegue avisar).
 */
export async function checkpointWal(): Promise<number | null> {
  try {
    const [cp] = await prisma.$queryRawUnsafe<
      Array<{ busy: number; log: number; checkpointed: number }>
    >("PRAGMA wal_checkpoint(TRUNCATE)");
    return Number(cp?.checkpointed ?? 0);
  } catch (e: any) {
    log.warn("db-arquivo.checkpoint_falhou", { erro: e?.message });
    return null;
  }
}

/** Lê o banco já consolidado, pronto para download. */
export async function exportarBanco(): Promise<{ dados: Buffer; nome: string; paginas: number | null }> {
  const paginas = await checkpointWal();
  const fs = nodeMod<FS>("fs");
  const dados = fs.readFileSync(caminhoDoBanco());
  return { dados, nome: `fundos-${stamp()}.db`, paginas };
}

export type ResultadoImport =
  | { ok: true; copiaSeguranca: string; conferencia: Record<string, number> }
  | { ok: false; erro: string; copiaSeguranca?: string; restaurado?: boolean };

/**
 * Substitui o banco atual pelo arquivo enviado.
 *
 * Sequência pensada para nunca deixar o usuário sem dado:
 *  1. valida o cabeçalho SQLite antes de tocar em qualquer coisa;
 *  2. valida o conteúdo abrindo o candidato com um client separado e contando
 *     as tabelas principais — arquivo SQLite válido mas de outro app é rejeitado;
 *  3. grava uma cópia do banco atual que NUNCA é apagada;
 *  4. só então troca os arquivos;
 *  5. confere o resultado e, se a conferência falhar, restaura a cópia sozinho.
 */
export async function importarBanco(dados: Buffer): Promise<ResultadoImport> {
  const fs = nodeMod<FS>("fs");
  const path = nodeMod<PATH>("path");

  if (dados.length < 16 || dados.subarray(0, 16).toString("binary") !== MAGIC_SQLITE) {
    return { ok: false, erro: "O arquivo não é um banco SQLite válido." };
  }

  const destino = caminhoDoBanco();
  const dir = path.dirname(destino);
  const marca = stamp();
  const candidato = path.join(dir, `import-candidato-${marca}.db`);

  fs.writeFileSync(candidato, dados);

  // Valida abrindo de fato: pega arquivo SQLite de outra origem antes de destruir nada.
  const conferencia: Record<string, number> = {};
  const teste = new PrismaClient({ datasources: { db: { url: `file:${candidato}` } } });
  try {
    conferencia.lancamentos = await teste.lancamento.count();
    conferencia.ativos = await teste.ativo.count();
    conferencia.carteiras = await teste.carteira.count();
  } catch (e: any) {
    fs.rmSync(candidato, { force: true });
    return { ok: false, erro: `Arquivo não tem o formato do Gestor de Fundos: ${e?.message ?? "leitura falhou"}` };
  } finally {
    await teste.$disconnect().catch(() => {});
  }

  // Consolida o banco atual e guarda a cópia de segurança — nunca removida.
  await checkpointWal();
  const copiaSeguranca = path.join(dir, `backup-antes-de-importar-${marca}.db`);
  try {
    fs.copyFileSync(destino, copiaSeguranca);
  } catch (e: any) {
    fs.rmSync(candidato, { force: true });
    return { ok: false, erro: `Não foi possível salvar a cópia de segurança, importação abortada: ${e?.message}` };
  }

  // Fecha as conexões antes de trocar o arquivo debaixo do Prisma.
  await prisma.$disconnect().catch(() => {});

  try {
    fs.renameSync(candidato, destino);
    // -wal/-shm do banco antigo não valem para o novo arquivo; deixá-los corrompe.
    fs.rmSync(`${destino}-wal`, { force: true });
    fs.rmSync(`${destino}-shm`, { force: true });
  } catch (e: any) {
    const restaurado = restaurar(copiaSeguranca, destino);
    return { ok: false, erro: `Falha ao trocar o arquivo: ${e?.message}`, copiaSeguranca, restaurado };
  }

  // Confere lendo pelo client normal (reconecta sozinho no arquivo novo).
  try {
    const depois = await prisma.lancamento.count();
    if (depois !== conferencia.lancamentos) {
      throw new Error(`esperado ${conferencia.lancamentos} lançamentos, lido ${depois}`);
    }
  } catch (e: any) {
    const restaurado = restaurar(copiaSeguranca, destino);
    log.error("db-arquivo.import_revertido", { erro: e?.message, restaurado });
    return {
      ok: false,
      erro: `Importação revertida — o banco novo não passou na conferência: ${e?.message}`,
      copiaSeguranca,
      restaurado,
    };
  }

  log.info("db-arquivo.import_ok", { ...conferencia, copiaSeguranca });
  return { ok: true, copiaSeguranca, conferencia };
}

function restaurar(copia: string, destino: string): boolean {
  try {
    const fs = nodeMod<FS>("fs");
    fs.copyFileSync(copia, destino);
    fs.rmSync(`${destino}-wal`, { force: true });
    fs.rmSync(`${destino}-shm`, { force: true });
    return true;
  } catch (e: any) {
    log.error("db-arquivo.restauracao_falhou", { erro: e?.message, copia });
    return false;
  }
}
