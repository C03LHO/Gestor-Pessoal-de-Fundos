import type { Posicao } from "./posicao";

/**
 * Dada uma alocação alvo por segmento e a posição atual, sugere quanto
 * aportar em cada segmento para chegar mais perto da meta.
 *
 * Não vende. Só recomenda direcionar novos aportes.
 */
export type Sugestao = {
  segmento: string;
  pesoAtual: number;
  pesoAlvo: number;
  diferenca: number;
  aporteSugerido: number;
};

export const ALOCACAO_ALVO_DEFAULT: Record<string, number> = {
  "Logística": 0.30,
  "Papel":     0.25,
  "Shoppings": 0.15,
  "Híbrido":   0.15,
  "Outros":    0.15,
};

export function sugerirRebalanceamento(
  posicoes: Posicao[],
  aporteMensal: number,
  alvo: Record<string, number> = ALOCACAO_ALVO_DEFAULT,
): Sugestao[] {
  if (aporteMensal <= 0) return [];
  const patrimonio = posicoes.reduce((s, p) => s + p.valorAtual, 0);
  if (patrimonio <= 0) return [];

  const porSegmento = new Map<string, number>();
  for (const p of posicoes) {
    const seg = p.segmento ?? "Outros";
    porSegmento.set(seg, (porSegmento.get(seg) ?? 0) + p.valorAtual);
  }

  const sugestoes: Sugestao[] = [];
  for (const seg of Object.keys(alvo)) {
    const atual = porSegmento.get(seg) ?? 0;
    const pesoAtual = atual / patrimonio;
    const pesoAlvo = alvo[seg];
    const diferenca = pesoAlvo - pesoAtual;
    sugestoes.push({
      segmento: seg,
      pesoAtual,
      pesoAlvo,
      diferenca,
      aporteSugerido: Math.max(0, diferenca * aporteMensal * 2),
    });
  }
  // normaliza para somar aporteMensal
  const totalSugerido = sugestoes.reduce((s, x) => s + x.aporteSugerido, 0);
  if (totalSugerido > 0) {
    for (const s of sugestoes) {
      s.aporteSugerido = (s.aporteSugerido / totalSugerido) * aporteMensal;
    }
  }
  return sugestoes.sort((a, b) => b.aporteSugerido - a.aporteSugerido);
}
