import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cfg = await prisma.configuracao.findFirst();
  if (!cfg) await prisma.configuracao.create({ data: {} });

  const meta = await prisma.meta.findFirst({ where: { ativa: true } });
  if (!meta) {
    await prisma.meta.create({
      data: { rendaMensalAlvo: 10000, aporteMensal: 3000, ativa: true },
    });
  }

  const exemplos = [
    { ticker: "HGLG11", nome: "CSHG Logística",       segmento: "Logística", precoAtual: 165 },
    { ticker: "MXRF11", nome: "Maxi Renda",            segmento: "Papel",     precoAtual: 10.5 },
    { ticker: "KNRI11", nome: "Kinea Renda Imob.",    segmento: "Híbrido",   precoAtual: 145 },
    { ticker: "XPML11", nome: "XP Malls",              segmento: "Shoppings", precoAtual: 105 },
  ];

  for (const a of exemplos) {
    await prisma.ativo.upsert({
      where: { ticker: a.ticker },
      update: { precoAtual: a.precoAtual, atualizadoEm: new Date() },
      create: { ...a, atualizadoEm: new Date() },
    });
  }

  const hglg = await prisma.ativo.findUnique({ where: { ticker: "HGLG11" } });
  const mxrf = await prisma.ativo.findUnique({ where: { ticker: "MXRF11" } });

  const jaTemLanc = await prisma.lancamento.count();
  if (jaTemLanc === 0 && hglg && mxrf) {
    await prisma.lancamento.createMany({
      data: [
        { tipo: "COMPRA",    ativoId: hglg.id, data: new Date("2025-01-10"), quantidade: 50,  precoUnit: 160,  valorTotal: 8000 },
        { tipo: "COMPRA",    ativoId: mxrf.id, data: new Date("2025-01-12"), quantidade: 500, precoUnit: 10.2, valorTotal: 5100 },
        { tipo: "DIVIDENDO", ativoId: hglg.id, data: new Date("2025-02-15"), valorTotal: 55 },
        { tipo: "DIVIDENDO", ativoId: mxrf.id, data: new Date("2025-02-15"), valorTotal: 50 },
        { tipo: "DIVIDENDO", ativoId: hglg.id, data: new Date("2025-03-15"), valorTotal: 58 },
        { tipo: "DIVIDENDO", ativoId: mxrf.id, data: new Date("2025-03-15"), valorTotal: 52 },
        { tipo: "DIVIDENDO", ativoId: hglg.id, data: new Date("2025-04-15"), valorTotal: 60 },
        { tipo: "DIVIDENDO", ativoId: mxrf.id, data: new Date("2025-04-15"), valorTotal: 53 },
      ],
    });
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
