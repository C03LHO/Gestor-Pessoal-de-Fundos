import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api";

const patchSchema = z.object({
  nome: z.string().nullable().optional(),
  segmento: z.string().nullable().optional(),
  precoAtual: z.number().nullable().optional(),
  notas: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const a = await prisma.ativo.update({
    where: { id },
    data: {
      ...body,
      atualizadoEm: body.precoAtual !== undefined ? new Date() : undefined,
    },
  });
  return NextResponse.json(a);
}

/**
 * Exclui o ativo, desde que nao tenha movimento.
 *
 * Lancamento.ativoId e onDelete: SetNull: apagar um ativo com historico nao
 * apaga os lancamentos, deixa-os sem ativo. A engine ignora lancamento sem
 * ativoId, entao todo o historico de COMPRA/VENDA/DIVIDENDO daquele ativo
 * simplesmente deixa de existir para o app -- inclusive para o relatorio de IR.
 */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lancamentos = await prisma.lancamento.count({ where: { ativoId: id } });
  if (lancamentos > 0) {
    return new NextResponse(
      `Este ativo tem ${lancamentos} lançamento(s) no histórico. Exclua os lançamentos antes ` +
      `de excluir o ativo — caso contrário eles ficariam órfãos e sairiam dos cálculos e do IR.`,
      { status: 409 },
    );
  }

  await prisma.ativo.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
