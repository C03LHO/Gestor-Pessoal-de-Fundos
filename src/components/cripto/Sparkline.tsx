"use client";

export function Sparkline({
  pontos,
  cor = "#10b981",
  largura = 120,
  altura = 36,
}: {
  pontos: { t: number; p: number }[];
  cor?: string;
  largura?: number;
  altura?: number;
}) {
  if (!pontos || pontos.length < 2) {
    return <div style={{ width: largura, height: altura }} className="opacity-30" />;
  }
  const ps = pontos.map((x) => x.p);
  const min = Math.min(...ps);
  const max = Math.max(...ps);
  const range = max - min || 1;
  const passo = largura / (ps.length - 1);
  const d = ps
    .map((p, i) => {
      const x = i * passo;
      const y = altura - ((p - min) / range) * altura;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const subiu = ps[ps.length - 1] >= ps[0];
  const corFinal = cor === "auto" ? (subiu ? "#10b981" : "#f43f5e") : cor;
  return (
    <svg width={largura} height={altura} className="overflow-visible">
      <path d={d} fill="none" stroke={corFinal} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
