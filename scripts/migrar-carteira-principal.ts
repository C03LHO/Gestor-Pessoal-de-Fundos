import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  let principal = await prisma.carteira.findFirst({ where: { nome: "Principal" } });
  if (!principal) {
    principal = await prisma.carteira.create({ data: { nome: "Principal", cor: "#10b981" } });
    console.log("Criada carteira Principal:", principal.id);
  } else {
    console.log("Carteira Principal já existe:", principal.id);
  }

  const semCarteira = await prisma.lancamento.updateMany({
    where: { carteiraId: null },
    data: { carteiraId: principal.id },
  });
  console.log(`Lançamentos migrados para Principal: ${semCarteira.count}`);

  await prisma.configuracao.updateMany({
    where: { carteiraAtivaId: null },
    data: { carteiraAtivaId: principal.id },
  });
  console.log("Configuracao.carteiraAtivaId definido.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
