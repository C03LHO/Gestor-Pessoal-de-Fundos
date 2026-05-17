type Nivel = "info" | "warn" | "error" | "debug";

function emit(nivel: Nivel, msg: string, ctx?: Record<string, unknown>) {
  const evento = {
    t: new Date().toISOString(),
    nivel,
    msg,
    ...(ctx ?? {}),
  };
  const linha = JSON.stringify(evento);
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
