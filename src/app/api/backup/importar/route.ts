import { NextRequest, NextResponse } from "next/server";
import { importarBanco } from "@/lib/db-arquivo";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Substitui o banco pelo arquivo enviado (multipart, campo "arquivo").
 *
 * Antes de trocar qualquer coisa, valida o arquivo e grava uma cópia do banco
 * atual em /app/data. Se a conferência pós-troca falhar, a cópia é restaurada
 * automaticamente. A cópia nunca é apagada pelo sistema.
 */
export async function POST(req: NextRequest) {
  let arquivo: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("arquivo");
    if (f instanceof File) arquivo = f;
  } catch {
    return NextResponse.json({ erro: "Envio inválido (esperado multipart/form-data)." }, { status: 400 });
  }

  if (!arquivo) return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  if (arquivo.size === 0) return NextResponse.json({ erro: "Arquivo vazio." }, { status: 400 });

  const dados = Buffer.from(await arquivo.arrayBuffer());
  log.info("backup.import_inicio", { nome: arquivo.name, bytes: dados.length });

  const r = await importarBanco(dados);
  if (!r.ok) {
    log.warn("backup.import_recusado", { erro: r.erro, restaurado: r.restaurado });
    return NextResponse.json(r, { status: 400 });
  }
  return NextResponse.json(r);
}
