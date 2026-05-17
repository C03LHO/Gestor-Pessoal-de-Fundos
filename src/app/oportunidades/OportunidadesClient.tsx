"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Target, X, Pencil, ChevronDown, AlertTriangle } from "lucide-react";
import { brl, num, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ux/Toast";
import type { Valuation, ClasseValuation } from "@/lib/domain/valuation";

type Op = {
  ticker: string;
  nome: string | null;
  segmento: string | null;
  ordem: number;
  notas: string | null;
  precoAtual: number;
  janelaDias: number;
  valuation: Valuation;
  max52s: number;
  min52s: number;
  mediana52s: number;
  drawdown: number;
  percentil: number;
  scoreOportunidade: number;
  cotasAtuais: number;
  investido: number;
  metaInvestimento: number;
  progressoMeta: number;
  cotasParaMeta: number;
  faltaInvestir: number;
};

const CLASSE_INFO: Record<ClasseValuation, { rotulo: string; cor: string; bg: string; border: string }> = {
  muito_barato: { rotulo: "Muito barato", cor: "text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  barato:       { rotulo: "Barato",       cor: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  justo:        { rotulo: "Justo",        cor: "text-zinc-300",    bg: "bg-zinc-700/20",    border: "border-zinc-700/40" },
  caro:         { rotulo: "Caro",         cor: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
  muito_caro:   { rotulo: "Muito caro",   cor: "text-rose-300",    bg: "bg-rose-500/15",    border: "border-rose-500/30" },
};

export function OportunidadesClient({ oportunidades }: { oportunidades: Op[] }) {
  const router = useRouter();
  const toast = useToast();
  const [ordem, setOrdem] = useState<"score" | "percentil" | "minima" | "meta" | "ticker">("score");
  const [filtroClasse, setFiltroClasse] = useState<ClasseValuation | "todas">("todas");
  const [novoTicker, setNovoTicker] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [editandoMeta, setEditandoMeta] = useState<Op | null>(null);

  const filtradas = filtroClasse === "todas"
    ? oportunidades
    : oportunidades.filter((o) => o.valuation.classe === filtroClasse);

  const lista = [...filtradas].sort((a, b) => {
    if (ordem === "score") return b.valuation.score - a.valuation.score;
    if (ordem === "percentil") return a.valuation.percentilHistorico - b.valuation.percentilHistorico;
    if (ordem === "minima") return a.valuation.distMinima - b.valuation.distMinima;
    if (ordem === "meta") return a.progressoMeta - b.progressoMeta;
    return a.ticker.localeCompare(b.ticker);
  });

  const totalMeta = oportunidades.reduce((s, o) => s + o.metaInvestimento, 0);
  const totalInvestido = oportunidades.reduce((s, o) => s + o.investido, 0);
  const totalFalta = totalMeta - totalInvestido;

  async function adicionar() {
    if (!novoTicker.trim()) return;
    setAdicionando(true);
    try {
      const r = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: novoTicker.trim().toUpperCase() }),
      });
      if (!r.ok) { toast("erro", await r.text()); return; }
      toast("sucesso", `${novoTicker.toUpperCase()} adicionado`);
      setNovoTicker("");
      router.refresh();
    } finally { setAdicionando(false); }
  }

  async function salvarMeta(ticker: string, valor: number) {
    const items = await (await fetch("/api/watchlist")).json();
    const item = items.find((i: any) => i.ticker === ticker);
    if (!item) return;
    const r = await fetch(`/api/watchlist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metaInvestimento: valor }),
    });
    if (!r.ok) { toast("erro", await r.text()); return; }
    toast("sucesso", `Meta de ${ticker} atualizada para ${brl(valor)}`);
    setEditandoMeta(null);
    router.refresh();
  }

  async function aplicarMetaEmTodos(valor: number) {
    const items = await (await fetch("/api/watchlist")).json();
    await Promise.all(items.map((i: any) =>
      fetch(`/api/watchlist/${i.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaInvestimento: valor }),
      })
    ));
    toast("sucesso", `Meta de ${brl(valor)} aplicada a todos`);
    router.refresh();
  }

  async function remover(ticker: string) {
    if (!confirm(`Remover ${ticker} da watchlist?`)) return;
    const items = await (await fetch("/api/watchlist")).json();
    const item = items.find((i: any) => i.ticker === ticker);
    if (!item) return;
    await fetch(`/api/watchlist/${item.id}`, { method: "DELETE" });
    toast("sucesso", `${ticker} removido`);
    router.refresh();
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <header className="flex justify-between items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Oportunidades</h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
            {oportunidades.length} ativos · meta total {brl(totalMeta)}
          </p>
        </div>
        <MetaGlobalButton onAplicar={aplicarMetaEmTodos} />
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Investido</div>
          <div className="text-lg md:text-2xl font-semibold tabular-nums mt-1 truncate">{brl(totalInvestido)}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">{pct(totalInvestido / (totalMeta || 1))} da meta total</div>
        </div>
        <div className="card">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Falta investir</div>
          <div className="text-lg md:text-2xl font-semibold tabular-nums mt-1 truncate text-emerald-400">{brl(totalFalta)}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">para atingir tudo</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-500">Ordenar:</span>
          {([
            { id: "score",     label: "Score" },
            { id: "percentil", label: "Percentil" },
            { id: "minima",    label: "Perto da mín" },
            { id: "meta",      label: "Falta investir" },
            { id: "ticker",    label: "Ticker" },
          ] as const).map((o) => (
            <button
              key={o.id} onClick={() => setOrdem(o.id)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border",
                ordem === o.id
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 text-zinc-400",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-500">Filtrar:</span>
          {([
            { id: "todas",        label: "Todas" },
            { id: "muito_barato", label: "Muito barato" },
            { id: "barato",       label: "Barato" },
            { id: "justo",        label: "Justo" },
            { id: "caro",         label: "Caro" },
            { id: "muito_caro",   label: "Muito caro" },
          ] as const).map((o) => (
            <button
              key={o.id} onClick={() => setFiltroClasse(o.id as any)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border",
                filtroClasse === o.id
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 text-zinc-400",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {lista.map((o) => (
          <OportunidadeCard
            key={o.ticker} o={o}
            onAjustarMeta={() => setEditandoMeta(o)}
            onRemover={() => remover(o.ticker)}
          />
        ))}
      </div>

      {editandoMeta && (
        <MetaEditor
          op={editandoMeta}
          onSalvar={(v) => salvarMeta(editandoMeta.ticker, v)}
          onClose={() => setEditandoMeta(null)}
        />
      )}

      <section className="card">
        <h2 className="font-semibold mb-2 text-sm">Adicionar ticker à watchlist</h2>
        <div className="flex gap-2">
          <input
            className="input flex-1 uppercase"
            placeholder="HGRE11"
            value={novoTicker}
            onChange={(e) => setNovoTicker(e.target.value)}
          />
          <button className="btn" onClick={adicionar} disabled={adicionando || !novoTicker.trim()}>
            <Plus size={16} /> {adicionando ? "..." : "Adicionar"}
          </button>
        </div>
      </section>
    </div>
  );
}

function OportunidadeCard({
  o, onAjustarMeta, onRemover,
}: { o: Op; onAjustarMeta: () => void; onRemover: () => void }) {
  const [expandido, setExpandido] = useState(false);
  const v = o.valuation;
  const info = CLASSE_INFO[v.classe];

  // Posição do marcador na régua: usa percentil verdadeiro
  const posPct = Math.max(2, Math.min(98, v.percentilHistorico));
  const medianaPos = v.max > v.min ? ((v.mediana - v.min) / (v.max - v.min)) * 100 : 50;
  const mediaPos = v.max > v.min ? ((v.media - v.min) / (v.max - v.min)) * 100 : 50;

  const confiancaCor =
    v.confianca === "alta" ? "text-emerald-400" :
    v.confianca === "media" ? "text-amber-300" : "text-rose-300";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      {/* Cabeçalho */}
      <div className="flex justify-between items-start gap-2 mb-3">
        <Link href={`/carteira/${o.ticker}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base">{o.ticker}</span>
            <span className={cn(
              "text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded",
              info.bg, info.cor, "border", info.border,
            )}>
              {info.rotulo}
            </span>
            <span className={cn("text-[10px] tabular-nums", confiancaCor)} title="Confiança da análise">
              · {v.confianca}
            </span>
          </div>
          {o.notas && <div className="text-[10px] text-zinc-500 truncate mt-0.5">{o.notas}</div>}
        </Link>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums">{brl(o.precoAtual)}</div>
          <div className="text-[10px] text-zinc-500">
            score <span className={cn("font-semibold tabular-nums",
              v.score >= 60 ? "text-emerald-400" :
              v.score >= 40 ? "text-zinc-300" :
              v.score >= 20 ? "text-amber-300" : "text-rose-300"
            )}>{v.score}</span><span className="text-zinc-600">/100</span>
          </div>
        </div>
      </div>

      {/* Resumo do valuation */}
      <div className={cn(
        "rounded-lg p-2.5 mb-3 text-[11px] leading-snug border",
        info.bg, info.border,
      )}>
        <div className={cn("font-semibold mb-0.5", info.cor)}>
          {info.rotulo} · percentil {v.percentilHistorico.toFixed(0)}
        </div>
        <div className="text-zinc-300">{v.resumo}</div>
      </div>

      {/* Régua histórica com marcadores */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span>mín {brl(v.min)}</span>
          <span>{o.janelaDias} pregões (~12m)</span>
          <span>máx {brl(v.max)}</span>
        </div>
        <div className="relative h-3 rounded-full bg-zinc-800">
          {/* Marcador da média */}
          <div
            className="absolute top-0 bottom-0 w-px bg-zinc-500/60"
            style={{ left: `${mediaPos}%` }}
            title={`Média ${brl(v.media)}`}
          />
          {/* Marcador da mediana */}
          <div
            className="absolute top-0 bottom-0 w-px bg-zinc-400"
            style={{ left: `${medianaPos}%` }}
            title={`Mediana ${brl(v.mediana)}`}
          />
          {/* Marcador do preço atual */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-zinc-950 shadow",
              v.classe === "muito_barato" || v.classe === "barato" ? "bg-emerald-400" :
              v.classe === "justo" ? "bg-zinc-300" :
              "bg-rose-400"
            )}
            style={{ left: `${posPct}%` }}
            title={`Preço atual ${brl(o.precoAtual)} (percentil ${v.percentilHistorico.toFixed(0)})`}
          />
        </div>
        <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
          <span>↓ {pct(v.distMaxima)} da máx</span>
          <span>mediana {brl(v.mediana)}</span>
          <span>↑ {pct(v.distMinima)} da mín</span>
        </div>
      </div>

      {/* Avisos (se houver) */}
      {v.avisos.length > 0 && (
        <div className="mb-3 text-[10px] text-amber-300/90 flex items-start gap-1.5 bg-amber-950/20 border border-amber-900/30 rounded-md px-2 py-1.5">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <div>{v.avisos.join(" · ")}</div>
        </div>
      )}

      {/* Detalhes expansíveis */}
      <button
        onClick={() => setExpandido((e) => !e)}
        className="w-full text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1 py-1.5 border-y border-zinc-800/60"
      >
        <ChevronDown size={12} className={cn("transition", expandido && "rotate-180")} />
        {expandido ? "ocultar análise detalhada" : "ver análise detalhada"}
      </button>
      {expandido && (
        <div className="py-3 space-y-3 border-b border-zinc-800/60">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <Stat label="Mínima" valor={brl(v.min)} />
            <Stat label="Máxima" valor={brl(v.max)} />
            <Stat label="Média" valor={brl(v.media)} />
            <Stat label="Mediana" valor={brl(v.mediana)} />
            <Stat label="Percentil" valor={v.percentilHistorico.toFixed(0)} />
            <Stat label="Score" valor={`${v.score}/100`} />
            <Stat label="Desvio vs média" valor={pct(v.desvioMedia)} cor={v.desvioMedia <= 0 ? "text-emerald-400" : "text-rose-400"} />
            <Stat label="Desvio vs mediana" valor={pct(v.desvioMediana)} cor={v.desvioMediana <= 0 ? "text-emerald-400" : "text-rose-400"} />
            <Stat label="Acima da mín" valor={pct(v.distMinima)} />
            <Stat label="Desconto da máx" valor={pct(v.distMaxima)} cor="text-emerald-400" />
            <Stat label="Volatilidade (CV)" valor={(v.coefVariacao * 100).toFixed(1) + "%"} />
            <Stat label="Confiança" valor={v.confianca} cor={confiancaCor} />
          </div>
          {v.motivos.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Motivos</div>
              <ul className="space-y-1">
                {v.motivos.map((m, i) => (
                  <li
                    key={i}
                    className={cn(
                      "text-[11px] flex items-start gap-2",
                      m.peso === "positivo" ? "text-emerald-300" :
                      m.peso === "negativo" ? "text-rose-300" : "text-zinc-400",
                    )}
                  >
                    <span className="mt-1 w-1 h-1 rounded-full bg-current shrink-0" />
                    {m.texto}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Progresso da meta */}
      <div className="mt-3 mb-2">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span><Target className="inline" size={10} /> Meta {brl(o.metaInvestimento)}</span>
          <span>{pct(o.progressoMeta)}</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300"
            style={{ width: `${Math.min(100, o.progressoMeta * 100).toFixed(1)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
          <span>Investido: {brl(o.investido)}{o.cotasAtuais > 0 && ` (${num(o.cotasAtuais, 0)} cotas)`}</span>
          {o.faltaInvestir > 0 && (
            <span className="text-emerald-400">
              faltam {o.cotasParaMeta} cotas ({brl(o.faltaInvestir)})
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-zinc-800">
        <button onClick={onAjustarMeta} className="btn-ghost text-xs">
          <Pencil size={12} /> Editar meta
        </button>
        <button onClick={onRemover} className="btn-danger text-xs">
          <Trash2 size={12} /> Remover
        </button>
      </div>
    </div>
  );
}

function Stat({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={cn("tabular-nums font-medium", cor ?? "text-zinc-200")}>{valor}</span>
    </div>
  );
}

function MetaEditor({ op, onSalvar, onClose }:
  { op: Op; onSalvar: (v: number) => void; onClose: () => void }) {
  const [valor, setValor] = useState(op.metaInvestimento);
  const presets = [5000, 10000, 15000, 20000, 30000, 50000];
  const cotasNecessarias = op.precoAtual > 0 ? Math.ceil(valor / op.precoAtual) : 0;

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 w-full md:max-w-md rounded-t-2xl md:rounded-2xl border border-zinc-800"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 py-4 border-b border-zinc-800">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Meta de investimento</div>
            <h2 className="font-semibold text-lg">{op.ticker}</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 p-2 -mr-2"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">Valor da meta (R$)</label>
            <input
              type="number" min={0} step={500}
              value={valor}
              onChange={(e) => setValor(Number(e.target.value))}
              className="input text-lg font-semibold"
              autoFocus
            />
          </div>

          {/* mobile fix: 2col em mobile pra target não ficar apertado */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setValor(p)}
                className={cn(
                  "py-2 text-xs rounded-md border",
                  valor === p ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                              : "border-zinc-800 text-zinc-400",
                )}
              >
                {brl(p).replace(",00", "")}
              </button>
            ))}
          </div>

          <div className="bg-zinc-900 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Já investido</span>
              <span className="tabular-nums">{brl(op.investido)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Falta</span>
              <span className="tabular-nums text-emerald-400">{brl(Math.max(0, valor - op.investido))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Cotas a comprar</span>
              <span className="tabular-nums">
                {Math.max(0, cotasNecessarias - op.cotasAtuais)} × {brl(op.precoAtual)}
              </span>
            </div>
            <div className="border-t border-zinc-800 pt-2 mt-2 flex justify-between">
              <span className="text-zinc-500">Progresso</span>
              <span className={cn(
                "font-medium",
                op.investido >= valor ? "text-emerald-400" : "text-zinc-300",
              )}>
                {pct(valor > 0 ? Math.min(1, op.investido / valor) : 0)}
              </span>
            </div>
          </div>

          <button
            onClick={() => onSalvar(valor)}
            className="btn w-full"
            disabled={valor < 0}
          >
            Salvar meta
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaGlobalButton({ onAplicar }: { onAplicar: (v: number) => void }) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(10000);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="btn-ghost border border-zinc-800 text-xs"
      >
        <Target size={12} /> Meta para todos
      </button>
      {aberto && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center md:p-4"
             onClick={() => setAberto(false)}>
          <div
            className="bg-zinc-950 w-full md:max-w-md rounded-t-2xl md:rounded-2xl border border-zinc-800 p-5"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-lg mb-1">Aplicar meta a todos</h2>
            <p className="text-xs text-zinc-500 mb-4">
              Define o mesmo valor de meta para todos os ativos da watchlist.
            </p>
            <input
              type="number" value={valor} min={0} step={1000}
              onChange={(e) => setValor(Number(e.target.value))}
              className="input text-lg font-semibold mb-3"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setAberto(false)} className="btn-ghost border border-zinc-800 min-h-[44px]">
                Cancelar
              </button>
              <button
                onClick={() => { onAplicar(valor); setAberto(false); }}
                className="btn"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
