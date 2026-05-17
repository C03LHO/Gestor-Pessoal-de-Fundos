"use client";
import { useRef, useState, ReactNode } from "react";
import { Trash2 } from "lucide-react";

const LIMITE = 80;

export function SwipeCard({
  children, onDelete,
}: { children: ReactNode; onDelete: () => void }) {
  const inicio = useRef<number | null>(null);
  const [dx, setDx] = useState(0);

  function start(e: React.TouchEvent) { inicio.current = e.touches[0].clientX; }
  function move(e: React.TouchEvent) {
    if (inicio.current == null) return;
    const d = e.touches[0].clientX - inicio.current;
    if (d < 0) setDx(Math.max(d, -120));
  }
  function end() {
    if (dx <= -LIMITE) onDelete();
    setDx(0);
    inicio.current = null;
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-center px-5 bg-rose-500/15 text-rose-300">
        <Trash2 size={18} />
      </div>
      <div
        className="relative transition-transform"
        style={{ transform: `translateX(${dx}px)` }}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      >
        {children}
      </div>
    </div>
  );
}
