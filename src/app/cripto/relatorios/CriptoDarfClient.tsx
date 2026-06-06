"use client";
import { useEffect, useState } from "react";
import { brl } from "@/lib/format";

type Resultado = {
  ano: number;
  mes: number;
  operacoes: { data: string; symbol: string; qtd: number; valorVenda: number; pm: number; lucro: number }[];
  totalVendasMes: number;
  lucroTotalMes: number;
  isento: boolean;
  limiteIsencao: number;
  aliquota: number;
  darf: number;
  obs: string;
};

export function CriptoDarfClient() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [res, setRes] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function calcular() {
    setCarregando(true);
    try {
      const r = await fetch(`/api/cripto/darf?ano=${ano}&mes=${mes}`);
      setRes(await r.json());
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { calcular(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Relatórios — Cripto</h1>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
          Apuração mensal de IR sobre venda de criptoativos.
        </p>
      </header>

      <section className="card">
        <h2 className="font-semibold mb-1">DARF mensal (vendas de cripto)</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Isenção quando o total de vendas no mês fica abaixo de R$ 35.000. Acima disso, IR de 15%
          sobre o lucro. DARF código 4600, vencimento no último dia útil do mês seguinte.
        </p>

        <div className="flex gap-2 items-end flex-wrap mb-4">
          <div>
            <label className="label">Mês</label>
            <select className="input !w-auto" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ano</label>
            <input className="input !w-24" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
          </div>
          <button className="btn" onClick={calcular} disabled={carregando}>
            {carregando ? "Calculando..." : "Calcular"}
          </button>
        </div>

        {res && (
          <div className="space-y-3">
            {res.operacoes.length === 0 ? (
              <p className="text-sm text-zinc-500">Sem vendas no período.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table min-w-[480px]">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Ativo</th>
                        <th className="text-right">Qtd</th>
                        <th className="text-right">Venda</th>
                        <th className="text-right">PM</th>
                        <th className="text-right">Lucro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.operacoes.map((o, i) => (
                        <tr key={i}>
                          <td className="text-zinc-400">{o.data}</td>
                          <td className="font-medium">{o.symbol}</td>
                          <td className="text-right">{o.qtd}</td>
                          <td className="text-right">{brl(o.valorVenda)}</td>
                          <td className="text-right">{brl(o.pm)}</td>
                          <td className={`text-right font-medium ${o.lucro >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {brl(o.lucro)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-zinc-800 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Total vendido no mês</div>
                    <div className="text-xl font-semibold tabular-nums">{brl(res.totalVendasMes)}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Lucro total</div>
                    <div className={`text-xl font-semibold tabular-nums ${res.lucroTotalMes >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {brl(res.lucroTotalMes)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {res.isento ? "Situação" : "DARF devida"}
                    </div>
                    <div className={`text-xl font-semibold tabular-nums ${res.isento ? "text-emerald-400" : res.darf > 0 ? "text-amber-400" : ""}`}>
                      {res.isento ? "Isento" : brl(res.darf)}
                    </div>
                  </div>
                </div>
              </>
            )}
            <p className="text-[11px] text-zinc-500">{res.obs}</p>
          </div>
        )}
      </section>
    </div>
  );
}
