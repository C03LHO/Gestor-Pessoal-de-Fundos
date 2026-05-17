import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center">
        <Compass size={32} className="text-zinc-500 mx-auto mb-3" />
        <h1 className="text-xl font-semibold mb-1">Página não encontrada</h1>
        <p className="text-sm text-zinc-400 mb-4">
          O endereço que você abriu não existe.
        </p>
        <Link href="/" className="btn inline-flex">Voltar ao início</Link>
      </div>
    </div>
  );
}
