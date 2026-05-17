import { mesesAteMeta } from "./projecao";

/**
 * Avalia se o usuário está adiantado, no ritmo ou atrasado em relação
 * a uma trajetória ideal de N anos para a meta.
 */
export type Aderencia = {
  status: "adiantado" | "no ritmo" | "atrasado";
  diferencaMeses: number; // positivo = adiantado, negativo = atrasado
  prazoIdealMeses: number;
  prazoEstimadoMeses: number;
};

export function calcularAderencia(opts: {
  patrimonio: number;
  aporteMensalReal: number;
  yieldAnual: number;
  metaMensal: number;
  prazoIdealAnos?: number;
}): Aderencia {
  const ideal = opts.prazoIdealAnos ?? 10;
  const prazoIdealMeses = ideal * 12;

  const prazoEstimadoMeses = mesesAteMeta({
    patrimonio: opts.patrimonio,
    aporteMensal: opts.aporteMensalReal,
    yieldAnual: opts.yieldAnual,
    metaMensal: opts.metaMensal,
    reinvestir: true,
  });

  const diff = prazoIdealMeses - prazoEstimadoMeses; // positivo = bate antes
  const margem = prazoIdealMeses * 0.1;
  const status: Aderencia["status"] =
    diff > margem ? "adiantado" : diff < -margem ? "atrasado" : "no ritmo";

  return { status, diferencaMeses: diff, prazoIdealMeses, prazoEstimadoMeses };
}
