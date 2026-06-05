"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, Activity, Trash2, Pencil } from "lucide-react";
import { brl, pct } from "@/lib/format";
import { useToast } from "@/components/ux/Toast";
import { PushManager } from "@/components/ux/PushManager";
import { PasskeyManager } from "@/components/ux/PasskeyManager";
import { BackupCloud } from "@/components/ux/BackupCloud";

type Cfg = {
  id: string;
  fonteCotacao: string;
  brapiToken: string | null;
  intervaloSyncMin: number;
  dyEstimadoAA: number;
  prazoMetaAnos: number;
  alocacaoAlvo: string | null;
} | null;

type Carteira = { id: string; nome: string; cor: string | null };

const SEGMENTOS_PADRAO: Record<string, number> = {
  "Logística": 0.30,
  "Papel":     0.25,
  "Shoppings": 0.15,
  "Híbrido":   0.15,
  "Outros":    0.15,
};

export function ConfigClient({ cfg, ultimaSync, carteiras }:
  { cfg: Cfg; ultimaSync: string | null; carteiras: Carteira[] }) {
  const router = useRouter();
  const toast = useToast();

  const [fonte, setFonte] = useState(cfg?.fonteCotacao ?? "yahoo");
  const [brapiToken, setBrapiToken] = useState(cfg?.brapiToken ?? "");
  const [intervalo, setIntervalo] = useState(cfg?.intervaloSyncMin ?? 30);
  const [prazoMeta, setPrazoMeta] = useState(cfg?.prazoMetaAnos ?? 10);
  const [dy, setDy] = useState((cfg?.dyEstimadoAA ?? 0.09) * 100);

  let alocInicial: Record<string, number> = SEGMENTOS_PADRAO;
  if (cfg?.alocacaoAlvo) {
    try { alocInicial = JSON.parse(cfg.alocacaoAlvo); } catch {}
  }
  const [aloc, setAloc] = useState(alocInicial);

  const [salvando, setSalvando] = useState(false);
  const [saude, setSaude] = useState<any>(null);

  const totalAloc = Object.values(aloc).reduce((s, v) => s + v, 0);

  async function salvar() {
    setSalvando(true);
    try {
      const r = await fetch("/api/configuracao/completa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fonteCotacao: fonte,
          brapiToken: brapiToken || null,
          intervaloSyncMin: intervalo,
          prazoMetaAnos: prazoMeta,
          dyEstimadoAA: dy / 100,
          alocacaoAlvo: JSON.stringify(aloc),
        }),
      });
      if (!r.ok) { toast("erro", "Falha ao salvar"); return; }
      toast("sucesso", "Configurações salvas");
      router.refresh();
    } finally { setSalvando(false); }
  }

  async function verificarSaude() {
    const r = await fetch("/api/health");
    setSaude(await r.json());
  }

  async function importarJson(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    if (!confirm("Importar este arquivo? Dados existentes serão mesclados (upsert por id).")) {
      input.value = "";
      return;
    }
    try {
      const txt = (await file.text()).trim();
      if (!txt) {
        toast("erro", "Arquivo vazio.");
        return;
      }
      if (!txt.startsWith("{")) {
        toast(
          "erro",
          "Não é um JSON válido. Use o arquivo gerado pelo botão 'Exportar JSON' (ele começa com {).",
        );
        return;
      }
      let json: any;
      try {
        json = JSON.parse(txt);
      } catch {
        toast("erro", "JSON corrompido. Abra em um editor pra ver se foi cortado.");
        return;
      }
      if (json?.versao !== 1) {
        toast("erro", "Formato não reconhecido. Esse arquivo não foi gerado pelo Fundos.");
        return;
      }
      const r = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (!r.ok) {
        const txtErro = await r.text();
        toast("erro", "Servidor recusou: " + txtErro.slice(0, 120));
        return;
      }
      const res = await r.json();
      toast(
        "sucesso",
        `Importado: ${res.importados.ativos} ativos · ${res.importados.lancamentos} lançamentos · ${res.importados.carteiras} carteiras`,
      );
      router.refresh();
    } catch (e: any) {
      toast("erro", "Erro inesperado: " + (e?.message ?? "desconhecido"));
    } finally {
      input.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
          Mercado, meta, alocação alvo, backup e saúde do sistema.
        </p>
      </header>

      {/* Mercado */}
      <section className="card space-y-4">
        <h2 className="font-semibold">Mercado</h2>

        <div>
          <label className="label">Fonte de cotações</label>
          <div className="grid grid-cols-2 gap-2">
            {(["yahoo", "brapi"] as const).map((f) => (
              <button
                type="button" key={f}
                onClick={() => setFonte(f)}
                className={`min-h-[44px] rounded-lg border transition text-sm font-medium ${
                  fonte === f ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 text-zinc-400"
                }`}
              >
                {f === "yahoo" ? "Yahoo (grátis)" : "Brapi (token)"}
              </button>
            ))}
          </div>
        </div>

        {fonte === "brapi" && (
          <div>
            <label className="label">Brapi token</label>
            <input
              className="input"
              type="password"
              autoComplete="off"
              value={brapiToken}
              onChange={(e) => setBrapiToken(e.target.value)}
              placeholder="Cole o token de brapi.dev"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Crie grátis em brapi.dev. Sem token, cai automático para Yahoo.
            </p>
          </div>
        )}

        <div>
          <label className="label">Intervalo automático de sync (min)</label>
          <input
            className="input" type="number" min={5} max={1440}
            value={intervalo}
            onChange={(e) => setIntervalo(Number(e.target.value))}
          />
          <p className="text-[10px] text-zinc-500 mt-1">
            Última sync: {ultimaSync ? new Date(ultimaSync).toLocaleString("pt-BR") : "—"}
          </p>
        </div>
      </section>

      {/* Meta */}
      <section className="card space-y-4">
        <h2 className="font-semibold">Meta</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Prazo ideal para meta (anos)</label>
            <input className="input" type="number" min={1} max={50}
                   value={prazoMeta}
                   onChange={(e) => setPrazoMeta(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">DY anual estimado (%)</label>
            <input className="input" type="number" step="0.1"
                   value={dy.toFixed(1)}
                   onChange={(e) => setDy(Number(e.target.value))} />
          </div>
        </div>
      </section>

      {/* Alocação alvo */}
      <section className="card space-y-4">
        <div className="flex justify-between items-baseline">
          <h2 className="font-semibold">Alocação alvo por segmento</h2>
          <span className={`text-xs ${Math.abs(totalAloc - 1) < 0.01 ? "text-emerald-400" : "text-amber-400"}`}>
            Total: {pct(totalAloc)}
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          Usada nas sugestões de rebalanceamento. Pode editar pesos e adicionar segmentos.
        </p>
        <div className="space-y-3">
          {Object.entries(aloc).map(([seg, peso]) => (
            <div key={seg} className="flex items-center gap-3">
              <span className="w-24 text-sm">{seg}</span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={peso}
                onChange={(e) => setAloc({ ...aloc, [seg]: Number(e.target.value) })}
                className="flex-1 accent-emerald-500"
              />
              <span className="w-12 text-right text-sm tabular-nums">{pct(peso, 0)}</span>
              <button
                onClick={() => { const { [seg]: _, ...rest } = aloc; setAloc(rest); }}
                className="text-zinc-500 hover:text-rose-400 p-1"
                aria-label="Remover"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const nome = prompt("Nome do segmento:");
            if (nome) setAloc({ ...aloc, [nome]: 0 });
          }}
          className="btn-ghost border border-zinc-800 text-xs"
        >
          + Adicionar segmento
        </button>
      </section>

      {/* Carteiras */}
      <section className="card">
        <h2 className="font-semibold mb-3">Carteiras</h2>
        <div className="space-y-2">
          {carteiras.map((c) => (
            <CarteiraItem key={c.id} c={c} podeRemover={carteiras.length > 1} onChange={() => router.refresh()} />
          ))}
        </div>
      </section>

      {/* Backup cloud (rclone) */}
      <BackupCloud />

      {/* Export / Import manual */}
      <section className="card space-y-4">
        <h2 className="font-semibold">Backup manual</h2>
        <p className="text-xs text-zinc-500">
          Para migração ou backup pontual. Para automático use a seção acima.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <a href="/api/export" className="btn-ghost border border-zinc-800 justify-center" download>
            <Download size={14} /> Exportar JSON
          </a>
          <label className="btn-ghost border border-zinc-800 justify-center cursor-pointer">
            <Upload size={14} /> Importar JSON
            <input type="file" accept="application/json" className="hidden" onChange={importarJson} />
          </label>
        </div>
      </section>

      {/* Notificações push */}
      <section className="card space-y-3">
        <h2 className="font-semibold">Notificações push</h2>
        <p className="text-xs text-zinc-500">
          Receba uma notificação no iPhone quando um dividendo entrar.
          Requer instalar o app via &quot;Adicionar à Tela de Início&quot; (Safari iOS 16.4+).
        </p>
        <PushManager />
      </section>

      <PasskeyManager />

      {/* Saúde */}
      <section className="card space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Saúde do sistema</h2>
          <button onClick={verificarSaude} className="btn-ghost border border-zinc-800 text-xs">
            <Activity size={12} /> Verificar
          </button>
        </div>
        {saude && (
          <pre className="text-[10px] bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-x-auto">
{JSON.stringify(saude, null, 2)}
          </pre>
        )}
      </section>

      <div className="flex justify-end pt-2">
        <button className="btn" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}

function CarteiraItem({ c, podeRemover, onChange }:
  { c: Carteira; podeRemover: boolean; onChange: () => void }) {
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(c.nome);
  const [cor, setCor] = useState(c.cor ?? "#10b981");

  async function salvar() {
    const r = await fetch(`/api/carteiras/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, cor }),
    });
    if (!r.ok) { toast("erro", await r.text()); return; }
    setEditando(false);
    toast("sucesso", "Carteira atualizada");
    onChange();
  }

  async function excluir() {
    if (!confirm(`Excluir carteira "${c.nome}"? Os lançamentos serão preservados sem vínculo.`)) return;
    const r = await fetch(`/api/carteiras/${c.id}`, { method: "DELETE" });
    if (!r.ok) { toast("erro", await r.text()); return; }
    toast("sucesso", "Carteira excluída");
    onChange();
  }

  return editando ? (
    <div className="flex gap-2 items-center">
      <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-9 w-12 bg-transparent border border-zinc-800 rounded" />
      <input className="input flex-1" value={nome} onChange={(e) => setNome(e.target.value)} />
      <button onClick={salvar} className="btn !min-h-0 !py-1.5 !px-3">OK</button>
      <button onClick={() => setEditando(false)} className="btn-ghost text-xs">Cancelar</button>
    </div>
  ) : (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ background: c.cor ?? "#10b981" }} />
        <span className="font-medium">{c.nome}</span>
      </div>
      <div className="flex gap-1">
        <button onClick={() => setEditando(true)} className="btn-ghost !p-1.5"><Pencil size={14} /></button>
        {podeRemover && (
          <button onClick={excluir} className="btn-danger !p-1.5"><Trash2 size={14} /></button>
        )}
      </div>
    </div>
  );
}
