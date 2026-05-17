"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { haptic } from "@/lib/ux/haptic";

const LIMITE_PX = 80;

export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const inicioY = useRef<number | null>(null);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) { inicioY.current = null; return; }
      inicioY.current = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      if (inicioY.current == null || carregando) return;
      const delta = e.touches[0].clientY - inicioY.current;
      if (delta > 0) setPull(Math.min(delta * 0.5, 120));
    }
    async function onTouchEnd() {
      if (inicioY.current == null) return;
      if (pull >= LIMITE_PX && !carregando) {
        setCarregando(true);
        haptic("sucesso");
        try {
          await fetch("/api/mercado/sync?force=1", { method: "POST" });
          router.refresh();
        } finally {
          setTimeout(() => { setCarregando(false); setPull(0); }, 600);
        }
      } else {
        setPull(0);
      }
      inicioY.current = null;
    }
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, carregando, router]);

  if (pull === 0 && !carregando) return null;
  const ativo = pull >= LIMITE_PX || carregando;

  return (
    <div
      className="md:hidden fixed top-0 inset-x-0 flex justify-center pointer-events-none z-40"
      style={{
        transform: `translateY(${Math.min(pull, 100) - 30}px)`,
        opacity: Math.min(1, pull / LIMITE_PX),
      }}
    >
      <div className={`rounded-full bg-zinc-900 border border-zinc-800 p-2.5 shadow-lg ${ativo ? "text-emerald-400" : "text-zinc-400"}`}>
        <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />
      </div>
    </div>
  );
}
