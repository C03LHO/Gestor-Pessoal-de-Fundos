/**
 * Apuração fiscal de cripto (regra Brasil) — função PURA, em centavos.
 *
 * Regra (pessoa física):
 *  - Soma das ALIENAÇÕES (vendas) de cripto no mês.
 *  - Se o total de vendas no mês < R$ 35.000 → ganho ISENTO de IR.
 *  - Acima do limite → 15% sobre o LUCRO do mês (faixa até R$ 5 mi; acima há
 *    alíquotas progressivas, ignoradas aqui por irrelevância no uso pessoal).
 *  - DARF código 4600, vencimento no último dia útil do mês seguinte.
 *
 * O limite de isenção considera o total de alienações de cripto no mês (todas
 * as moedas somadas). O lucro de cada venda usa o preço médio em centavos,
 * espelhando a engine de carteira (sem drift de float).
 */
import { toCent, toReais, multiplicar } from "@/lib/money";
import { CRYPTO_BY_ID } from "./constants";
import type { CryptoTxInput } from "./carteira";

export const LIMITE_ISENCAO_CRIPTO = 35000;
export const ALIQUOTA_CRIPTO = 0.15;

export type OperacaoCriptoMes = {
  data: string;
  cryptoId: string;
  symbol: string;
  qtd: number;
  valorVenda: number;
  pm: number;
  lucro: number;
};

export type ApuracaoCripto = {
  ano: number;
  mes: number;
  operacoes: OperacaoCriptoMes[];
  totalVendasMes: number;
  lucroTotalMes: number;
  isento: boolean;
  limiteIsencao: number;
  aliquota: number;
  darf: number;
  obs: string;
};

export function apurarCriptoMes(
  transacoes: CryptoTxInput[],
  ano: number,
  mes: number, // 1-12
): ApuracaoCripto {
  const ordenadas = [...transacoes].sort((a, b) => {
    const dt = a.data.getTime() - b.data.getTime();
    if (dt !== 0) return dt;
    return (a.id ?? "").localeCompare(b.id ?? "");
  });

  const acc: Record<string, { qtd: number; custoCent: number }> = {};
  const operacoes: OperacaoCriptoMes[] = [];
  let totalVendasCent = 0;
  let lucroTotalCent = 0;

  for (const l of ordenadas) {
    if (!acc[l.cryptoId]) acc[l.cryptoId] = { qtd: 0, custoCent: 0 };
    const a = acc[l.cryptoId];

    if (l.tipo === "COMPRA") {
      a.custoCent += toCent(l.valorTotal);
      a.qtd += l.quantidade;
    } else if (l.tipo === "MINERACAO" || l.tipo === "TRANSFERENCIA") {
      // Custo de aquisição zero — toda a alienação futura é lucro.
      a.qtd += l.quantidade;
    } else if (l.tipo === "VENDA") {
      const pm = a.qtd > 0 ? toReais(a.custoCent) / a.qtd : 0;
      const qtdVendida = Math.min(l.quantidade, a.qtd);
      const custoBaixadoCent = toCent(multiplicar(pm, qtdVendida));
      const lucroCent = toCent(l.valorTotal) - custoBaixadoCent;
      a.qtd -= qtdVendida;
      a.custoCent -= custoBaixadoCent;
      if (a.qtd < 1e-12) {
        a.qtd = 0;
        a.custoCent = 0;
      }

      if (l.data.getFullYear() === ano && l.data.getMonth() === mes - 1) {
        totalVendasCent += toCent(l.valorTotal);
        lucroTotalCent += lucroCent;
        const meta = CRYPTO_BY_ID[l.cryptoId];
        operacoes.push({
          data: l.data.toLocaleDateString("pt-BR"),
          cryptoId: l.cryptoId,
          symbol: meta?.symbol ?? l.cryptoId,
          qtd: qtdVendida,
          valorVenda: l.valorTotal,
          pm,
          lucro: toReais(lucroCent),
        });
      }
    }
  }

  const totalVendasMes = toReais(totalVendasCent);
  const lucroTotalMes = toReais(lucroTotalCent);
  const isento = totalVendasMes < LIMITE_ISENCAO_CRIPTO;
  const darf =
    !isento && lucroTotalMes > 0
      ? Math.round(lucroTotalMes * ALIQUOTA_CRIPTO * 100) / 100
      : 0;

  const limiteFmt = LIMITE_ISENCAO_CRIPTO.toLocaleString("pt-BR");
  const obs =
    operacoes.length === 0
      ? "Sem vendas de cripto no período."
      : isento
        ? `Vendas de R$ ${totalVendasMes.toFixed(2)} no mês — abaixo do limite de isenção (R$ ${limiteFmt}). Ganho isento de IR.`
        : `Vendas de R$ ${totalVendasMes.toFixed(2)} acima do limite de R$ ${limiteFmt}. IR de 15% sobre o lucro. DARF código 4600, vencimento no último dia útil do mês seguinte.`;

  return {
    ano,
    mes,
    operacoes,
    totalVendasMes,
    lucroTotalMes,
    isento,
    limiteIsencao: LIMITE_ISENCAO_CRIPTO,
    aliquota: ALIQUOTA_CRIPTO,
    darf,
    obs,
  };
}
