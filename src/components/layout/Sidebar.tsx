"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Wallet, ListPlus, Target, Calculator, CalendarDays,
  FileText, Settings, TrendingDown, TrendingUp, LineChart, Coins, Layers,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string; icon: typeof LayoutDashboard };
type Grupo = { titulo: string; itens: Item[] };

const gruposFii: Grupo[] = [
  {
    titulo: "Visão geral",
    itens: [
      { href: "/",              label: "Dashboard",     icon: LayoutDashboard },
      { href: "/oportunidades", label: "Oportunidades", icon: TrendingDown },
      { href: "/graficos",      label: "Gráficos",      icon: LineChart },
      { href: "/consolidado",   label: "Consolidado",   icon: Layers },
    ],
  },
  {
    titulo: "Carteira",
    itens: [
      { href: "/carteira",      label: "Carteira",      icon: Wallet },
      { href: "/lancamentos",   label: "Lançamentos",   icon: ListPlus },
      { href: "/calendario",    label: "Calendário",    icon: CalendarDays },
    ],
  },
  {
    titulo: "Planejamento",
    itens: [
      { href: "/metas",         label: "Metas",         icon: Target },
      { href: "/simulador",     label: "Simulador",     icon: Calculator },
      { href: "/relatorios",    label: "Relatórios",    icon: FileText },
    ],
  },
];

const gruposCripto: Grupo[] = [
  {
    titulo: "Visão geral",
    itens: [
      { href: "/cripto",               label: "Início",        icon: LayoutDashboard },
      { href: "/cripto/oportunidades", label: "Oportunidades", icon: TrendingDown },
      { href: "/cripto/graficos",      label: "Gráficos",      icon: LineChart },
      { href: "/consolidado",          label: "Consolidado",   icon: Layers },
    ],
  },
  {
    titulo: "Carteira",
    itens: [
      { href: "/cripto/carteira",      label: "Carteira",      icon: Coins },
      { href: "/cripto/lancamentos",   label: "Lançamentos",   icon: ListPlus },
      { href: "/cripto/relatorios",    label: "Relatórios",    icon: FileText },
    ],
  },
];

const config: Item = { href: "/configuracoes", label: "Configurações", icon: Settings };

function estaAtivo(p: string, href: string) {
  if (href === "/") return p === "/";
  if (href === "/cripto") return p === "/cripto";
  return p.startsWith(href);
}

function ItemNav({ item, ativo }: { item: Item; ativo: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition",
        ativo
          ? "bg-white/[0.06] text-white"
          : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100",
      )}
    >
      {ativo && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-400" />}
      <Icon size={16} className={cn("transition", ativo ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300")} />
      {item.label}
    </Link>
  );
}

export function Sidebar({ tipo = "FII" }: { tipo?: "FII" | "CRIPTO" }) {
  const p = usePathname();
  const grupos = tipo === "CRIPTO" ? gruposCripto : gruposFii;
  const subtitulo = tipo === "CRIPTO" ? "Acompanhamento de cripto" : "Gestão pessoal de FIIs";
  return (
    <aside className="hidden md:flex w-64 h-screen flex-col border-r border-white/[0.05] bg-black/20 backdrop-blur-xl px-3 py-5 sticky top-0 print:hidden">
      <Link href={tipo === "CRIPTO" ? "/cripto" : "/"} className="flex items-center gap-3 px-2 mb-6">
        <span className="grid place-items-center w-9 h-9 rounded-xl text-zinc-950 shadow-lg shadow-emerald-500/20"
              style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981 55%, #0891b2)" }}>
          <TrendingUp size={18} strokeWidth={2.5} />
        </span>
        <span>
          <span className="block text-[15px] font-semibold tracking-tight leading-tight">Fundos</span>
          <span className="block text-[11px] text-zinc-500">{subtitulo}</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto space-y-5">
        {grupos.map((g) => (
          <div key={g.titulo}>
            <div className="px-3 mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">{g.titulo}</div>
            <div className="space-y-0.5">
              {g.itens.map((item) => <ItemNav key={item.href} item={item} ativo={estaAtivo(p, item.href)} />)}
            </div>
          </div>
        ))}
      </nav>

      <div className="pt-3 mt-3 border-t border-white/[0.05]">
        <ItemNav item={config} ativo={estaAtivo(p, config.href)} />
      </div>
    </aside>
  );
}
