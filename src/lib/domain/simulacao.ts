export function simularEvolucao(opts: {
  patrimonioInicial: number;
  aporteMensal: number;
  yieldAnual: number;
  reinvestir: boolean;
  meses: number;
}) {
  const { patrimonioInicial, aporteMensal, yieldAnual, reinvestir, meses } = opts;
  const y = Math.pow(1 + yieldAnual, 1 / 12) - 1;
  const serie: { mes: number; patrimonio: number; renda: number }[] = [];
  let p = patrimonioInicial;
  for (let m = 0; m <= meses; m++) {
    serie.push({ mes: m, patrimonio: p, renda: p * y });
    p = reinvestir ? p * (1 + y) + aporteMensal : p + aporteMensal;
  }
  return serie;
}

export function cenariosPadrao(opts: {
  patrimonio: number;
  aporteMensal: number;
  meses: number;
  reinvestir: boolean;
  conservador: number;
  moderado: number;
  otimista: number;
}) {
  const base = {
    patrimonioInicial: opts.patrimonio,
    aporteMensal: opts.aporteMensal,
    reinvestir: opts.reinvestir,
    meses: opts.meses,
  };
  return {
    conservador: simularEvolucao({ ...base, yieldAnual: opts.conservador }),
    moderado:    simularEvolucao({ ...base, yieldAnual: opts.moderado }),
    otimista:    simularEvolucao({ ...base, yieldAnual: opts.otimista }),
  };
}
