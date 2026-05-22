"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Wallet, ListPlus, TrendingDown, MoreHorizontal,
  Target, Calculator, FileText, BarChart3, Settings, X, CalendarDays, LineChart, Coins,
} from "lucide-react";
import { cn } from "@/lib/cn";

const principaisFii = [
  { href: "/",              label: "Início",    icon: LayoutDashboard },
  { href: "/oportunidades", label: "Oport.",    icon: TrendingDown },
  { href: "/graficos",      label: "Gráficos",  icon: LineChart },
  { href: "/carteira",      label: "Carteira",  icon: Wallet },
];

const secundariosFii = [
  { href: "/lancamentos",   label: "Lançamentos",   icon: ListPlus },
  { href: "/resumo",        label: "Resumo",        icon: BarChart3 },
  { href: "/calendario",    label: "Calendário",    icon: CalendarDays },
  { href: "/metas",         label: "Metas",         icon: Target },
  { href: "/simulador",     label: "Simulador",     icon: Calculator },
  { href: "/relatorios",    label: "Relatórios",    icon: FileText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const principaisCripto = [
  { href: "/cripto",               label: "Início",    icon: LayoutDashboard },
  { href: "/cripto/oportunidades", label: "Oport.",    icon: TrendingDown },
  { href: "/cripto/graficos",      label: "Gráficos",  icon: LineChart },
  { href: "/cripto/carteira",      label: "Carteira",  icon: Coins },
];

const secundariosCripto = [
  { href: "/cripto/lancamentos",   label: "Lançamentos",   icon: ListPlus },
  { href: "/configuracoes",        label: "Configurações", icon: Settings },
];

export function BottomNav({ tipo = "FII" }: { tipo?: "FII" | "CRIPTO" }) {
  const p = usePathname();
  const [aberto, setAberto] = useState(false);
  const principais = tipo === "CRIPTO" ? principaisCripto : principaisFii;
  const secundarios = tipo === "CRIPTO" ? secundariosCripto : secundariosFii;

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-zinc-950/95 backdrop-blur border-t border-zinc-900"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5">
          {principais.map(({ href, label, icon: Icon }) => {
            const ativo =
              href === "/" ? p === "/" :
              href === "/cripto" ? p === "/cripto" :
              p.startsWith(href);
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px]",
                  ativo ? "text-emerald-400" : "text-zinc-500",
                )}>
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => setAberto(true)}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[11px]",
              secundarios.some((s) => p.startsWith(s.href)) ? "text-emerald-400" : "text-zinc-500",
            )}
          >
            <MoreHorizontal size={18} />
            Mais
          </button>
        </div>
      </nav>

      {aberto && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70" onClick={() => setAberto(false)}>
          <div
            className="absolute bottom-0 inset-x-0 bg-zinc-950 border-t border-zinc-800 rounded-t-2xl"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800">
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
                      "flex flex-col items-center gap-2 py-4 rounded-xl border",
                      ativo
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 text-zinc-300",
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
