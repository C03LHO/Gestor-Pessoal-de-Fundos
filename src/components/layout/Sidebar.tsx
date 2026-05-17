"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, ListPlus, Target, Calculator, CalendarDays, FileText, BarChart3, Settings, TrendingDown, Map, Sparkles, LineChart } from "lucide-react";
import { cn } from "@/lib/cn";

const itens = [
  { href: "/",              label: "Dashboard",     icon: LayoutDashboard },
  { href: "/oportunidades", label: "Oportunidades", icon: TrendingDown },
  { href: "/graficos",      label: "Gráficos",      icon: LineChart },
  { href: "/resumo",        label: "Resumo",        icon: BarChart3 },
  { href: "/carteira",      label: "Carteira",      icon: Wallet },
  { href: "/lancamentos",   label: "Lançamentos",   icon: ListPlus },
  { href: "/calendario",    label: "Calendário",    icon: CalendarDays },
  { href: "/metas",         label: "Metas",         icon: Target },
  { href: "/simulador",     label: "Simulador",     icon: Calculator },
  { href: "/relatorios",    label: "Relatórios",    icon: FileText },
  { href: "/configuracoes", label: "Config",        icon: Settings },
];

export function Sidebar() {
  const p = usePathname();
  return (
    <aside className="hidden md:flex w-60 min-h-screen flex-col border-r border-zinc-900 p-4 gap-1 sticky top-0">
      <div className="px-2 py-4">
        <div className="text-lg font-semibold tracking-tight">Fundos</div>
        <div className="text-xs text-zinc-500">Gestão pessoal de FIIs</div>
      </div>
      {itens.map(({ href, label, icon: Icon }) => {
        const ativo = href === "/" ? p === "/" : p.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition",
              ativo
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
            )}
          >
            <Icon size={16} /> {label}
          </Link>
        );
      })}
    </aside>
  );
}
