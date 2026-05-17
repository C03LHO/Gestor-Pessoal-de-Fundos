/**
 * Tema centralizado para gráficos do sistema (recharts).
 *
 * NOTA sobre CSS vars: o app é dark-only (globals.css força `color-scheme: dark`
 * sem toggle). Em vez de CSS vars com fallback hex, mantemos um único módulo TS
 * com as constantes. Resultado equivalente, sem overhead de getComputedStyle.
 *
 * Princípios visuais:
 *   - Linhas grossas (>= 2.5px), opacas
 *   - Gradientes com topo >= 0.32 para serem visíveis sobre o fundo escuro
 *   - GridLines horizontais sutis (alpha ~0.5), verticais desligadas
 *   - Tooltip sólido, com sombra, valor em destaque
 *   - Eixos legíveis (>= 11px)
 */

// ----------------- Paleta base -----------------

export const CHART_COLORS = {
  // Texto / chrome
  text:       "#e4e4e7", // zinc-200 — corpo de tooltip
  textMuted:  "#a1a1aa", // zinc-400 — labels de eixo / legenda
  textFaint:  "#71717a", // zinc-500 — hints

  // Superfícies
  bg:         "#09090b", // zinc-950
  surface:    "#18181b", // zinc-900 — tooltip
  surfaceAlt: "#27272a", // zinc-800 — borders
  divider:    "#3f3f46", // zinc-700 — gridlines

  // Dados primários
  primary:    "#10b981", // emerald-500
  primaryAlt: "#34d399", // emerald-400 — destaque (mês atual etc.)
  secondary:  "#a78bfa", // violet-400 — linha acumulada
  warn:       "#f59e0b", // amber-500
  danger:     "#f43f5e", // rose-500
  neutral:    "#71717a", // zinc-500 — série secundária/investido

  // Paleta categórica (pie / multi-séries)
  categorical: [
    "#10b981", "#06b6d4", "#a78bfa", "#f59e0b",
    "#f43f5e", "#3b82f6", "#ec4899", "#84cc16",
  ] as const,
} as const;

// ----------------- Estilo de eixos -----------------

export const AXIS_STYLE = {
  stroke: CHART_COLORS.textFaint,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const AXIS_LABEL_TICK = { fill: CHART_COLORS.textMuted } as const;

// ----------------- GridLines -----------------

export const GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: CHART_COLORS.divider,
  strokeOpacity: 0.45,
  vertical: false,
} as const;

// ----------------- Tooltip -----------------

export const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  background: CHART_COLORS.surface,
  border: `1px solid ${CHART_COLORS.surfaceAlt}`,
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 12,
  color: CHART_COLORS.text,
  boxShadow: "0 8px 24px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.25)",
};

export const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: CHART_COLORS.textMuted,
  fontSize: 11,
  marginBottom: 4,
  fontWeight: 500,
};

export const TOOLTIP_ITEM_STYLE: React.CSSProperties = {
  color: CHART_COLORS.text,
  fontSize: 13,
  fontWeight: 600,
};

export const TOOLTIP_CURSOR = {
  stroke: CHART_COLORS.divider,
  strokeWidth: 1,
  strokeDasharray: "3 3",
  strokeOpacity: 0.6,
};

// ----------------- Linhas / áreas -----------------

export const LINE_PROPS = {
  strokeWidth: 2.5,
  isAnimationActive: true,
  animationDuration: 400,
} as const;

export const ACTIVE_DOT_PROPS = {
  r: 5,
  strokeWidth: 2,
  stroke: CHART_COLORS.bg,
} as const;

export const REF_DOT_HIGHLIGHT = {
  r: 6,
  stroke: "#fff",
  strokeWidth: 2,
} as const;

// ----------------- Gradiente helper -----------------

/**
 * Stops padrão para área preenchida. Use em <linearGradient>:
 *   {gradientStops(color).map(s => <stop {...s} />)}
 *
 * Topo ~33%, meio ~10%, base 0%. Resultado consistente em fundo zinc-950.
 */
export function gradientStops(hexColor: string) {
  return [
    { offset: "0%",  stopColor: hexColor, stopOpacity: 0.32 },
    { offset: "60%", stopColor: hexColor, stopOpacity: 0.08 },
    { offset: "100%", stopColor: hexColor, stopOpacity: 0 },
  ];
}

// ----------------- Legend -----------------

export const LEGEND_WRAPPER_STYLE: React.CSSProperties = {
  fontSize: 12,
  color: CHART_COLORS.textMuted,
  paddingTop: 8,
};
