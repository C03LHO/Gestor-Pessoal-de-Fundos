"use client";
import { useMemo, useState } from "react";
import { Sparkline } from "@/components/cripto/Sparkline";
import { TendenciaBadge } from "@/components/cripto/TendenciaBadge";
import { Money } from "@/components/cripto/Money";
import { useMoeda } from "@/lib/cripto/moeda";
import { ChartExpandedModal, type PeriodoConfig } from "@/components/charts/ChartExpandedModal";
import { Maximize2 } from "lucide-react";
import type { Tendencia } from "@/lib/cripto/analise";

type Dado = {
  cryptoId: string;
  symbol: string;
  nome: string;
  color: string;
  precoBrl: number;
  precoUsd: number | null;
  variacao24h: number | null;
  variacao7d: number | null;
  variacao30d: number | null;
  volume24hBrl: number | null;
  offline: boolean;
  historico: { t: number; p: number }[];
  score: number | null;
  tendencia: Tendencia | null;
};

const PERIODOS: PeriodoConfig[] = [
  { id: "1D", label: "1 dia",   curto: "1D" },
  { id: "1S", label: "1 semana", curto: "1S" },
  { id: "1M", label: "1 mês",   curto: "1M" },
  { id: "6M", label: "6 meses", curto: "6M" },
  { id: "1A", label: "1 ano",   curto: "1A" },
];

const DIAS_POR_PERIODO: Record<string, number> = {
  "1D": 1, "1S": 7, "1M": 30, "6M": 180, "1A": 365,
};

function filtrarPorPeriodo(pontos: { t: number; p: number }[], rangeId: string) {
  if (pontos.length === 0) return pontos;
  const dias = DIAS_POR_PERIODO[rangeId] ?? 30;
  const fim = pontos[pontos.length - 1].t;
  const limite = fim - dias * 86400000;
  return pontos.filter((pt) => pt.t >= limite);
}

function formatarData(t: number, range: string, curto?: boolean) {
  const d = new Date(t);
  if (range === "1D") return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (range === "1S" || range === "1M") return d.toLocaleDateString("pt-BR", { day: "2-digit", month: curto ? "numeric" : "short" });
  return d.toLocaleDateString("pt-BR", { month: "short", year: curto ? "2-digit" : "numeric" });
}

export function GraficosCriptoClient({ dados }: { dados: Dado[] }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [range, setRange] = useState<string>("1M");

  const ativo = aberto ? dados.find((d) => d.cryptoId === aberto) : null;
  const pontosFiltrados = useMemo(() => ativo ? filtrarPorPeriodo(ativo.historico, range) : [], [ativo, range]);
  const variacaoPeriodo = useMemo(() => {
    if (!pontosFiltrados || pontosFiltrados.length < 2) return 0;
    const a = pontosFiltrados[0].p;
    const b = pontosFiltrados[pontosFiltrados.length - 1].p;
    return a === 0 ? 0 : ((b - a) / a) * 100;
  }, [pontosFiltrados]);

  function usdDoAtivo(brl: number, d: Dado): number | null {
    if (!d.precoUsd || !d.precoBrl) return null;
    return brl * (d.precoUsd / d.precoBrl);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Gráficos cripto</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {dados.map((d) => (
          <button
            key={d.cryptoId}
            onClick={() => { setRange("1M"); setAberto(d.cryptoId); }}
            className="text-left rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3 hover:border-zinc-700 transition relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                <span className="font-semibold">{d.symbol}</span>
                <span className="text-xs text-zinc-500">{d.nome}</span>
                <TendenciaBadge tendencia={d.tendencia} />
              </div>
              <div className="flex items-center gap-2">
                {d.score != null && (
                  <span className="text-[10px] font-mono text-zinc-500" title="Score de oportunidade">
                    {d.score}/100
                  </span>
                )}
                <Maximize2 size={14} className="text-zinc-500" />
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-semibold">
                  <Money brl={d.precoBrl} usd={d.precoUsd} />
                </div>
                {d.offline && <div className="text-[10px] text-amber-300 mt-1">offline</div>}
              </div>
              <Sparkline pontos={d.historico.slice(-60)} cor="auto" largura={180} altura={48} />
            </div>

            {/* Métricas extras */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-zinc-800">
              <Metric label="24h" valor={d.variacao24h} />
              <Metric label="7d"  valor={d.variacao7d} />
              <Metric label="30d" valor={d.variacao30d} />
            </div>
            {d.volume24hBrl != null && (
              <div className="text-[10px] text-zinc-500">
                Volume 24h: <Money brl={d.volume24hBrl} usd={usdDoAtivo(d.volume24hBrl, d)} compacto />
              </div>
            )}
          </button>
        ))}
      </div>

      {ativo && (
        <ChartExpandedModal
          open={!!ativo}
          onClose={() => setAberto(null)}
          ticker={ativo.symbol}
          subtitulo={ativo.nome}
          precoAtual={ativo.precoBrl}
          variacao={variacaoPeriodo}
          pontos={pontosFiltrados}
          periodos={PERIODOS}
          rangeAtual={range}
          onTrocarRange={setRange}
          formatarData={formatarData}
        />
      )}
    </div>
  );
}

function Metric({ label, valor }: { label: string; valor: number | null }) {
  if (valor === null) {
    return (
      <div className="bg-zinc-950/40 border border-zinc-800 rounded p-1.5 text-center">
        <div className="text-[9px] text-zinc-500 uppercase">{label}</div>
        <div className="text-xs text-zinc-600">—</div>
      </div>
    );
  }
  const cor = valor >= 0 ? "text-emerald-400" : "text-rose-400";
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded p-1.5 text-center">
      <div className="text-[9px] text-zinc-500 uppercase">{label}</div>
      <div className={`text-xs font-semibold ${cor}`}>
        {valor >= 0 ? "+" : ""}{valor.toFixed(2)}%
      </div>
    </div>
  );
}
