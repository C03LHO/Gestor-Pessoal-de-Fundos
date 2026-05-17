"use client";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { haptic } from "@/lib/ux/haptic";

const CHAVE = "fundos.anonimizar";

export function AnonimizarToggle() {
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    const sal = localStorage.getItem(CHAVE);
    if (sal === "1") aplicar(true);
  }, []);

  function aplicar(v: boolean) {
    setOculto(v);
    if (v) document.documentElement.classList.add("anonimizar");
    else document.documentElement.classList.remove("anonimizar");
    localStorage.setItem(CHAVE, v ? "1" : "0");
  }

  return (
    <button
      onClick={() => { aplicar(!oculto); haptic("leve"); }}
      className="btn-ghost border border-zinc-800 !p-2"
      aria-label={oculto ? "Mostrar valores" : "Ocultar valores"}
      title={oculto ? "Mostrar valores" : "Ocultar valores"}
    >
      {oculto ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );
}
