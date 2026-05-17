"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Download, RefreshCw } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { brl, dataBR, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ux/Toast";

type Ativo = {
  id: string; ticker: string; nome: string | null; segmento: string | null;
  precoAtual: number | null;
  lancamentos: { id: string; tipo: string; data: string; quantidade: number | null; precoUnit: number | null; valorTotal: number; observacao: string | null }[];
};
type Cotacao = { ticker: string; preco: number; data: string };
type DividendoYahoo = { data: string; valor: number };

const corTipo: Record<string, string> = {
  COMPRA:         "bg-emerald-500/10 text-emerald-300",
  VENDA:          "bg-rose-500/10 text-rose-300",
  DIVIDENDO:      "bg-amber-500/10 text-amber-300",
  REINVESTIMENTO: "bg-violet-500/10 text-violet-300",
  APORTE:         "bg-sky-500/10 text-sky-300",
};

export function AtivoClient({ ativo, cotacoes, dividendosYahoo }:
  { ativo: Ativo; cotacoes: Cotacao[]; dividendosYahoo: DividendoYahoo[] }) {

  const router = useRouter();
  const toast = useToast();
  const [importando, setImportando] = useState(false);

  async function importarDividendos() {
    setImportando(true);
    try {
      const r = await fetch("/api/mercado/importar-dividendos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativoId: ativo.id, anos: 10 }),
      });
      if (!r.ok) { toast("erro", "Falha: " + (await r.text()).slice(0, 100)); return; }
      const j = await r.json();
      if (j.importados > 0) {
        toast("sucesso", `${j.importados} dividendos importados de ${ativo.ticker}`);
        router.refresh();
      } else {
        toast("info", "Nenhum dividendo novo. Tudo já está sincronizado.");
      }
    } catch (e: any) {
      toast("erro", "Erro: " + (e?.message ?? "desconhecido"));
    } finally { setImportando(false); }
  }

  let cotas = 0, investido = 0, dividendos = 0;
  for (const l of ativo.lancamentos) {
    if (l.tipo === "COMPRA" || l.tipo === "REINVESTIMENTO") { cotas += l.quantidade ?? 0; investido += l.valorTotal; }
    else if (l.tipo === "VENDA") { cotas -= l.quantidade ?? 0; investido -= l.valorTotal; }
    else if (l.tipo === "DIVIDENDO") dividendos += l.valorTotal;
  }
  const pm = cotas > 0 ? investido / cotas : 0;
  const valorAtual = (ativo.precoAtual ?? pm) * cotas;
  const variacao = investido > 0 ? valorAtual / investido - 1 : 0;
  const yoc = investido > 0 ? dividendos / investido : 0;

  // série de dividendos por mês (Yahoo) — valores por cota
  const serieDiv = dividendosYahoo.map((d) => ({
    mes: new Date(d.data).toLocaleDateString("pt-BR", { month: "2-digit", year: "2-digit" }),
    valor: d.valor,
  }));

  return (
    <div className="space-y-5 md:space-y-6">
      <Link href="/carteira" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
        <ChevronLeft size={16} /> Carteira
      </Link>

      <header className="flex justify-between items-start gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{ativo.ticker}</h1>
          {ativo.nome && <p className="text-xs md:text-sm text-zinc-400 mt-0.5 truncate">{ativo.nome}</p>}
          {ativo.segmento && (
            <span className="inline-block mt-2 text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded">
              {ativo.segmento}
            </span>
          )}
        </div>
        {cotas > 0 && (
          <button
            onClick={importarDividendos}
            disabled={importando}
            className="btn-ghost border border-zinc-800 text-xs whitespace-nowrap"
            title="Busca no Yahoo e cria os dividendos faltantes (apenas datas em que você tinha cotas)"
          >
            {importando ? (
              <><RefreshCw size={12} className="animate-spin" /> Importando...</>
            ) : (
              <><Download size={12} /> Importar dividendos</>
            )}
          </button>
        )}
      </header>

      <section className="card">
        <div className="flex items-baseline gap-2 flex-wrap">
          <div className="text-3xl md:text-4xl font-semibold tabular-nums">{brl(valorAtual)}</div>
          <div className={cn("text-sm font-medium tabular-nums", variacao >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {variacao >= 0 ? "+" : ""}{pct(variacao)}
          </div>
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          {cotas} cotas · PM {brl(pm)} · cotação {brl(ativo.precoAtual ?? 0)}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Investido" valor={brl(investido)} />
        <Kpi label="Dividendos totais" valor={brl(dividendos)} accent="emerald" />
        <Kpi label="Yield on cost" valor={pct(yoc)} accent="emerald" />
        <Kpi label="Variação" valor={pct(variacao)} accent={variacao >= 0 ? "emerald" : "rose"} />
      </div>

      {serieDiv.length > 0 && (
        <section className="card">
          <h2 className="font-semibold mb-3">Histórico de proventos / cota (Yahoo)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serieDiv}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="mes" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} width={50} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12 }}
                formatter={(v: number) => [brl(v), "Por cota"]}
              />
              <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {cotacoes.length > 1 && (
        <section className="card">
          <h2 className="font-semibold mb-3">Cotação registrada</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cotacoes.map((c) => ({ d: dataBR(c.data), v: c.preco }))}>
              <XAxis dataKey="d" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} domain={["dataMin", "dataMax"]} width={60} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12 }}
                formatter={(v: number) => brl(v)}
              />
              <Bar dataKey="v" fill="#06b6d4" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      <section className="card">
        <h2 className="font-semibold mb-3">Lançamentos</h2>
        <div className="space-y-2">
          {ativo.lancamentos.map((l) => (
            <div key={l.id} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("chip", corTipo[l.tipo])}>{l.tipo}</span>
                  <span className="text-xs text-zinc-400">{dataBR(l.data)}</span>
                </div>
                {l.observacao && <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{l.observacao}</div>}
              </div>
              <div className="text-right">
                <div className="font-medium tabular-nums text-sm">{brl(l.valorTotal)}</div>
                {l.quantidade != null && l.precoUnit != null && (
                  <div className="text-[10px] text-zinc-500">{l.quantidade} × {brl(l.precoUnit)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, valor, accent }: { label: string; valor: string; accent?: "emerald" | "rose" }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={cn(
        "text-lg font-semibold tabular-nums mt-1 truncate",
        accent === "emerald" && "text-emerald-400",
        accent === "rose" && "text-rose-400",
      )}>{valor}</div>
    </div>
  );
}
