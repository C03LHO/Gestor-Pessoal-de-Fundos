/**
 * Wrapper de fetch com timeout obrigatório. Todas as integrações externas
 * devem usar isso — fetch nativo do Node não tem timeout default e pode
 * travar para sempre.
 *
 * Inclui um disjuntor por host: se um host não responde (timeout ou erro de
 * rede), as chamadas seguintes para ele falham na hora por uma pausa que
 * dobra a cada falha seguida (1 min → 10 min no máximo). Sem isso, com a
 * rede fora, cada página esperava o timeout de várias chamadas e levava 8s+
 * para renderizar.
 */
const PAUSA_MIN_MS = 60_000;
const PAUSA_MAX_MS = 10 * 60_000;
const hostIndisponivel = new Map<string, { ate: number; falhas: number }>();

function hostDe(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}

export class HostIndisponivelError extends Error {
  constructor(host: string) {
    super(`Host ${host} indisponível (falhou há pouco); tentando de novo em breve`);
    this.name = "HostIndisponivelError";
  }
}

export async function fetchTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000,
): Promise<Response> {
  const host = hostDe(url);
  const estado = hostIndisponivel.get(host);
  if (estado && estado.ate > Date.now()) throw new HostIndisponivelError(host);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    hostIndisponivel.delete(host);
    return r;
  } catch (e) {
    const atual = hostIndisponivel.get(host);
    // Chamadas paralelas que falham juntas contam como uma falha só.
    if (atual && atual.ate > Date.now()) throw e;
    const falhas = (atual?.falhas ?? 0) + 1;
    const pausa = Math.min(PAUSA_MAX_MS, PAUSA_MIN_MS * 2 ** (falhas - 1));
    hostIndisponivel.set(host, { ate: Date.now() + pausa, falhas });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
