"use client";
import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { mensagemErro } from "@/lib/erro-api";

export function LoginPasskey() {
  const [suporta, setSuporta] = useState(false);

  useEffect(() => {
    setSuporta(typeof window !== "undefined" && "PublicKeyCredential" in window);
  }, []);

  async function entrar() {
    try {
      const opts = await (await fetch("/api/auth/passkey/auth/options", { method: "POST" })).json();
      const challengeId = opts.challengeId;
      delete opts.challengeId;
      const auth = await startAuthentication({ optionsJSON: opts });
      const r = await fetch("/api/auth/passkey/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, response: auth }),
      });
      if (!r.ok) { alert("Falha: " + (await mensagemErro(r))); return; }
      window.location.href = "/";
    } catch (e: any) {
      if (e?.name === "NotAllowedError") return; // user cancelou
      alert("Erro: " + (e?.message ?? "desconhecido"));
    }
  }

  if (!suporta) return null;

  return (
    <button
      type="button"
      onClick={entrar}
      className="w-full min-h-[44px] rounded-lg border border-zinc-700 text-zinc-200 font-medium flex items-center justify-center gap-2 hover:bg-zinc-900 active:bg-zinc-800"
    >
      <Fingerprint size={16} />
      Entrar com Face ID
    </button>
  );
}
