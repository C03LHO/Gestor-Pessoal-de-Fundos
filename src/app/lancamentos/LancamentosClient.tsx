"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, CheckSquare, Square, Pencil, RefreshCw } from "lucide-react";
import { brl, dataBR } from "@/lib/format";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/ux/haptic";
import { useToast } from "@/components/ux/Toast";

type Ativo = {
  id: string;
  ticker: string;
  nome: string | null;
  precoAtual: number | null;
  ultimoPrecoCompra: number | null;
};
type Lanc = {
  id: string;
  tipo: string;
  data: string;
  quantidade: number | null;
  precoUnit: number | null;
  valorTotal: number;
  observacao: string | null;
  ativoId: string | null;
  ativo: { id: string; ticker: string; nome: string | null } | null;
};

const TIPOS = ["COMPRA", "VENDA", "APORTE", "DIVIDENDO", "REINVESTIMENTO"] as const;
const TIPOS_NOVOS = ["COMPRA", "VENDA"] as const;

const corTipo: Record<string, string> = {
  COMPRA:         "bg-emerald-500/10 text-emerald-300",
  VENDA:          "bg-rose-500/10 text-rose-300",
  APORTE:         "bg-sky-500/10 text-sky-300",
  DIVIDENDO:      "bg-amber-500/10 text-amber-300",
  REINVESTIMENTO: "bg-violet-500/10 text-violet-300",
};

export function LancamentosClient({ lancamentos, ativos }: { lancamentos: Lanc[]; ativos: Ativo[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editor, setEditor] = useState<{ modo: "novo" } | { modo: "editar"; lanc: Lanc } | null>(null);
  const [filtro, setFiltro] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState<"unico" | "lote" | null>(null);
  const [alvoUnico, setAlvoUnico] = useState<Lanc | null>(null);
  const [deletando, setDeletando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState<{
    importados: number;
    detalhes: { ticker: string; importados: number; erro?: string }[] | null;
  } | null>(null);

  async function atualizarDividendos() {
    setSincronizando(true);
    setResultadoSync(null);
    try {
      const r = await fetch("/api/mercado/importar-dividendos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anos: 10 }),
      });
      if (!r.ok) {
        toast("erro", `Falha ao atualizar dividendos (${r.status})`);
        return;
      }
      const j = await r.json();
      setResultadoSync(j);
      if (j.importados > 0) {
        toast("sucesso", `${j.importados} novos dividendos importados`);
        router.refresh();
      } else {
        toast("info", "Nenhum dividendo novo encontrado");
      }
    } catch (e: any) {
      toast("erro", e?.message ?? "Erro ao atualizar");
    } finally {
      setSincronizando(false);
    }
  }

  const filtrados = useMemo(() => {
    let l = lancamentos;
    if (filtro) l = l.filter((x) => x.tipo === filtro);
    if (busca) {
      const q = busca.toUpperCase();
      l = l.filter((x) =>
        x.ativo?.ticker.includes(q) ||
        x.observacao?.toUpperCase().includes(q) ||
        x.tipo.includes(q),
      );
    }
    return l;
  }, [lancamentos, filtro, busca]);

  const todosSelecionados = filtrados.length > 0 && filtrados.every((l) => selecionados.has(l.id));

  function toggle(id: string) {
    setSelecionados((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleTodos() {
    setSelecionados(todosSelecionados ? new Set() : new Set(filtrados.map((l) => l.id)));
  }

  async function executarExclusao() {
    setDeletando(true);
    try {
      if (confirmar === "unico" && alvoUnico) {
        await fetch(`/api/lancamentos/${alvoUnico.id}`, { method: "DELETE" });
        toast("sucesso", "Lançamento excluído");
      } else if (confirmar === "lote") {
        await fetch("/api/lancamentos/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selecionados) }),
        });
        toast("sucesso", `${selecionados.size} lançamentos excluídos`);
        setSelecionados(new Set());
      }
      setConfirmar(null);
      setAlvoUnico(null);
      router.refresh();
    } finally {
      setDeletando(false);
    }
  }

  const totalSelecionado = useMemo(
    () => lancamentos.filter((l) => selecionados.has(l.id)).reduce((s, l) => s + l.valorTotal, 0),
    [lancamentos, selecionados],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Lançamentos</h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-0.5">{lancamentos.length} registros</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-ghost border border-zinc-800 inline-flex items-center gap-2 text-xs md:text-sm"
            onClick={atualizarDividendos}
            disabled={sincronizando}
            title="Consulta todas as fontes e importa dividendos novos"
          >
            <RefreshCw size={14} className={sincronizando ? "animate-spin" : ""} />
            {sincronizando ? "Buscando..." : "Atualizar dividendos"}
          </button>
          <button className="btn hidden md:inline-flex" onClick={() => setEditor({ modo: "novo" })}>
            <Plus size={16} /> Novo
          </button>
        </div>
      </header>

      {resultadoSync && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">
              {resultadoSync.importados > 0
                ? `${resultadoSync.importados} dividendos novos importados`
                : "Nenhum dividendo novo encontrado"}
            </h3>
            <button
              className="text-zinc-400 hover:text-zinc-100"
              onClick={() => setResultadoSync(null)}
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
          {resultadoSync.detalhes && resultadoSync.detalhes.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {resultadoSync.detalhes.map((d) => (
                <div
                  key={d.ticker}
                  className={cn(
                    "rounded-md px-2 py-1.5 border",
                    d.erro
                      ? "border-rose-900/40 bg-rose-950/20 text-rose-300"
                      : d.importados > 0
                        ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300"
                        : "border-zinc-800 text-zinc-500",
                  )}
                  title={d.erro ?? `${d.importados} novos`}
                >
                  <div className="font-medium">{d.ticker}</div>
                  <div className="text-[10px] tabular-nums">
                    {d.erro ? "erro" : `+${d.importados}`}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-zinc-500 mt-3">
            Consulta Yahoo, Status Invest e Fundamentus em paralelo. Importa apenas datas
            posteriores às suas compras.
          </p>
        </div>
      )}

      {/* FAB no mobile */}
      <button className="fab" onClick={() => setEditor({ modo: "novo" })} aria-label="Novo lançamento">
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input !w-auto flex-1 min-w-[180px] max-w-xs"
          placeholder="Buscar ticker, obs..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button
          className={cn("btn-ghost border border-zinc-800", !filtro && "bg-zinc-800 text-white")}
          onClick={() => setFiltro("")}
        >
          Todos
        </button>
        {TIPOS.map((t) => (
          <button
            key={t}
            className={cn("btn-ghost border border-zinc-800 text-xs", filtro === t && "bg-zinc-800 text-white")}
            onClick={() => setFiltro(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {selecionados.size > 0 && (
        <div className="sticky top-2 z-30 flex items-center justify-between bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-xl px-4 py-3 shadow-lg">
          <div className="text-sm">
            <span className="font-medium">{selecionados.size}</span>
            <span className="text-zinc-400"> · {brl(totalSelecionado)}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setSelecionados(new Set())}>Limpar</button>
            <button
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-rose-500 text-zinc-950 hover:bg-rose-400"
              onClick={() => setConfirmar("lote")}
            >
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtrados.length === 0 ? (
          <p className="text-sm text-zinc-500 p-4 card">Nenhum lançamento.</p>
        ) : (
          filtrados.map((l) => {
            const sel = selecionados.has(l.id);
            return (
              <div
                key={l.id}
                className={cn("rounded-xl border p-3 transition",
                  sel ? "bg-emerald-500/5 border-emerald-500/40" : "bg-zinc-900/40 border-zinc-800")}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle(l.id)} className="mt-1 text-zinc-400 p-1 -ml-1" aria-label="Selecionar">
                    {sel ? <CheckSquare size={18} className="text-emerald-400" /> : <Square size={18} />}
                  </button>
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => setEditor({ modo: "editar", lanc: l })}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("chip", corTipo[l.tipo])}>{l.tipo}</span>
                        <span className="font-semibold truncate">{l.ativo?.ticker ?? "—"}</span>
                      </div>
                      <span className="text-sm font-semibold whitespace-nowrap">{brl(l.valorTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500 mt-1.5">
                      <span>{dataBR(l.data)}</span>
                      {l.quantidade != null && (
                        <span>{l.quantidade} × {l.precoUnit != null ? brl(l.precoUnit) : "—"}</span>
                      )}
                    </div>
                    {l.observacao && (
                      <p className="text-[11px] text-zinc-500 mt-1 truncate">{l.observacao}</p>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { haptic("erro"); setAlvoUnico(l); setConfirmar("unico"); }}
                    className="text-rose-400 p-2 -mr-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-x-auto p-0">
        {filtrados.length === 0 ? (
          <p className="text-sm text-zinc-500 p-6">Nenhum lançamento.</p>
        ) : (
          <table className="table min-w-[900px]">
            <thead>
              <tr>
                <th className="w-10">
                  <button onClick={toggleTodos} className="text-zinc-400 hover:text-zinc-100">
                    {todosSelecionados ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th>Data</th>
                <th>Tipo</th>
                <th>Ativo</th>
                <th className="text-right">Cotas</th>
                <th className="text-right">Preço</th>
                <th className="text-right">Valor</th>
                <th>Obs.</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => {
                const sel = selecionados.has(l.id);
                return (
                  <tr key={l.id} className={cn(sel && "bg-emerald-500/5")}>
                    <td>
                      <button onClick={() => toggle(l.id)} className="text-zinc-400 hover:text-zinc-100">
                        {sel ? <CheckSquare size={16} className="text-emerald-400" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="text-zinc-400">{dataBR(l.data)}</td>
                    <td><span className={cn("chip", corTipo[l.tipo])}>{l.tipo}</span></td>
                    <td className="font-medium">{l.ativo?.ticker ?? "—"}</td>
                    <td className="text-right">{l.quantidade ?? "—"}</td>
                    <td className="text-right">{l.precoUnit != null ? brl(l.precoUnit) : "—"}</td>
                    <td className="text-right font-medium">{brl(l.valorTotal)}</td>
                    <td className="text-zinc-500 text-xs max-w-[220px] truncate">{l.observacao ?? ""}</td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditor({ modo: "editar", lanc: l })}
                        className="btn-ghost !p-1.5"
                        aria-label="Editar"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAlvoUnico(l); setConfirmar("unico"); }}
                        className="btn-danger !p-1.5"
                        aria-label="Excluir"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editor && (
        <LancamentoDialog
          modo={editor.modo}
          existente={editor.modo === "editar" ? editor.lanc : undefined}
          ativos={ativos}
          onClose={() => setEditor(null)}
          onSaved={() => { setEditor(null); router.refresh(); }}
        />
      )}

      {confirmar && (
        <ConfirmarExclusao
          titulo={confirmar === "lote" ? `Excluir ${selecionados.size} lançamentos?` : "Excluir lançamento?"}
          descricao={
            confirmar === "lote"
              ? `Total: ${brl(totalSelecionado)}. Esta ação não pode ser desfeita.`
              : alvoUnico
                ? `${alvoUnico.tipo} · ${alvoUnico.ativo?.ticker ?? ""} · ${brl(alvoUnico.valorTotal)} em ${dataBR(alvoUnico.data)}`
                : ""
          }
          loading={deletando}
          onClose={() => { setConfirmar(null); setAlvoUnico(null); }}
          onConfirm={executarExclusao}
        />
      )}
    </div>
  );
}

function ConfirmarExclusao({
  titulo, descricao, loading, onClose, onConfirm,
}: { titulo: string; descricao: string; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center md:p-4">
      <div
        className="bg-zinc-950 w-full md:max-w-md rounded-t-2xl md:rounded-2xl border border-zinc-800 p-5"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p className="text-sm text-zinc-400 mt-2">{descricao}</p>
        <div className="grid grid-cols-2 gap-2 mt-5">
          <button
            className="min-h-[48px] rounded-lg border border-zinc-800 text-zinc-300 font-medium active:bg-zinc-800"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="min-h-[48px] rounded-lg bg-rose-500 text-zinc-950 font-medium hover:bg-rose-400 disabled:opacity-50"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LancamentoDialog({
  modo, existente, ativos, onClose, onSaved,
}: {
  modo: "novo" | "editar";
  existente?: Lanc;
  ativos: Ativo[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = modo === "editar" && existente;
  const [tipo, setTipo] = useState<string>(existente?.tipo ?? "COMPRA");
  const [data, setData] = useState(
    existente ? existente.data.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [ticker, setTicker] = useState(existente?.ativo?.ticker ?? "");
  const [quantidade, setQuantidade] = useState(existente?.quantidade?.toString() ?? "");
  const [precoUnit, setPrecoUnit] = useState(existente?.precoUnit?.toString() ?? "");
  const [valorTotal, setValorTotal] = useState(existente?.valorTotal?.toString() ?? "");
  const [observacao, setObservacao] = useState(existente?.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [foco, setFoco] = useState(false);
  const [buscandoPreco, setBuscandoPreco] = useState(false);
  const [outlier, setOutlier] = useState<string | null>(null);
  const toast = useToast();

  // Verifica outlier sempre que ticker + preço estiverem definidos
  useEffect(() => {
    const t = ticker.trim().toUpperCase();
    const p = parseFloat(precoUnit.replace(",", "."));
    if (!t || isNaN(p) || p <= 0) { setOutlier(null); return; }
    const handle = setTimeout(async () => {
      try {
        const r = await fetch(`/api/ativos/validar-preco?ticker=${encodeURIComponent(t)}&preco=${p}`);
        if (!r.ok) return;
        const j = await r.json();
        setOutlier(j.outlier ? j.sugestao : null);
      } catch {}
    }, 400);
    return () => clearTimeout(handle);
  }, [ticker, precoUnit]);

  // Auto-busca preço de fechamento da data quando muda data ou ticker (modo NOVO, data passada)
  useEffect(() => {
    if (editing) return;
    if (!precisaQtd) return;
    const t = ticker.trim().toUpperCase();
    if (!t || t.length < 4 || !data) return;
    const dataAlvo = new Date(data + "T12:00:00");
    const hoje = new Date();
    const ehHoje = dataAlvo.toDateString() === hoje.toDateString();
    if (ehHoje || dataAlvo > hoje) return; // só puxa histórico se data passada
    const handle = setTimeout(async () => {
      try {
        const r = await fetch(`/api/mercado/preco-historico?ticker=${encodeURIComponent(t)}&data=${data}`);
        if (!r.ok) return;
        const j = await r.json();
        if (typeof j.preco === "number") {
          const p = j.preco.toFixed(2);
          setPrecoUnit(p);
          if (quantidade) recalcTotal(quantidade, p);
        }
      } catch {}
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, data]);

  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const precisaQtd = tipo === "COMPRA" || tipo === "VENDA" || tipo === "REINVESTIMENTO";
  const precisaAtivo = tipo !== "APORTE";

  const sugestoes = useMemo(() => {
    if (!precisaAtivo) return [];
    const q = ticker.trim().toUpperCase();
    if (!q) return ativos.slice(0, 6);
    return ativos.filter((a) => a.ticker.includes(q)).slice(0, 8);
  }, [ticker, ativos, precisaAtivo]);

  function recalcTotal(q: string, p: string) {
    const qn = parseFloat(q.replace(",", "."));
    const pn = parseFloat(p.replace(",", "."));
    if (!isNaN(qn) && !isNaN(pn)) setValorTotal((qn * pn).toFixed(2));
  }

  function selecionarTicker(a: Ativo) {
    setTicker(a.ticker);
    setFoco(false);
    if (!editing) {
      // Se a data é passada, NÃO pré-preenche com último preço — o useEffect
      // de preço histórico vai puxar o close do Yahoo na data certa.
      const dataAlvo = new Date(data + "T12:00:00");
      const ehHojeOuFuturo = dataAlvo >= new Date(new Date().toDateString());
      if (ehHojeOuFuturo) {
        const preco = a.ultimoPrecoCompra ?? a.precoAtual;
        if (preco != null && !precoUnit) {
          const p = preco.toFixed(2);
          setPrecoUnit(p);
          if (quantidade) recalcTotal(quantidade, p);
        }
      }
    }
  }

  async function buscarPrecoYahoo() {
    if (!ticker) return;
    setBuscandoPreco(true);
    try {
      const r = await fetch(`/api/mercado/cotacao?ticker=${encodeURIComponent(ticker.toUpperCase())}`);
      if (!r.ok) return;
      const c = await r.json();
      const p = c.preco.toFixed(2);
      setPrecoUnit(p);
      if (quantidade) recalcTotal(quantidade, p);
    } finally {
      setBuscandoPreco(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      let ativoId: string | null = existente?.ativoId ?? null;
      if (precisaAtivo) {
        const t = ticker.trim().toUpperCase();
        if (!t) { setErro("Informe o ticker."); return; }
        // No modo novo, faz upsert. No editar, só atualiza ativoId se ticker mudou.
        const tickerMudou = !existente || existente.ativo?.ticker !== t;
        if (tickerMudou) {
          const r = await fetch("/api/ativos/upsert-ticker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker: t }),
          });
          if (!r.ok) { setErro(await r.text()); return; }
          const a = await r.json();
          ativoId = a.id;
        }
      }

      const body = {
        tipo,
        data: new Date(data + "T12:00:00").toISOString(),
        ativoId,
        quantidade: quantidade ? parseFloat(quantidade.replace(",", ".")) : null,
        precoUnit: precoUnit ? parseFloat(precoUnit.replace(",", ".")) : null,
        valorTotal: parseFloat(valorTotal.replace(",", ".")),
        observacao: observacao || null,
      };

      const url = editing ? `/api/lancamentos/${existente!.id}` : "/api/lancamentos";
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { setErro(await r.text()); return; }
      const resp = await r.json().catch(() => ({}));
      const importados = resp?.dividendosImportados ?? 0;
      if (importados > 0) {
        toast("sucesso", `Lançamento salvo. ${importados} dividendos retroativos importados.`);
      } else if (!editing) {
        toast("sucesso", "Lançamento salvo.");
      }
      onSaved();
    } catch (e: any) {
      setErro(e?.message ?? "Erro desconhecido");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 md:bg-black/60 md:flex md:items-center md:justify-center md:p-4">
      <div
        className="bg-zinc-950 w-full h-[100dvh] md:h-auto md:max-w-lg md:max-h-[90vh] md:rounded-2xl md:border md:border-zinc-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div className="flex items-center justify-between px-3 md:px-5 border-b border-zinc-800 shrink-0"
             style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))",
                      paddingBottom: "0.75rem" }}>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-300 hover:text-zinc-100 -ml-2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cancelar"
          >
            <X size={22} />
          </button>
          <h2 className="font-semibold text-base">
            {editing ? "Editar lançamento" : "Novo lançamento"}
          </h2>
          <div className="w-11" />
        </div>

        {/* Body scrollable */}
        <form onSubmit={salvar} id="lancamento-form" className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          <div>
            <label className="label">Tipo</label>
            {editing ? (
              <div className="flex items-center gap-2">
                <span className={cn("chip text-sm py-1 px-2", corTipo[tipo])}>{tipo}</span>
                <span className="text-[10px] text-zinc-500">tipo não pode ser alterado</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {TIPOS_NOVOS.map((t) => (
                  <button
                    type="button" key={t} onClick={() => setTipo(t)}
                    className={cn(
                      "min-h-[48px] px-3 py-3 text-base rounded-lg border transition font-medium",
                      tipo === t
                        ? t === "COMPRA"
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/60 bg-rose-500/10 text-rose-300"
                        : "border-zinc-800 text-zinc-400 hover:text-zinc-200 active:bg-zinc-800",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            {!editing && (
              <p className="text-[10px] text-zinc-500 mt-1.5">
                Dividendos entram automaticamente do mercado.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="label">Data</label>
              <input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
            {precisaAtivo && (
              <div className="relative">
                <label className="label">Ticker</label>
                <input
                  className="input uppercase"
                  placeholder="Ex.: HGLG11"
                  value={ticker}
                  onChange={(e) => { setTicker(e.target.value); setFoco(true); }}
                  onFocus={() => setFoco(true)}
                  onBlur={() => setTimeout(() => setFoco(false), 200)}
                  required
                />
                {foco && sugestoes.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                    {sugestoes.map((a) => {
                      const preco = a.ultimoPrecoCompra ?? a.precoAtual;
                      return (
                        <button
                          key={a.id} type="button"
                          onPointerDown={(e) => { e.preventDefault(); selecionarTicker(a); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 active:bg-zinc-800 flex items-center gap-3 min-h-[48px] border-b border-zinc-800/60 last:border-b-0"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm">{a.ticker}</div>
                            {a.nome && (
                              <div className="text-zinc-500 text-[10px] truncate leading-tight mt-0.5">
                                {a.nome}
                              </div>
                            )}
                          </div>
                          {preco != null && (
                            <span className="text-emerald-400 text-xs font-medium tabular-nums shrink-0">
                              {brl(preco)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {precisaQtd && (
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="label">Quantidade</label>
                <input
                  className="input"
                  value={quantidade}
                  onChange={(e) => { setQuantidade(e.target.value); recalcTotal(e.target.value, precoUnit); }}
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="label flex items-center justify-between gap-2 whitespace-nowrap">
                  <span className="truncate">Preço/cota</span>
                  <button type="button" onClick={buscarPrecoYahoo} disabled={buscandoPreco}
                          className="text-emerald-400 normal-case tracking-normal text-[10px] hover:underline disabled:opacity-50 shrink-0">
                    {buscandoPreco ? "buscando..." : "cotação atual"}
                  </button>
                </label>
                <input
                  className="input"
                  value={precoUnit}
                  onChange={(e) => { setPrecoUnit(e.target.value); recalcTotal(quantidade, e.target.value); }}
                  inputMode="decimal"
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">Valor total (R$)</label>
            <input
              className="input"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              inputMode="decimal"
              required
            />
          </div>

          <div>
            <label className="label">Observação</label>
            <input className="input" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>

          {outlier && !erro && (
            <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2">
              ⚠ {outlier}
            </div>
          )}
          {erro && (
            <div className="text-sm text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-lg px-3 py-2">
              {erro}
            </div>
          )}
        </form>

        {/* Footer sticky com Salvar */}
        <div
          className="border-t border-zinc-800 px-4 md:px-5 py-3 shrink-0 bg-zinc-950"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="submit"
            form="lancamento-form"
            className="btn w-full text-base"
            disabled={salvando}
          >
            {salvando ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar lançamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
