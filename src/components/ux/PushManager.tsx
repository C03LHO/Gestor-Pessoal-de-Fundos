"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useToast } from "@/components/ux/Toast";
import { haptic } from "@/lib/ux/haptic";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushManager() {
  const toast = useToast();
  const [estado, setEstado] = useState<"loading" | "indisponivel" | "negado" | "inativo" | "ativo">("loading");

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEstado("indisponivel"); return;
      }
      if (Notification.permission === "denied") { setEstado("negado"); return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setEstado(sub ? "ativo" : "inativo");
      } catch { setEstado("indisponivel"); }
    })();
  }, []);

  async function ativar() {
    haptic("leve");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setEstado("negado"); toast("erro", "Permissão negada"); return; }

      const reg = await navigator.serviceWorker.ready;
      const { vapidPublicKey } = await (await fetch("/api/push/vapid")).json();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
      const j = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: j.endpoint,
          keys: { p256dh: j.keys?.p256dh, auth: j.keys?.auth },
          rotulo: navigator.userAgent.slice(0, 60),
        }),
      });
      setEstado("ativo");
      toast("sucesso", "Notificações ativadas. Você receberá quando um dividendo cair.");
    } catch (e: any) {
      toast("erro", "Falha: " + (e?.message ?? "desconhecido"));
    }
  }

  async function desativar() {
    haptic("leve");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" });
        await sub.unsubscribe();
      }
      setEstado("inativo");
      toast("info", "Notificações desativadas");
    } catch (e: any) {
      toast("erro", "Falha: " + (e?.message ?? "desconhecido"));
    }
  }

  async function testar() {
    await fetch("/api/push/test", { method: "POST" });
    toast("info", "Push de teste enviado");
  }

  if (estado === "loading")
    return <p className="text-xs text-zinc-500">Verificando suporte...</p>;
  if (estado === "indisponivel")
    return (
      <p className="text-xs text-zinc-500">
        Push não disponível neste dispositivo/navegador. No iPhone, instale o app
        via "Adicionar à Tela de Início" (Safari 16.4+) e abra a partir do ícone.
      </p>
    );
  if (estado === "negado")
    return (
      <p className="text-xs text-rose-400">
        Permissão negada. Habilite nas configurações do iPhone: Ajustes → Notificações → Fundos.
      </p>
    );
  if (estado === "inativo")
    return (
      <button onClick={ativar} className="btn">
        <Bell size={14} /> Ativar notificações
      </button>
    );
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={testar} className="btn-ghost border border-zinc-800">
        <Bell size={14} /> Enviar teste
      </button>
      <button onClick={desativar} className="btn-danger border border-zinc-800">
        <BellOff size={14} /> Desativar
      </button>
    </div>
  );
}
