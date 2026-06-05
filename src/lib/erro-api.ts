/**
 * Extrai uma mensagem de erro amigável de uma Response de API, lidando com os
 * dois formatos do backend:
 *  - JSON `{ erro, detalhes? }` (rotas validadas via parseBody)
 *  - texto puro (rotas mais antigas: P2002, mensagens de negócio)
 *
 * Uso no client:
 *   if (!r.ok) { toast("erro", await mensagemErro(r)); return; }
 */
export async function mensagemErro(r: Response, fallback = "Algo deu errado."): Promise<string> {
  try {
    const ct = r.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j: any = await r.json();
      if (typeof j?.erro === "string") {
        if (Array.isArray(j?.detalhes) && j.detalhes.length > 0) {
          return `${j.erro}: ${j.detalhes.join("; ")}`;
        }
        return j.erro;
      }
      if (typeof j?.message === "string") return j.message;
    } else {
      const t = (await r.text()).trim();
      if (t) return t.slice(0, 250);
    }
  } catch {
    // resposta sem corpo / corpo ilegível — cai no fallback
  }
  return fallback;
}
