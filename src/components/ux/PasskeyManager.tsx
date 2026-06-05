"use client";
import { useEffect, useState } from "react";
import { Fingerprint, Trash2 } from "lucide-react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { useToast } from "@/components/ux/Toast";
import { dataBR } from "@/lib/format";
import { mensagemErro } from "@/lib/erro-api";

type Passkey = { id: string; rotulo: string | null; criadoEm: string; ultimoUsoEm: string | null };

export function PasskeyManager() {
  const toast = useToast();
  const [lista, setLista] = useState<Passkey[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [suporta, setSuporta] = useState(false);

  useEffect(() => {
    setSuporta(typeof window !== "undefined" && "PublicKeyCredential" in window);
    carregar();
  }, []);

  async function carregar() {
    try {
      const r = await fetch("/api/auth/passkey/list");
      if (!r.ok) return;
      setLista(await r.json());
    } catch {}
  }

  async function registrar() {
    setCarregando(true);
    try {
      const opts = await (await fetch("/api/auth/passkey/register/options", { method: "POST" })).json();
      const challengeId = opts.challengeId;
      delete opts.challengeId;

      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: opts });
      } catch (e: any) {
        if (e?.name === "InvalidStateError") {
          toast("info", "Esse dispositivo já tem um passkey registrado.");
          return;
        }
        if (e?.name === "SecurityError" || e?.message?.includes("origin")) {
          toast(
            "erro",
            "Passkey requer HTTPS (ou localhost). Configure rpOrigin em Configurações ou use Tailscale Serve.",
          );
          return;
        }
        throw e;
      }

      const rotulo = prompt("Apelido pra esse passkey:", "iPhone");
      const r = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, response: attResp, rotulo }),
      });
      if (!r.ok) { toast("erro", await mensagemErro(r)); return; }
      toast("sucesso", "Passkey criado");
      await carregar();
    } catch (e: any) {
      toast("erro", "Falha: " + (e?.message ?? "desconhecido"));
    } finally { setCarregando(false); }
  }

  async function excluir(id: string) {
    if (!confirm("Remover esse passkey? Esse dispositivo precisará usar senha pra entrar.")) return;
    const r = await fetch(`/api/auth/passkey/${id}`, { method: "DELETE" });
    if (r.ok || r.status === 204) { toast("sucesso", "Passkey removido"); carregar(); }
  }

  return (
    <section className="card space-y-4">
      <div className="flex justify-between items-baseline gap-2 flex-wrap">
        <h2 className="font-semibold">Passkeys (Face ID / biometria)</h2>
        <button onClick={registrar} disabled={!suporta || carregando} className="btn">
          <Fingerprint size={14} /> {carregando ? "Aguarde..." : "Adicionar passkey"}
        </button>
      </div>

      {!suporta && (
        <p className="text-xs text-rose-400">
          Este navegador não suporta WebAuthn.
        </p>
      )}

      <p className="text-[11px] text-zinc-500">
        Passkeys precisam de HTTPS. Em HTTP via Tailscale, ative <code className="text-zinc-300">tailscale serve</code>
        no servidor para ter URL HTTPS válida.
      </p>

      {lista.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum passkey registrado.</p>
      ) : (
        <div className="space-y-2">
          {lista.map((p) => (
            <div key={p.id} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
              <div>
                <div className="font-medium text-sm">{p.rotulo ?? "Sem nome"}</div>
                <div className="text-[10px] text-zinc-500">
                  Criado em {dataBR(p.criadoEm)}
                  {p.ultimoUsoEm && ` · último uso ${dataBR(p.ultimoUsoEm)}`}
                </div>
              </div>
              <button onClick={() => excluir(p.id)} className="btn-danger !p-1.5">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
