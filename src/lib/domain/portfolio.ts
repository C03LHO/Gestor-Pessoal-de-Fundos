/**
 * Engine de cálculo da carteira — função PURA, sem I/O.
 *
 * Responsabilidades:
 *  - Ordena lançamentos cronologicamente (tiebreak determinístico)
 *  - Calcula preço médio ponderado por ativo
 *  - Apura lucro/prejuízo realizado em cada VENDA
 *  - Zera ciclo quando posição chega a 0 (recompra inicia base nova)
 *  - Acumula dividendos sem afetar PM
 *  - Valida vendas > posição disponível
 *  - Aritmética em centavos (delega ao money helper) — sem drift
 *
 * Nada aqui acessa banco/HTTP. A camada de dados busca os Lancamentos e
 * passa o array; quem precisar de preço atual passa em `precosAtuais`.
 */

import { toCent, toReais, multiplicar } from "../money";

export type TipoLancamento = "COMPRA" | "VENDA" | "DIVIDENDO" | "REINVESTIMENTO" | "APORTE";

export type LancamentoInput = {
  id: string;
  tipo: TipoLancamento;
  data: Date;
  ativoId: string | null;
  quantidade: number | null;
  precoUnit: number | null;
  valorTotal: number;
};

export type AtivoInfo = {
  id: string;
  ticker: string;
  nome: string | null;
  segmento: string | null;
  precoAtual: number | null;
};

export type EstadoAtivo = {
  ativoId: string;
  ticker: string;
  nome: string | null;
  segmento: string | null;

  // Posição atual (do ciclo atual; zera quando cotas → 0)
  cotas: number;
  custoTotal: number;       // soma de custo das cotas em aberto, em reais
  precoMedio: number;       // custoTotal / cotas (0 quando cotas=0)
  precoAtual: number | null;
  valorAtual: number;       // precoAtual × cotas (cai pra custoTotal se preço indisponível)
  lucroNaoRealizado: number;

  // Histórico acumulado (não zera com ciclos)
  lucroRealizado: number;   // soma de (precoVenda - PM) × qtd em cada venda
  totalInvestidoBruto: number; // soma de todas as compras (sem desconto de venda)
  totalRecebidoVenda: number;  // soma de todas as vendas
  dividendosTotal: number;
  dividendos12m: number;
  ultimoDividendo: number;
  ultimaDataDividendo: Date | null;
  yieldOnCost: number;      // dividendos12m / custoTotal (do ciclo atual)

  ciclos: number;           // quantas vezes a posição zerou
  warnings: string[];       // ex: "venda 50 cotas em 2025-03-10 excede posição de 30"
};

export type EstadoCarteira = {
  ativos: EstadoAtivo[];
  consolidado: {
    custoTotal: number;       // soma de custoTotal dos ativos com posição
    valorAtual: number;
    lucroNaoRealizado: number;
    lucroRealizado: number;
    dividendosTotal: number;
    dividendos12m: number;
    yieldOnCost: number;
  };
};

const DOZE_MESES_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Prioridade de tipo no caso de empate de data — garante que uma COMPRA
 * cadastrada no mesmo dia que uma VENDA seja processada PRIMEIRO (do
 * contrário, o usuário poderia cair em "venda > posição" só pela ordem).
 */
const PRIORIDADE_TIPO: Record<TipoLancamento, number> = {
  COMPRA: 0,
  REINVESTIMENTO: 0,
  APORTE: 1,
  DIVIDENDO: 2,
  VENDA: 3,
};

export function ordenarLancamentos<T extends LancamentoInput>(lancs: T[]): T[] {
  return [...lancs].sort((a, b) => {
    const dt = a.data.getTime() - b.data.getTime();
    if (dt !== 0) return dt;
    const tp = PRIORIDADE_TIPO[a.tipo] - PRIORIDADE_TIPO[b.tipo];
    if (tp !== 0) return tp;
    return a.id.localeCompare(b.id); // tiebreaker estável
  });
}

/**
 * Calcula estado de UM ativo a partir das suas movimentações.
 * Aceita lançamentos em qualquer ordem — ordena internamente.
 */
export function recalcularAtivo(
  ativo: AtivoInfo,
  lancsBrutos: LancamentoInput[],
  agora: Date = new Date(),
): EstadoAtivo {
  const lancs = ordenarLancamentos(lancsBrutos);
  const limite12m = new Date(agora.getTime() - DOZE_MESES_MS);

  // Em centavos para evitar drift
  let custoCent = 0;     // custo das cotas em aberto, em centavos
  let cotas = 0;         // pode ser fracionário (REINVESTIMENTO)
  let lucroRealCent = 0;
  let totalCompraCent = 0;
  let totalVendaCent = 0;
  let dividendosTotalCent = 0;
  let dividendos12mCent = 0;
  let ultimoDivCent = 0;
  let ultimaDataDiv: Date | null = null;
  let ciclos = 0;
  const warnings: string[] = [];

  for (const l of lancs) {
    const qtd = l.quantidade ?? 0;
    const valorCent = toCent(l.valorTotal);

    if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") {
      if (qtd <= 0) continue; // ignora lançamento incoerente
      cotas += qtd;
      custoCent += valorCent;
      totalCompraCent += valorCent;
      continue;
    }

    if (l.tipo === "VENDA") {
      if (qtd <= 0) continue;
      if (qtd > cotas + 1e-9) {
        warnings.push(
          `VENDA de ${qtd} cotas em ${l.data.toISOString().slice(0, 10)} excede posição disponível (${cotas}).`,
        );
        // Limita à posição existente para não cair em estado inconsistente.
        const qtdReal = Math.max(0, cotas);
        if (qtdReal === 0) continue;
        const custoBaixaCent = custoCent; // todas as cotas remanescentes
        const precoVendaPorCota = l.valorTotal / qtd; // o preço médio que o usuário cobrou
        const valorVendaProporcionalCent = toCent(precoVendaPorCota * qtdReal);
        lucroRealCent += valorVendaProporcionalCent - custoBaixaCent;
        totalVendaCent += valorVendaProporcionalCent;
        custoCent = 0;
        cotas = 0;
        ciclos += 1;
        continue;
      }

      // Custo médio ATUAL (antes da venda)
      const pmCent = cotas > 0 ? Math.round(custoCent / cotas) : 0;
      // Custo a baixar = pmCent × qtd (em centavos). multiplicar usa milicentavos.
      const custoBaixaCent = toCent(multiplicar(toReais(pmCent), qtd));
      lucroRealCent += valorCent - custoBaixaCent;
      totalVendaCent += valorCent;
      custoCent -= custoBaixaCent;
      cotas -= qtd;

      // Zerou (ou ficou em poeira numérica)? Reseta ciclo.
      if (cotas <= 1e-9) {
        cotas = 0;
        custoCent = 0;
        ciclos += 1;
      }
      continue;
    }

    if (l.tipo === "DIVIDENDO") {
      dividendosTotalCent += valorCent;
      if (l.data >= limite12m) dividendos12mCent += valorCent;
      if (!ultimaDataDiv || l.data > ultimaDataDiv) {
        ultimaDataDiv = l.data;
        ultimoDivCent = valorCent;
      }
      continue;
    }

    // APORTE: dinheiro novo na carteira, não toca preço/posição do ativo.
  }

  const custoTotal = toReais(custoCent);
  const precoMedio = cotas > 0 ? custoTotal / cotas : 0;
  const valorAtual = ativo.precoAtual != null && cotas > 0
    ? multiplicar(ativo.precoAtual, cotas)
    : custoTotal;
  const lucroNaoRealizado = ativo.precoAtual != null && cotas > 0
    ? valorAtual - custoTotal
    : 0;

  return {
    ativoId: ativo.id,
    ticker: ativo.ticker,
    nome: ativo.nome,
    segmento: ativo.segmento,
    cotas,
    custoTotal,
    precoMedio,
    precoAtual: ativo.precoAtual,
    valorAtual,
    lucroNaoRealizado,
    lucroRealizado: toReais(lucroRealCent),
    totalInvestidoBruto: toReais(totalCompraCent),
    totalRecebidoVenda: toReais(totalVendaCent),
    dividendosTotal: toReais(dividendosTotalCent),
    dividendos12m: toReais(dividendos12mCent),
    ultimoDividendo: toReais(ultimoDivCent),
    ultimaDataDividendo: ultimaDataDiv,
    yieldOnCost: custoTotal > 0 ? toReais(dividendos12mCent) / custoTotal : 0,
    ciclos,
    warnings,
  };
}

/**
 * Calcula a carteira inteira. Agrupa lançamentos por ativoId e delega a
 * `recalcularAtivo`. Lancamentos sem ativoId (ex: APORTE solto) são ignorados
 * para fins de posição — eles aparecem no relatório de aportes, não aqui.
 */
export function recalcularPortfolio(
  ativos: AtivoInfo[],
  lancamentos: LancamentoInput[],
  agora: Date = new Date(),
): EstadoCarteira {
  const porAtivo = new Map<string, LancamentoInput[]>();
  for (const l of lancamentos) {
    if (!l.ativoId) continue;
    if (!porAtivo.has(l.ativoId)) porAtivo.set(l.ativoId, []);
    porAtivo.get(l.ativoId)!.push(l);
  }

  const estados: EstadoAtivo[] = [];
  for (const ativo of ativos) {
    const movs = porAtivo.get(ativo.id) ?? [];
    if (movs.length === 0) continue;
    estados.push(recalcularAtivo(ativo, movs, agora));
  }

  // Ordena por valor atual desc (UX consistente nas listas).
  estados.sort((a, b) => b.valorAtual - a.valorAtual);

  // Consolidado considera só ativos com posição em aberto pro yield/PM,
  // mas lucro realizado e dividendos somam tudo.
  let custoCent = 0, valorCent = 0, naoRealCent = 0, realCent = 0;
  let divTotalCent = 0, div12mCent = 0;

  for (const e of estados) {
    if (e.cotas > 0) {
      custoCent += toCent(e.custoTotal);
      valorCent += toCent(e.valorAtual);
      naoRealCent += toCent(e.lucroNaoRealizado);
    }
    realCent += toCent(e.lucroRealizado);
    divTotalCent += toCent(e.dividendosTotal);
    div12mCent += toCent(e.dividendos12m);
  }

  const custoTotal = toReais(custoCent);
  return {
    ativos: estados,
    consolidado: {
      custoTotal,
      valorAtual: toReais(valorCent),
      lucroNaoRealizado: toReais(naoRealCent),
      lucroRealizado: toReais(realCent),
      dividendosTotal: toReais(divTotalCent),
      dividendos12m: toReais(div12mCent),
      yieldOnCost: custoTotal > 0 ? toReais(div12mCent) / custoTotal : 0,
    },
  };
}

export type VendaRealizada = {
  data: Date;
  quantidade: number;     // cotas efetivamente baixadas
  valorVenda: number;     // proporcional, se a venda excedeu a posição
  precoMedio: number;     // PM no momento da venda
  custoBaixado: number;   // PM × qtd
  lucro: number;          // valorVenda − custoBaixado
};

/**
 * Apura cada VENDA individualmente (preço médio no momento, lucro realizado),
 * usando a MESMA lógica em centavos da engine. Base canônica para relatórios
 * fiscais (DARF) — evita reimplementar o cálculo de PM em float.
 */
export function eventosVenda(lancsBrutos: LancamentoInput[]): VendaRealizada[] {
  const lancs = ordenarLancamentos(lancsBrutos);
  let custoCent = 0;
  let cotas = 0;
  const eventos: VendaRealizada[] = [];

  for (const l of lancs) {
    const qtd = l.quantidade ?? 0;
    if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") {
      if (qtd <= 0) continue;
      cotas += qtd;
      custoCent += toCent(l.valorTotal);
      continue;
    }
    if (l.tipo === "VENDA") {
      if (qtd <= 0 || cotas <= 0) continue;
      const qtdReal = Math.min(qtd, cotas);
      const pm = toReais(custoCent) / cotas;
      const custoBaixadoCent = toCent(multiplicar(pm, qtdReal));
      // Se a venda excede a posição, considera só a parte coberta.
      const valorVenda = qtd > 0 ? (l.valorTotal / qtd) * qtdReal : l.valorTotal;
      const lucroCent = toCent(valorVenda) - custoBaixadoCent;
      eventos.push({
        data: l.data,
        quantidade: qtdReal,
        valorVenda,
        precoMedio: pm,
        custoBaixado: toReais(custoBaixadoCent),
        lucro: toReais(lucroCent),
      });
      custoCent -= custoBaixadoCent;
      cotas -= qtdReal;
      if (cotas <= 1e-9) { cotas = 0; custoCent = 0; }
    }
  }
  return eventos;
}

/**
 * Cotas atuais (após todas as movimentações) — útil para UIs que só
 * precisam saber a quantidade em aberto sem todo o estado.
 */
export function cotasAtuais(lancs: LancamentoInput[]): number {
  let c = 0;
  for (const l of ordenarLancamentos(lancs)) {
    const q = l.quantidade ?? 0;
    if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") c += q;
    else if (l.tipo === "VENDA") c = Math.max(0, c - q);
  }
  return c;
}

/**
 * Cotas que o usuário tinha numa data específica (usado em sync de dividendos
 * para saber quanto multiplicar pelo valor/cota).
 */
export function cotasNaData(lancs: LancamentoInput[], data: Date): number {
  let c = 0;
  for (const l of ordenarLancamentos(lancs)) {
    if (l.data > data) break;
    const q = l.quantidade ?? 0;
    if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") c += q;
    else if (l.tipo === "VENDA") c = Math.max(0, c - q);
  }
  return c;
}

/**
 * Valida se uma VENDA pretendida é compatível com a posição na data informada.
 * Usado pelo POST /api/lancamentos antes de criar uma VENDA.
 *
 * Retorna `null` se OK, ou string de erro.
 */
export function validarVenda(
  lancsExistentes: LancamentoInput[],
  vendaData: Date,
  vendaQtd: number,
  ignorarId?: string,
): string | null {
  if (vendaQtd <= 0) return "Quantidade deve ser maior que zero.";
  const filtrados = ignorarId
    ? lancsExistentes.filter((l) => l.id !== ignorarId)
    : lancsExistentes;
  const disponiveis = cotasNaData(filtrados, vendaData);
  if (vendaQtd > disponiveis + 1e-9) {
    return `Venda de ${vendaQtd} cotas excede posição em ${vendaData
      .toISOString()
      .slice(0, 10)} (disponível: ${disponiveis}).`;
  }
  return null;
}
