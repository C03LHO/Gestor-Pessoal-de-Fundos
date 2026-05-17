"use client";
import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ux/Toast";

type Status = {
  rcloneInstalado: boolean;
  rcloneCaminhoDetectado: string | null;
  rcloneCaminhoCustom: string | null;
  remotesDisponiveis: string[];
  habilitado: boolean;
  remote: string | null;
  horario: number;
  retencaoDias: number;
  ultimoEm: string | null;
  ultimoStatus: string | null;
  ultimoArquivo: string | null;
};

export function BackupCloud() {
  const toast = useToast();
  const [s, setS] = useState<Status | null>(null);
  const [habilitado, setHabilitado] = useState(false);
  const [remote, setRemote] = useState("");
  const [horario, setHorario] = useState(23);
  const [retencao, setRetencao] = useState(30);
  const [rcloneCustom, setRcloneCustom] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [executando, setExecutando] = useState(false);

  async function carregar() {
    const r = await fetch("/api/backup/status");
    const j: Status = await r.json();
    setS(j);
    setHabilitado(j.habilitado);
    setRemote(j.remote ?? "");
    setHorario(j.horario);
    setRetencao(j.retencaoDias);
    setRcloneCustom(j.rcloneCaminhoCustom ?? "");
  }

  useEffect(() => { carregar(); }, []);

  async function salvar() {
    setSalvando(true);
    try {
      const r = await fetch("/api/backup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habilitado,
          remote: remote.trim() || null,
          horario,
          retencaoDias: retencao,
          rcloneCaminho: rcloneCustom.trim() || null,
        }),
      });
      if (!r.ok) { toast("erro", "Falha ao salvar"); return; }
      toast("sucesso", habilitado ? "Backup automático ativado" : "Configuração salva");
      await carregar();
    } finally { setSalvando(false); }
  }

  async function backupAgora() {
    setExecutando(true);
    try {
      const r = await fetch("/api/backup/agora", { method: "POST" });
      const j = await r.json();
      if (j.ok) toast("sucesso", `Backup enviado: ${j.arquivo}`);
      else toast("erro", j.erro ?? "Falha");
      await carregar();
    } finally { setExecutando(false); }
  }

  if (!s) {
    return (
      <section className="card">
        <div className="skel h-6 w-40 mb-2" />
        <div className="skel h-4 w-72" />
      </section>
    );
  }

  return (
    <section className="card space-y-4">
      <div className="flex justify-between items-baseline gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Cloud size={18} className={s.habilitado && s.remote ? "text-emerald-400" : "text-zinc-500"} />
          <h2 className="font-semibold">Backup automático na nuvem</h2>
        </div>
        <span className={cn(
          "text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded",
          s.habilitado && s.remote
            ? "bg-emerald-500/15 text-emerald-300"
            : "bg-zinc-700/40 text-zinc-400",
        )}>
          {s.habilitado && s.remote ? "Ativo" : "Inativo"}
        </span>
      </div>

      {!s.rcloneInstalado ? (
        <PassoInstalarRclone
          rcloneCustom={rcloneCustom}
          setRcloneCustom={setRcloneCustom}
          salvar={salvar}
        />
      ) : s.remotesDisponiveis.length === 0 ? (
        <PassoConfigurarRclone caminho={s.rcloneCaminhoDetectado} />
      ) : (
        <>
          {s.rcloneCaminhoDetectado && (
            <p className="text-[10px] text-zinc-500">
              rclone: <code className="text-emerald-400">{s.rcloneCaminhoDetectado}</code>
            </p>
          )}
          <div>
            <label className="label">Destino (remote configurado)</label>
            <div className="grid grid-cols-1 gap-2">
              {s.remotesDisponiveis.map((r) => (
                <RemoteOpcao
                  key={r} remote={r} selecionado={remote.startsWith(r)}
                  onSelect={(v) => setRemote(v)}
                />
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">
              Os arquivos vão para a pasta digitada no campo. Ex: <code className="text-zinc-300">gdrive:Fundos-Backup</code>
            </p>
            <input
              className="input mt-2"
              placeholder="gdrive:Fundos-Backup"
              value={remote}
              onChange={(e) => setRemote(e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Hora diária</label>
              <select className="input" value={horario} onChange={(e) => setHorario(Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Retenção (dias)</label>
              <input type="number" min={1} max={3650}
                     className="input"
                     value={retencao}
                     onChange={(e) => setRetencao(Number(e.target.value))} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={habilitado} onChange={(e) => setHabilitado(e.target.checked)} />
            <span>Ativar backup diário automático</span>
          </label>

          <div className="flex justify-between items-center gap-2 flex-wrap pt-2 border-t border-zinc-800">
            <div className="text-xs">
              {s.ultimoEm ? (
                <>
                  <span className="text-zinc-500">Último: </span>
                  <span className={s.ultimoStatus === "ok" ? "text-emerald-400" : "text-rose-400"}>
                    {s.ultimoStatus === "ok"
                      ? <><Check size={11} className="inline" /> ok em {new Date(s.ultimoEm).toLocaleString("pt-BR")}</>
                      : <><AlertTriangle size={11} className="inline" /> {s.ultimoStatus}</>}
                  </span>
                </>
              ) : (
                <span className="text-zinc-500">Nenhum backup ainda</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={backupAgora} disabled={executando || !remote.trim()}
                      className="btn-ghost border border-zinc-800">
                <RefreshCw size={14} className={executando ? "animate-spin" : ""} />
                {executando ? "Enviando..." : "Backup agora"}
              </button>
              <button onClick={salvar} disabled={salvando} className="btn">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function RemoteOpcao({ remote, selecionado, onSelect }:
  { remote: string; selecionado: boolean; onSelect: (v: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(`${remote}Fundos-Backup`)}
      className={cn(
        "text-left px-3 py-2 rounded-lg border text-sm transition",
        selecionado
          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
          : "border-zinc-800 text-zinc-300 hover:border-zinc-700",
      )}
    >
      <span className="font-mono">{remote}</span>
      <span className="text-zinc-500 ml-2">→ usar como destino</span>
    </button>
  );
}

function PassoInstalarRclone({ rcloneCustom, setRcloneCustom, salvar }:
  { rcloneCustom: string; setRcloneCustom: (s: string) => void; salvar: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-sm">
        <CloudOff size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-medium">rclone não encontrado no PATH</div>
          <p className="text-xs text-zinc-500 mt-1">
            Pode estar instalado mas em pasta fora do PATH (caso do <code>winget</code>).
            Veja as opções abaixo.
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg p-3 space-y-3 text-xs">
        <div>
          <div className="text-zinc-300 font-semibold mb-1">Opção A — Informar o caminho do rclone</div>
          <p className="text-zinc-500 mb-2">
            Se já instalou (ex: via winget), busque o <code>rclone.exe</code> no PC e cole o caminho:
          </p>
          <input
            value={rcloneCustom}
            onChange={(e) => setRcloneCustom(e.target.value)}
            placeholder="C:\Users\...\rclone.exe"
            className="input text-xs font-mono"
          />
          <p className="text-[10px] text-zinc-500 mt-1">
            Local típico do winget:{" "}
            <code className="text-zinc-300">
              %LOCALAPPDATA%\Microsoft\WinGet\Packages\Rclone.Rclone_*\rclone-v*-windows-amd64\rclone.exe
            </code>
          </p>
          <button onClick={salvar} className="btn mt-2">Salvar caminho</button>
        </div>

        <div className="border-t border-zinc-800 pt-3">
          <div className="text-zinc-300 font-semibold mb-1">Opção B — Instalar (se ainda não fez)</div>
          <div className="mb-2">
            <div className="text-zinc-400">Windows:</div>
            <code className="text-emerald-300 block">winget install Rclone.Rclone</code>
          </div>
          <div>
            <div className="text-zinc-400">Linux / Umbrel:</div>
            <code className="text-emerald-300 block">curl https://rclone.org/install.sh | sudo bash</code>
          </div>
          <a
            href="https://rclone.org/downloads/" target="_blank" rel="noreferrer"
            className="text-emerald-400 underline inline-flex items-center gap-1 text-xs mt-2"
          >
            Outros sistemas <ExternalLink size={10} />
          </a>
        </div>
      </div>
      <p className="text-[10px] text-zinc-500">
        Após informar o caminho OU instalar, recarregue esta página.
      </p>
    </div>
  );
}

function PassoConfigurarRclone({ caminho }: { caminho: string | null }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-sm">
        <Cloud size={16} className="text-sky-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-medium">
            rclone instalado ({caminho ?? "no PATH"}), mas sem provedor configurado
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Configure um provedor uma vez (Google Drive, OneDrive, Dropbox...):
          </p>
        </div>
      </div>
      <div className="bg-zinc-900 rounded-lg p-3 text-xs space-y-2">
        <div className="text-zinc-400">No terminal do servidor, rode:</div>
        <code className="text-emerald-300 block">rclone config</code>
        <div className="text-zinc-500 leading-relaxed mt-2">
          1. <kbd>n</kbd> = novo<br />
          2. Nome: <code className="text-zinc-300">gdrive</code> (Google Drive) ou <code className="text-zinc-300">onedrive</code><br />
          3. Tipo: <code className="text-zinc-300">drive</code> (16) ou <code className="text-zinc-300">onedrive</code> (28)<br />
          4. Aceite os defaults, autorize no browser quando abrir.<br />
          5. Confirme. Pronto.
        </div>
        <div className="pt-2 mt-2 border-t border-zinc-800 text-zinc-500">
          Documentação:{" "}
          <a className="text-emerald-400 underline" href="https://rclone.org/drive/" target="_blank" rel="noreferrer">Google Drive</a>{" · "}
          <a className="text-emerald-400 underline" href="https://rclone.org/onedrive/" target="_blank" rel="noreferrer">OneDrive</a>{" · "}
          <a className="text-emerald-400 underline" href="https://rclone.org/dropbox/" target="_blank" rel="noreferrer">Dropbox</a>
        </div>
      </div>
      <p className="text-[10px] text-zinc-500">
        Após configurar, recarregue esta página — os remotes aparecem aqui automaticamente.
      </p>
    </div>
  );
}
