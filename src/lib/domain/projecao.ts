export function mesesAteMeta(opts: {
  patrimonio: number;
  aporteMensal: number;
  yieldAnual: number;
  metaMensal: number;
  reinvestir?: boolean;
  maxMeses?: number;
}): number {
  const { patrimonio, aporteMensal, yieldAnual, metaMensal } = opts;
  const reinvestir = opts.reinvestir ?? true;
  const max = opts.maxMeses ?? 1200;

  const y = Math.pow(1 + yieldAnual, 1 / 12) - 1;
  let p = patrimonio;
  for (let m = 0; m <= max; m++) {
    if (p * y >= metaMensal) return m;
    p = reinvestir ? p * (1 + y) + aporteMensal : p + aporteMensal;
  }
  return Infinity;
}

export function rendaProjetada(patrimonio: number, yieldAnual: number) {
  const y = Math.pow(1 + yieldAnual, 1 / 12) - 1;
  return patrimonio * y;
}
