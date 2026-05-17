"use client";
import { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function GlobalError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center">
        <AlertOctagon size={32} className="text-rose-400 mx-auto mb-3" />
        <h1 className="text-xl font-semibold mb-1">Algo deu errado</h1>
        <p className="text-sm text-zinc-400 mb-4">
          O servidor encontrou um erro ao processar essa página.
        </p>
        {error.digest && (
          <p className="text-[10px] text-zinc-600 mb-4 font-mono">id: {error.digest}</p>
        )}
        <div className="flex justify-center gap-2">
          <button onClick={reset} className="btn">
            <RotateCcw size={14} /> Tentar de novo
          </button>
          <a href="/" className="btn-ghost border border-zinc-800">
            Início
          </a>
        </div>
      </div>
    </div>
  );
}
