"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Check, X, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type Toast = { id: number; tipo: "sucesso" | "erro" | "info" | "alerta"; msg: string };
type Ctx = (tipo: Toast["tipo"], msg: string) => void;
const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  return ctx ?? (() => {});
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const adicionar = useCallback<Ctx>((tipo, msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tipo, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={adicionar}>
      {children}
      <div
        className="fixed top-4 inset-x-0 z-[80] flex flex-col items-center gap-2 pointer-events-none px-4"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto rounded-xl border px-4 py-3 shadow-2xl backdrop-blur flex items-start gap-3 max-w-md w-full animate-toast",
              t.tipo === "sucesso" && "bg-emerald-950/90 border-emerald-500/50 text-emerald-100",
              t.tipo === "erro"    && "bg-rose-950/90 border-rose-500/50 text-rose-100",
              t.tipo === "alerta"  && "bg-amber-950/90 border-amber-500/50 text-amber-100",
              t.tipo === "info"    && "bg-zinc-900/95 border-zinc-700 text-zinc-100",
            )}
          >
            {t.tipo === "sucesso" && <Check size={16} className="shrink-0 mt-0.5" />}
            {t.tipo === "erro"    && <X size={16} className="shrink-0 mt-0.5" />}
            {t.tipo === "alerta"  && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
            {t.tipo === "info"    && <Info size={16} className="shrink-0 mt-0.5" />}
            <div className="text-sm leading-snug">{t.msg}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
