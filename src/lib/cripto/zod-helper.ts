import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

/**
 * Faz parse de um body com schema Zod. Em caso de erro:
 * - devolve NextResponse 422 com mensagem amigável
 * - caller deve checar `.ok` (objeto retornado) ou tratar Response
 *
 * Uso:
 *   const r = await parseBody(req, schema);
 *   if (!r.ok) return r.response;
 *   const body = r.data;
 */
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
      response: NextResponse.json({ erro: "JSON inválido no corpo da requisição" }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => {
      const path = i.path.join(".") || "(root)";
      return `${path}: ${i.message}`;
    });
    return {
      ok: false,
      response: NextResponse.json(
        { erro: "Dados inválidos", detalhes: issues },
        { status: 422 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
