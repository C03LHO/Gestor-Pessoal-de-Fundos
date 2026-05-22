"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export type Moeda = "BRL" | "USD";

type Ctx = {
  moeda: Moeda;
  setMoeda: (m: Moeda) => void;
  formatar: (brl: number, usd?: number | null) => string;
  formatarCompacto: (brl: number, usd?: number | null) => string;
  rate: number; // BRL por USD (calculado quando necessário)
};

const MoedaCtx = createContext<Ctx | null>(null);

export function formatBrl(v: number): string {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatUsd(v: number): string {
  return (v ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Compacto: usa K/M para valores grandes (>= 100k)
export function formatBrlCompacto(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (abs >= 100_000)   return `R$ ${(v / 1_000).toFixed(0)}k`;
  return formatBrl(v);
}
export function formatUsdCompacto(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 100_000)   return `$${(v / 1_000).toFixed(0)}k`;
  return formatUsd(v);
}

export function MoedaProvider({ children, rateInicial = 5 }: { children: ReactNode; rateInicial?: number }) {
  const [moeda, setMoeda] = useState<Moeda>("BRL");
  // rate é apenas fallback quando USD não é fornecido (1 USD = X BRL)
  const rate = rateInicial;

  function formatar(brl: number, usd?: number | null): string {
    if (moeda === "USD") {
      const valorUsd = usd != null ? usd : brl / rate;
      return formatUsd(valorUsd);
    }
    return formatBrl(brl);
  }
  function formatarCompacto(brl: number, usd?: number | null): string {
    if (moeda === "USD") {
      const valorUsd = usd != null ? usd : brl / rate;
      return formatUsdCompacto(valorUsd);
    }
    return formatBrlCompacto(brl);
  }

  return (
    <MoedaCtx.Provider value={{ moeda, setMoeda, formatar, formatarCompacto, rate }}>
      {children}
    </MoedaCtx.Provider>
  );
}

export function useMoeda(): Ctx {
  const c = useContext(MoedaCtx);
  if (!c) throw new Error("useMoeda fora de MoedaProvider");
  return c;
}
