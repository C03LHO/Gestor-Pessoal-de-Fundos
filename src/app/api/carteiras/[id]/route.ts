import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api";

const patch = z.object({
  nome: z.string().min(1).max(40).optional(),
  cor: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseBody(req, patch);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  try {
    const c = await prisma.carteira.update({ where: { id }, data: body });
    return NextResponse.json(c);
  } catch (e: any) {
    if (e?.code === "P2002") return new NextResponse("Já existe carteira com esse nome", { status: 409 });
    throw e;
  }
}

/**
 * Exclui a carteira, desde que esteja vazia.
 *
 * Lancamento.carteiraId e onDelete: SetNull, entao apagar uma carteira com
 * movimento nao apaga os lancamentos: deixa-os com carteiraId null. Eles somem
 * de todas as telas (que filtram por carteira) e param de entrar nos totais,
 * mas continuam no banco -- perda de dado do ponto de vista de quem usa, e
 * dificil de reverter porque a origem se perde. Por isso a exclusao e barrada
 * enquanto houver movimento, em vez de silenciosamente orfanar.
 */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const restante = await prisma.carteira.count({ where: { id: { not: id } } });
  if (restante === 0) return new NextResponse("Não pode excluir a única carteira", { status: 400 });

  const [lancamentos, cripto] = await Promise.all([
    prisma.lancamento.count({ where: { carteiraId: id } }),
    prisma.cryptoTransaction.count({ where: { carteiraId: id } }),
  ]);

  if (lancamentos > 0 || cripto > 0) {
    const partes = [
      lancamentos > 0 ? `${lancamentos} lançamento(s)` : null,
      cripto > 0 ? `${cripto} transação(ões) de cripto` : null,
    ].filter(Boolean).join(" e ");
    return new NextResponse(
      `Esta carteira tem ${partes}. Exclua ou mova esse movimento antes de excluir a carteira — ` +
      `caso contrário o histórico ficaria órfão e sumiria das telas.`,
      { status: 409 },
    );
  }

  await prisma.carteira.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
