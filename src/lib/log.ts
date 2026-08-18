type Nivel = "info" | "warn" | "error" | "debug";

/**
 * JSON.stringify não sabe serializar BigInt e lança TypeError. Isso importa aqui
 * porque o Prisma mapeia INTEGER do SQLite para BigInt em $queryRaw — logar o
 * retorno de um PRAGMA (busy_timeout, wal_checkpoint) derrubava o chamador, e
 * quando a chamada estava dentro de um try/catch o erro real ficava mascarado
 * por uma mensagem de falha enganosa. Logar nunca deve quebrar quem loga.
 */
function substituto(_chave: string, valor: unknown) {
  if (typeof valor === "bigint") {
    return valor >= BigInt(Number.MIN_SAFE_INTEGER) && valor <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(valor)
      : valor.toString();
  }
  return valor;
}

function emit(nivel: Nivel, msg: string, ctx?: Record<string, unknown>) {
  const evento = {
    t: new Date().toISOString(),
    nivel,
    msg,
    ...(ctx ?? {}),
  };

  let linha: string;
  try {
    linha = JSON.stringify(evento, substituto);
  } catch (e: any) {
    // Último recurso (ex: referência circular no ctx): perde o contexto mas
    // preserva o evento em vez de propagar a exceção para o chamador.
    linha = JSON.stringify({
      t: evento.t,
      nivel,
      msg,
      ctx_erro: e?.message ?? "contexto não serializável",
    });
  }

  if (nivel === "error") console.error(linha);
  else if (nivel === "warn") console.warn(linha);
  else console.log(linha);
}

export const log = {
  info:  (m: string, c?: Record<string, unknown>) => emit("info", m, c),
  warn:  (m: string, c?: Record<string, unknown>) => emit("warn", m, c),
  error: (m: string, c?: Record<string, unknown>) => emit("error", m, c),
  debug: (m: string, c?: Record<string, unknown>) =>
    process.env.NODE_ENV !== "production" && emit("debug", m, c),
};
