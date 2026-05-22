export type CryptoAsset = {
  id: string;             // chave canônica (mesma do CoinGecko)
  symbol: string;
  name: string;
  decimals: number;       // casas decimais para exibir quantidade
  coingeckoId: string;
  color: string;
  description: string;
};

export const CRYPTO_ASSETS: CryptoAsset[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    decimals: 8,
    coingeckoId: "bitcoin",
    color: "#F7931A",
    description: "Reserva de valor digital",
  },
  {
    id: "kaspa",
    symbol: "KAS",
    name: "Kaspa",
    decimals: 2,
    coingeckoId: "kaspa",
    color: "#70C7BA",
    description: "Proof-of-work de alta velocidade",
  },
  {
    id: "grin",
    symbol: "GRIN",
    name: "Grin",
    decimals: 2,
    coingeckoId: "grin",
    color: "#FFDD55",
    description: "Privacidade MimbleWimble",
  },
  {
    id: "ethereum-classic",
    symbol: "ETC",
    name: "Ethereum Classic",
    decimals: 4,
    coingeckoId: "ethereum-classic",
    color: "#328787",
    description: "Smart contracts originais",
  },
];

export const CRYPTO_BY_ID: Record<string, CryptoAsset> = Object.fromEntries(
  CRYPTO_ASSETS.map((a) => [a.id, a]),
);

export function isCryptoId(id: string): boolean {
  return !!CRYPTO_BY_ID[id];
}

export type TipoTransacao = "COMPRA" | "VENDA" | "MINERACAO" | "TRANSFERENCIA";

export const TIPO_LANCAMENTO_META: Record<TipoTransacao, { label: string; cor: string; descricao: string }> = {
  COMPRA:        { label: "Compra",                       cor: "emerald", descricao: "Entrada paga em moeda" },
  VENDA:         { label: "Venda",                        cor: "rose",    descricao: "Saída convertida em moeda" },
  MINERACAO:     { label: "Mineração / Recebimento gratuito", cor: "amber",  descricao: "Entrada sem custo de aquisição" },
  TRANSFERENCIA: { label: "Transferência recebida",       cor: "sky",     descricao: "Entrada sem custo de aquisição" },
};

/** Entrada (aumenta saldo) sem custo de aquisição. */
export function isEntradaGratuita(tipo: string): boolean {
  return tipo === "MINERACAO" || tipo === "TRANSFERENCIA";
}

export function formatQtd(qtd: number, cryptoId: string): string {
  const a = CRYPTO_BY_ID[cryptoId];
  const casas = a?.decimals ?? 8;
  return (qtd ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  });
}
