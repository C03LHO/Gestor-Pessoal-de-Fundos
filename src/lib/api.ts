/**
 * Helpers de rota de API — validação de entrada padronizada.
 *
 * Padrão único do projeto: toda rota que lê corpo JSON usa `parseBody`, que faz
 * `safeParse` e, em falha, devolve uma resposta pronta (400 para JSON inválido,
 * 422 para schema inválido) com mensagem amigável. Evita o antipadrão
 * `schema.parse(await req.json())` solto, que vazava 500 com stack do ZodError.
 *
 * Uso:
 *   const r = await parseBody(req, schema);
 *   if (!r.ok) return r.response;
 *   const body = r.data;
 */
import { NextResponse } from "next/server";
import type { z } from "zod";

export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { erro: "JSON inválido no corpo da requisição" },
        { status: 400 },
      ),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detalhes = parsed.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    return {
      ok: false,
      response: NextResponse.json(
        { erro: "Dados inválidos", detalhes },
        { status: 422 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
