import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sincronizarDividendosDoAtivo } from "@/lib/domain/sync-dividendos";
import { getCarteiraAtivaId } from "@/lib/carteira";
import { validarVenda, type LancamentoInput } from "@/lib/domain/portfolio";
import { parseBody } from "@/lib/api";
import { log } from "@/lib/log";

const schema = z.object({
  tipo: z.enum(["COMPRA", "VENDA", "APORTE", "DIVIDENDO", "REINVESTIMENTO", "AMORTIZACAO", "RETIRADA"]),
  data: z.coerce.date(),
  ativoId: z.string().nullable().optional(),
  quantidade: z.number().nonnegative().nullable().optional(),
  precoUnit: z.number().nonnegative().nullable().optional(),
  valorTotal: z.number().nonnegative(),
  observacao: z.string().max(500).nullable().optional(),
});

const SYNC_TIMEOUT_MS = 6000;
function comTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function GET(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get("tipo");
  const ativoId = req.nextUrl.searchParams.get("ativoId");
  // Isola por carteira ativa — sem isso o endpoint vazaria lançamentos de
  // todas as carteiras, quebrando o isolamento prometido na UI.
  const carteiraId = await getCarteiraAtivaId();
  const data = await prisma.lancamento.findMany({
    where: { carteiraId, tipo: tipo ?? undefined, ativoId: ativoId ?? undefined },
    include: { ativo: true },
    orderBy: { data: "desc" },
    take: 500,
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const carteiraId = await getCarteiraAtivaId();

  // Valida VENDA contra posição na data (impede cotas negativas silenciosas)
  if (body.tipo === "VENDA" && body.ativoId && body.quantidade) {
    const existentes = await prisma.lancamento.findMany({
      where: { ativoId: body.ativoId, carteiraId },
      select: { id: true, tipo: true, data: true, ativoId: true, quantidade: true, precoUnit: true, valorTotal: true },
    });
    const erro = validarVenda(existentes as LancamentoInput[], body.data, body.quantidade);
    if (erro) {
      return NextResponse.json({ erro }, { status: 422 });
    }
  }

  const novo = await prisma.lancamento.create({ data: { ...body, carteiraId } });

  // Em compra/reinvestimento: AGUARDA o import de dividendos (síncrono)
  // para que o usuário veja imediatamente todos os proventos retroativos
  // dos meses em que ele tinha cotas.
  let dividendosImportados = 0;
  let sincErro: string | null = null;
  let sincTimeout = false;
  if (body.ativoId && (body.tipo === "COMPRA" || body.tipo === "REINVESTIMENTO")) {
    const ativoId = body.ativoId;
    try {
      // Hard timeout: se o sync demorar mais que SYNC_TIMEOUT_MS, retorna 201 com sincTimeout=true.
      // O sync continua rodando em background (fire-and-forget) e o resultado vai aparecer
      // na próxima vez que o usuário recarregar a tela.
      const promise = sincronizarDividendosDoAtivo(ativoId, 10);
      dividendosImportados = await comTimeout(promise, SYNC_TIMEOUT_MS, -1);
      if (dividendosImportados === -1) {
        sincTimeout = true;
        dividendosImportados = 0;
        promise.catch((e) => log.warn("sync-divs.background_fail", { erro: e?.message }));
      }
      log.info("lancamento.dividendos_importados", { ativoId, count: dividendosImportados, sincTimeout });
    } catch (e: any) {
      sincErro = e?.message ?? "falha desconhecida";
      log.error("lancamento.sync_divs_falhou", { ativoId, erro: sincErro });
    }
  }

  return NextResponse.json({ ...novo, dividendosImportados, sincErro, sincTimeout }, { status: 201 });
}
