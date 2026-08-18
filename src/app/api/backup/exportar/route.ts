import { NextResponse } from "next/server";
import { exportarBanco } from "@/lib/db-arquivo";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Baixa o banco inteiro como arquivo .db.
 *
 * É um SQLite comum: dá para abrir em qualquer ferramenta e serve como
 * restauração completa via importação.
 */
export async function GET() {
  try {
    const { dados, nome, paginas } = await exportarBanco();
    log.info("backup.export", { bytes: dados.length, paginasCheckpoint: paginas });

    return new NextResponse(new Uint8Array(dados), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${nome}"`,
        "Content-Length": String(dados.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    log.error("backup.export_falhou", { erro: e?.message });
    return NextResponse.json({ erro: e?.message ?? "falha ao exportar" }, { status: 500 });
  }
}
