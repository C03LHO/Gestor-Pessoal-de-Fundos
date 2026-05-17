"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Target, X, Pencil } from "lucide-react";
import { brl, num, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ux/Toast";

type Op = {
  ticker: string;
  nome: string | null;
  segmento: string | null;
  ordem: number;
  notas: string | null;
  precoAtual: number;
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

export function OportunidadesClient({ oportunidades }: { oportunidades: Op[] }) {
  const router = useRouter();
  const toast = useToast();
  const [ordem, setOrdem] = useState<"oportunidade" | "meta" | "ticker">("oportunidade");
  const [novoTicker, setNovoTicker] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [editandoMeta, setEditandoMeta] = useState<Op | null>(null);

  const lista = [...oportunidades].sort((a, b) => {
    if (ordem === "oportunidade") return b.scoreOportunidade - a.scoreOportunidade;
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

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-zinc-500">Ordenar:</span>
        {([
          { id: "oportunidade", label: "Mais barato" },
          { id: "meta",         label: "Falta investir" },
          { id: "ticker",       label: "Ticker" },
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
  const corOportunidade =
    o.scoreOportunidade >= 60 ? "text-emerald-400" :
    o.scoreOportunidade >= 35 ? "text-amber-300" :
    "text-zinc-400";

  const tagBarato =
    o.scoreOportunidade >= 60 ? "BARATO" :
    o.scoreOportunidade >= 35 ? "OK" :
    "CARO";

  const explicacao = explicarScore(o, tagBarato);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex justify-between items-start gap-2 mb-3">
        <Link href={`/carteira/${o.ticker}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base">{o.ticker}</span>
            <span className={cn(
              "text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded",
              o.scoreOportunidade >= 60 && "bg-emerald-500/15 text-emerald-300",
              o.scoreOportunidade >= 35 && o.scoreOportunidade < 60 && "bg-amber-500/15 text-amber-300",
              o.scoreOportunidade < 35 && "bg-zinc-700/30 text-zinc-400",
            )}>
              {tagBarato}
            </span>
          </div>
          {o.notas && <div className="text-[10px] text-zinc-500 truncate mt-0.5">{o.notas}</div>}
        </Link>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums">{brl(o.precoAtual)}</div>
          <div className={cn("text-[10px] tabular-nums", corOportunidade)}>
            {o.drawdown >= 0
              ? <>↓ {pct(o.drawdown)} da máxima</>
              : <>↑ {pct(-o.drawdown)} da máxima</>}
          </div>
        </div>
      </div>

      {/* Explicação do BARATO/OK/CARO */}
      <div className={cn(
        "rounded-lg p-2.5 mb-3 text-[11px] leading-snug",
        o.scoreOportunidade >= 60 && "bg-emerald-950/30 border border-emerald-500/20 text-emerald-200",
        o.scoreOportunidade >= 35 && o.scoreOportunidade < 60 && "bg-amber-950/30 border border-amber-500/20 text-amber-200",
        o.scoreOportunidade < 35 && "bg-zinc-900/60 border border-zinc-800 text-zinc-400",
      )}>
        <span className="font-semibold">Por quê {tagBarato}?</span>{" "}{explicacao}
      </div>

      {/* Barra de range 52s */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span>min {brl(o.min52s)}</span>
          <span>mediana {brl(o.mediana52s)}</span>
          <span>máx {brl(o.max52s)}</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              o.scoreOportunidade >= 60 ? "bg-emerald-500" :
              o.scoreOportunidade >= 35 ? "bg-amber-500" :
              "bg-zinc-600",
            )}
            style={{ width: `${(o.percentil * 100).toFixed(1)}%` }}
          />
        </div>
      </div>

      {/* Progresso da meta */}
      <div className="mb-2">
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

function explicarScore(o: Op, tag: string): string {
  const drawdownPct = (o.drawdown * 100).toFixed(1);
  const percentilPct = (o.percentil * 100).toFixed(0);
  const range = o.max52s - o.min52s;
  const ondeNoRange =
    o.percentil < 0.2 ? "perto da mínima" :
    o.percentil < 0.4 ? "abaixo do meio do range" :
    o.percentil < 0.6 ? "no meio do range" :
    o.percentil < 0.8 ? "acima do meio do range" :
    "perto da máxima";

  if (tag === "BARATO") {
    return `Caiu ${drawdownPct}% da máxima de 52 semanas e está ${ondeNoRange} histórica (percentil ${percentilPct}). Janela boa de compra se o fundamento não mudou.`;
  }
  if (tag === "OK") {
    return `Está ${ondeNoRange} histórica (percentil ${percentilPct}), com queda de ${drawdownPct}% da máxima. Preço neutro — nem promoção nem caro.`;
  }
  return `Praticamente na máxima de 52s (drawdown ${drawdownPct}%) e ${ondeNoRange} (percentil ${percentilPct}). Comprar agora paga prêmio sobre o histórico — considere esperar uma correção.`;
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

          <div className="grid grid-cols-3 gap-1.5">
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
