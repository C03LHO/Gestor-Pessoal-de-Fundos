import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sincronizarDividendosDoAtivo } from "@/lib/domain/sync-dividendos";
import { validarVenda, type LancamentoInput } from "@/lib/domain/portfolio";

const patchSchema = z.object({
  tipo: z.enum(["COMPRA", "VENDA", "APORTE", "DIVIDENDO", "REINVESTIMENTO"]).optional(),
  data: z.coerce.date().optional(),
  ativoId: z.string().nullable().optional(),
  quantidade: z.number().nullable().optional(),
  precoUnit: z.number().nullable().optional(),
  valorTotal: z.number().optional(),
  observacao: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = patchSchema.parse(await req.json());

  // Se virou VENDA (ou já era e mudou data/quantidade/ativoId), revalida posição.
  if (body.tipo === "VENDA" || body.quantidade != null || body.data || body.ativoId) {
    const atual = await prisma.lancamento.findUnique({ where: { id } });
    if (atual) {
      const tipoFinal = body.tipo ?? atual.tipo;
      const ativoFinal = body.ativoId ?? atual.ativoId;
      const qtdFinal = body.quantidade ?? atual.quantidade;
      const dataFinal = body.data ?? atual.data;
      if (tipoFinal === "VENDA" && ativoFinal && qtdFinal) {
        const existentes = await prisma.lancamento.findMany({
          where: { ativoId: ativoFinal, carteiraId: atual.carteiraId },
          select: { id: true, tipo: true, data: true, ativoId: true, quantidade: true, precoUnit: true, valorTotal: true },
        });
        const erro = validarVenda(existentes as LancamentoInput[], dataFinal, qtdFinal, id);
        if (erro) return NextResponse.json({ erro }, { status: 422 });
      }
    }
  }

  const atualizado = await prisma.lancamento.update({ where: { id }, data: body });

  let dividendosImportados = 0;
  if (atualizado.ativoId && (atualizado.tipo === "COMPRA" || atualizado.tipo === "REINVESTIMENTO")) {
    try {
      dividendosImportados = await sincronizarDividendosDoAtivo(atualizado.ativoId, 10);
    } catch {}
  }

  return NextResponse.json({ ...atualizado, dividendosImportados });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.lancamento.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
