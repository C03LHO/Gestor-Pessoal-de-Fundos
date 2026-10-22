"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Wallet, ListPlus, TrendingDown, MoreHorizontal,
  Target, Calculator, FileText, Settings, X, CalendarDays, LineChart, Coins, Layers,
} from "lucide-react";
import { cn } from "@/lib/cn";

const principaisFii = [
  { href: "/",              label: "Início",      icon: LayoutDashboard },
  { href: "/oportunidades", label: "Oport.",      icon: TrendingDown },
  { href: "/lancamentos",   label: "Lançamentos", icon: ListPlus },
  { href: "/carteira",      label: "Carteira",    icon: Wallet },
];

const secundariosFii = [
  { href: "/graficos",      label: "Gráficos",      icon: LineChart },
  { href: "/calendario",    label: "Calendário",    icon: CalendarDays },
  { href: "/metas",         label: "Metas",         icon: Target },
  { href: "/simulador",     label: "Simulador",     icon: Calculator },
  { href: "/relatorios",    label: "Relatórios",    icon: FileText },
  { href: "/consolidado",   label: "Consolidado",   icon: Layers },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const principaisCripto = [
  { href: "/cripto",               label: "Início",      icon: LayoutDashboard },
  { href: "/cripto/oportunidades", label: "Oport.",      icon: TrendingDown },
  { href: "/cripto/lancamentos",   label: "Lançamentos", icon: ListPlus },
  { href: "/cripto/carteira",      label: "Carteira",    icon: Coins },
];

const secundariosCripto = [
  { href: "/cripto/graficos",      label: "Gráficos",      icon: LineChart },
  { href: "/cripto/relatorios",    label: "Relatórios",    icon: FileText },
  { href: "/consolidado",          label: "Consolidado",   icon: Layers },
  { href: "/configuracoes",        label: "Configurações", icon: Settings },
];

export function BottomNav({ tipo = "FII" }: { tipo?: "FII" | "CRIPTO" }) {
  const p = usePathname();
  const [aberto, setAberto] = useState(false);
  const principais = tipo === "CRIPTO" ? principaisCripto : principaisFii;
  const secundarios = tipo === "CRIPTO" ? secundariosCripto : secundariosFii;

  return (
    <>
      <nav className="md:hidden fixed inset-x-3 z-30 rounded-2xl border border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl shadow-2xl shadow-black/60 print:hidden"
           style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="grid grid-cols-5 px-1">
          {principais.map(({ href, label, icon: Icon }) => {
            const ativo =
              href === "/" ? p === "/" :
              href === "/cripto" ? p === "/cripto" :
              p.startsWith(href);
            return (
              <Link key={href} href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition",
                  ativo ? "text-emerald-300" : "text-zinc-500 active:text-zinc-300",
                )}>
                <span className={cn("grid place-items-center w-10 h-7 rounded-full transition", ativo && "bg-emerald-500/15")}>
                  <Icon size={18} />
                </span>
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => setAberto(true)}
            aria-label="Mais páginas"
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition",
              secundarios.some((s) => p.startsWith(s.href)) ? "text-emerald-300" : "text-zinc-500",
            )}
          >
            <span className={cn("grid place-items-center w-10 h-7 rounded-full transition",
              secundarios.some((s) => p.startsWith(s.href)) && "bg-emerald-500/15")}>
              <MoreHorizontal size={18} />
            </span>
            Mais
          </button>
        </div>
      </nav>

      {aberto && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm chart-modal-backdrop" onClick={() => setAberto(false)}>
          <div
            className="absolute bottom-0 inset-x-0 bg-zinc-950/95 backdrop-blur-xl border-t border-white/[0.08] rounded-t-3xl chart-modal-panel"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-700" />
            <div className="flex justify-between items-center px-4 py-3">
              <h2 className="font-semibold">Mais</h2>
              <button onClick={() => setAberto(false)} className="text-zinc-500 p-1"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4">
              {secundarios.map(({ href, label, icon: Icon }) => {
                const ativo = p.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setAberto(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 py-4 rounded-2xl border transition active:scale-95",
                      ativo
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/[0.06] bg-white/[0.02] text-zinc-300",
                    )}
                  >
                    <Icon size={20} />
                    <span className="text-xs text-center">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
