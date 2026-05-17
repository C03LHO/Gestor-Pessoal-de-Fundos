/**
 * Wrapper de fetch com timeout obrigatório. Todas as integrações externas
 * devem usar isso — fetch nativo do Node não tem timeout default e pode
 * travar para sempre.
 */
export async function fetchTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}
