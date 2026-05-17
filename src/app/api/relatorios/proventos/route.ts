import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { somarLista } from "@/lib/money";

/**
 * Relatório anual de proventos recebidos. Retorna CSV pronto para
 * importar no programa do IR.
 *
 * Query: ?ano=2026 (default: ano atual)
 */
export async function GET(req: NextRequest) {
  const ano = Number(req.nextUrl.searchParams.get("ano") ?? new Date().getFullYear());
  const ini = new Date(ano, 0, 1);
  const fim = new Date(ano + 1, 0, 1);

  const divs = await prisma.lancamento.findMany({
    where: { tipo: "DIVIDENDO", data: { gte: ini, lt: fim } },
    include: { ativo: true },
    orderBy: { data: "asc" },
  });

  const linhas = [
    ["Data", "Ticker", "Nome", "Segmento", "Valor (R$)"].join(";"),
    ...divs.map((d) =>
      [
        d.data.toLocaleDateString("pt-BR"),
        d.ativo?.ticker ?? "",
        d.ativo?.nome ?? "",
        d.ativo?.segmento ?? "",
        d.valorTotal.toFixed(2).replace(".", ","),
      ].join(";"),
    ),
  ];
  const total = somarLista(divs, (d) => d.valorTotal);
  linhas.push(["", "", "", "TOTAL", total.toFixed(2).replace(".", ",")].join(";"));

  return new NextResponse(linhas.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=proventos-${ano}.csv`,
    },
  });
}
