"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CRYPTO_ASSETS, CRYPTO_BY_ID, formatQtd, TIPO_LANCAMENTO_META, isEntradaGratuita, type TipoTransacao } from "@/lib/cripto/constants";
import { dataBR } from "@/lib/format";
import { useMoeda } from "@/lib/cripto/moeda";
import { Money } from "@/components/cripto/Money";
import { Trash2, Plus, ArrowDownCircle, ArrowUpCircle, Pickaxe, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/cn";

type Lanc = {
  id: string;
  tipo: TipoTransacao;
  data: string;
  cryptoId: string;
  quantidade: number;
  precoUnit: number;
  valorTotal: number;
  observacao: string | null;
};

type PrecoSnap = { cryptoId: string; precoBrl: number; precoUsd: number | null };

const ICONE_TIPO: Record<TipoTransacao, { Icon: any; cor: string }> = {
  COMPRA:        { Icon: ArrowDownCircle, cor: "text-emerald-400" },
  VENDA:         { Icon: ArrowUpCircle,   cor: "text-rose-400" },
  MINERACAO:     { Icon: Pickaxe,         cor: "text-amber-400" },
  TRANSFERENCIA: { Icon: ArrowRightLeft,  cor: "text-sky-400" },
};

const BADGE_TIPO: Record<TipoTransacao, string> = {
  COMPRA:        "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  VENDA:         "bg-rose-500/15 text-rose-300 border-rose-500/30",
  MINERACAO:     "bg-amber-500/15 text-amber-300 border-amber-500/30",
  TRANSFERENCIA: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

export function LancamentosCriptoClient({ lancamentos, precos, saldos }: {
  lancamentos: Lanc[];
  precos: PrecoSnap[];
  saldos: Record<string, number>;
}) {
  const router = useRouter();
  const { moeda, rate } = useMoeda();
  const [filtro, setFiltro] = useState<string>("");
  const [tipo, setTipo] = useState<TipoTransacao>("COMPRA");
  const [cryptoId, setCryptoId] = useState<string>(CRYPTO_ASSETS[0].id);
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [quantidade, setQuantidade] = useState<string>("");
  const [precoUnit, setPrecoUnit] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const ativoMeta = CRYPTO_BY_ID[cryptoId];
  const entradaGratuita = isEntradaGratuita(tipo);
  const precoAtivo = precos.find((p) => p.cryptoId === cryptoId);
  const saldoAtual = saldos[cryptoId] ?? 0;

  const filtrados = useMemo(
    () => (filtro ? lancamentos.filter((l) => l.cryptoId === filtro) : lancamentos),
    [filtro, lancamentos],
  );

  // Parsed numbers
  const qtdNum = useMemo(() => {
    const q = Number(quantidade.replace(",", "."));
    return isNaN(q) ? 0 : q;
  }, [quantidade]);
  const precoNum = useMemo(() => {
    const p = Number(precoUnit.replace(",", "."));
    return isNaN(p) ? 0 : p;
  }, [precoUnit]);

  // Rate específico do ativo selecionado (BRL por USD do ATIVO, não do BTC).
  // BTC e KAS têm preços em USD totalmente diferentes — usar o rate do BTC
  // pra converter KAS dava conversão muito errada.
  const rateAtivo = useMemo(() => {
    if (!precoAtivo || !precoAtivo.precoUsd || precoAtivo.precoUsd <= 0) return rate;
    return precoAtivo.precoBrl / precoAtivo.precoUsd;
  }, [precoAtivo, rate]);

  // Se moeda do toggle é USD, o campo de preço está em USD → converte pra BRL usando rate DO ATIVO.
  const precoBrlEnviado = useMemo(() => {
    if (moeda === "USD") return precoNum * rateAtivo;
    return precoNum;
  }, [precoNum, moeda, rateAtivo]);

  const totalBrl = qtdNum * precoBrlEnviado;
  const valorMercadoBrl = qtdNum * (precoAtivo?.precoBrl ?? 0);
  const valorMercadoUsd = precoAtivo?.precoUsd != null && precoAtivo?.precoBrl
    ? qtdNum * precoAtivo.precoUsd
    : null;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!qtdNum || qtdNum <= 0) return setErro("Quantidade inválida");
    if (!entradaGratuita && (!precoNum || precoNum <= 0)) return setErro("Preço inválido");
    setSalvando(true);
    try {
      const body: any = {
        tipo, cryptoId, data,
        quantidade: qtdNum,
        observacao: obs || null,
      };
      if (!entradaGratuita) {
        body.precoUnit = precoBrlEnviado;
        body.valorTotal = qtdNum * precoBrlEnviado;
      }
      const r = await fetch("/api/cripto/transacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        try { setErro(JSON.parse(t).erro ?? t); } catch { setErro(t); }
        return;
      }
      setQuantidade(""); setPrecoUnit(""); setObs("");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    const r = await fetch(`/api/cripto/transacoes/${id}`, { method: "DELETE" });
    if (r.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Lançamentos cripto</h1>

      <form onSubmit={salvar} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        {/* Tipo */}
        <div>
          <div className="text-[11px] text-zinc-500 uppercase mb-1.5">Tipo de lançamento</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.entries(TIPO_LANCAMENTO_META) as [TipoTransacao, typeof TIPO_LANCAMENTO_META[TipoTransacao]][]).map(([t, meta]) => {
              const ativo = tipo === t;
              const { Icon } = ICONE_TIPO[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left",
                    ativo ? BADGE_TIPO[t] : "border-zinc-800 text-zinc-400 hover:border-zinc-700",
                  )}
                >
                  <Icon size={16} className={ICONE_TIPO[t].cor} />
                  <span className="text-xs">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Campos básicos */}
        <div className={cn("grid gap-3", entradaGratuita ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4")}>
          <label className="flex flex-col text-xs gap-1">
            <span className="text-zinc-500">Ativo</span>
            <select value={cryptoId} onChange={(e) => setCryptoId(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm">
              {CRYPTO_ASSETS.map((a) => (
                <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs gap-1">
            <span className="text-zinc-500">Data</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm" />
          </label>
          <label className="flex flex-col text-xs gap-1">
            <span className="text-zinc-500">
              Quantidade ({ativoMeta.decimals} casas)
              {tipo === "VENDA" && (
                <span className="ml-2 text-zinc-600">
                  saldo: {formatQtd(saldoAtual, cryptoId)}
                </span>
              )}
            </span>
            <input type="text" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)}
              placeholder={`0,${"0".repeat(Math.min(ativoMeta.decimals, 4))}`}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm font-mono" />
          </label>
          {!entradaGratuita && (
            <label className="flex flex-col text-xs gap-1">
              <span className="text-zinc-500">Preço unitário ({moeda})</span>
              <input type="text" inputMode="decimal" value={precoUnit} onChange={(e) => setPrecoUnit(e.target.value)}
                placeholder="0,00"
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm font-mono" />
            </label>
          )}
        </div>

        <label className="flex flex-col text-xs gap-1">
          <span className="text-zinc-500">Observação (opcional)</span>
          <input type="text" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={200}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm" />
        </label>

        {/* Cálculo em tempo real */}
        <div className="border-t border-zinc-800 pt-3 space-y-1 text-xs">
          {!entradaGratuita && qtdNum > 0 && precoNum > 0 && (
            <div className="text-zinc-300">
              Total: <strong><Money brl={totalBrl} usd={totalBrl / rateAtivo} /></strong>
            </div>
          )}
          {qtdNum > 0 && precoAtivo && (
            <div className="text-zinc-400">
              {entradaGratuita
                ? <>Valor minerado (preço atual): <strong><Money brl={valorMercadoBrl} usd={valorMercadoUsd} /></strong></>
                : <>Valor de mercado agora: <Money brl={valorMercadoBrl} usd={valorMercadoUsd} /></>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {erro && <span className="text-xs text-rose-400">{erro}</span>}
          <button type="submit" disabled={salvando}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-zinc-950 text-sm font-semibold disabled:opacity-40">
            <Plus size={14} /> {salvando ? "Salvando…" : "Lançar"}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Filtrar:</span>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs">
          <option value="">Todos</option>
          {CRYPTO_ASSETS.map((a) => <option key={a.id} value={a.id}>{a.symbol}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-zinc-900/60 text-zinc-400 text-xs">
            <tr>
              <th className="text-left px-3 py-2">Data</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Ativo</th>
              <th className="text-right px-3 py-2">Quantidade</th>
              <th className="text-right px-3 py-2">Preço</th>
              <th className="text-right px-3 py-2">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-zinc-500 py-6">Nenhum lançamento.</td></tr>
            ) : filtrados.map((l) => {
              const meta = CRYPTO_BY_ID[l.cryptoId];
              const { Icon, cor } = ICONE_TIPO[l.tipo as TipoTransacao] ?? ICONE_TIPO.COMPRA;
              const gratuita = isEntradaGratuita(l.tipo);
              const precoLinha = precos.find((p) => p.cryptoId === l.cryptoId);
              const rateLinha = precoLinha && precoLinha.precoUsd && precoLinha.precoUsd > 0
                ? precoLinha.precoBrl / precoLinha.precoUsd
                : rate;
              return (
                <tr key={l.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2 whitespace-nowrap">{dataBR(l.data)}</td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border", BADGE_TIPO[l.tipo as TipoTransacao] ?? "border-zinc-700 text-zinc-400")}>
                      <Icon size={12} className={cor} />
                      {TIPO_LANCAMENTO_META[l.tipo as TipoTransacao]?.label ?? l.tipo}
                    </span>
                  </td>
                  <td className="px-3 py-2"><strong>{meta?.symbol ?? l.cryptoId}</strong></td>
                  <td className="text-right px-3 py-2 font-mono text-xs">{formatQtd(l.quantidade, l.cryptoId)}</td>
                  <td className="text-right px-3 py-2">
                    {gratuita ? <span className="text-zinc-600">—</span> : <Money brl={l.precoUnit} usd={l.precoUnit / rateLinha} />}
                  </td>
                  <td className="text-right px-3 py-2">
                    {gratuita ? <span className="text-zinc-600">—</span> : <Money brl={l.valorTotal} usd={l.valorTotal / rateLinha} />}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => excluir(l.id)} className="text-zinc-500 hover:text-rose-400 p-1">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
