"use client";
import { Printer } from "lucide-react";

export function ImprimirBtn() {
  return (
    <button onClick={() => window.print()} className="btn print:hidden">
      <Printer size={16} /> Imprimir / Salvar PDF
    </button>
  );
}
