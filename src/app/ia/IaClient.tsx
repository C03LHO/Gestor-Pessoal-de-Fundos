"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles, Send, Settings, Loader2 } from "lucide-react";
import { useToast } from "@/components/ux/Toast";

const SUGESTOES = [
  "Análise geral da minha carteira",
  "Qual FII da watchlist comprar primeiro com R$ 1.000?",
  "Como está minha aderência à meta?",
  "Quais riscos eu tenho de concentração?",
  "Como diversificar para reduzir risco?",
  "Qual o impacto se eu dobrar o aporte?",
];

export function IaClient({ configurada, provedor }: { configurada: boolean; provedor: string | null }) {
  const toast = useToast();
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function analisar(perguntaCustom?: string) {
    const p = perguntaCustom ?? pergunta;
    setCarregando(true);
    setResposta(null);
    try {
      const r = await fetch("/api/ia/analise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: p }),
      });
      const j = await r.json();
      if (!r.ok) { toast("erro", j?.erro ?? "Falha"); return; }
      setResposta(j.resposta);
      if (perguntaCustom) setPergunta("");
    } catch (e: any) {
      toast("erro", e?.message);
    } finally { setCarregando(false); }
  }

  if (!configurada) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles size={22} className="text-amber-300" /> Análise por IA
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
            Configure um provedor gratuito para começar.
          </p>
        </header>

        <section className="card space-y-3">
          <h2 className="font-semibold">Como ativar (1 minuto)</h2>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <div className="font-medium">Crie uma chave gratuita</div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  <strong className="text-zinc-300">Gemini</strong> (recomendado): vá em{" "}
                  <a className="text-emerald-400 underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>
                  {" "}— gere uma chave. Sem cartão. Limite generoso.
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  <strong className="text-zinc-300">Groq</strong> (alternativa, Llama):{" "}
                  <a className="text-emerald-400 underline" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com/keys</a>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <div className="font-medium">Cole em Configurações</div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Vai em <Link href="/configuracoes" className="text-emerald-400 underline">/configuracoes</Link>,
                  rola até "Inteligência artificial" e cola a chave.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <div className="font-medium">Volte aqui e pergunte</div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  A IA recebe sua carteira, oportunidades, meta e histórico, e responde com base nesses números.
                </p>
              </div>
            </li>
          </ol>
          <Link href="/configuracoes" className="btn inline-flex w-fit">
            <Settings size={14} /> Abrir Configurações
          </Link>
        </section>

        <section className="card text-xs text-zinc-500 space-y-2">
          <div className="font-medium text-zinc-300">Sobre privacidade</div>
          <p>
            Quando você fizer uma pergunta, o app envia os seus números (patrimônio, posições, dividendos, watchlist)
            ao provedor escolhido. Nada de identidade pessoal vai junto.
          </p>
          <p>
            Gemini e Groq <strong>podem usar prompts para treinamento</strong> no plano gratuito. Se isso te incomoda,
            crie uma chave do plano pago (custo baixo, ainda fica em centavos).
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Sparkles size={22} className="text-amber-300" /> Análise por IA
        </h1>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
          Provedor: <span className="text-zinc-300 font-medium uppercase">{provedor}</span>
        </p>
      </header>

      <section className="card space-y-3">
        <label className="label">Pergunte qualquer coisa sobre sua carteira</label>
        <div className="flex gap-2">
          <textarea
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Ex.: qual FII da watchlist devo priorizar este mês?"
            rows={3}
            className="input flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analisar();
            }}
          />
        </div>
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <p className="text-[10px] text-zinc-500">Ctrl+Enter para enviar</p>
          <button onClick={() => analisar()} disabled={carregando} className="btn">
            {carregando ? <><Loader2 size={14} className="animate-spin" /> Pensando...</> : <><Send size={14} /> Enviar</>}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-full mb-1">Sugestões rápidas:</span>
          {SUGESTOES.map((s) => (
            <button
              key={s}
              onClick={() => analisar(s)}
              disabled={carregando}
              className="text-xs px-2.5 py-1.5 rounded-full border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 active:bg-zinc-900 disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {resposta && (
        <section className="card">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <Sparkles size={14} className="text-amber-300" /> Resposta
          </h2>
          <div className="prose-fundos">
            {resposta.split("\n").map((linha, i) => (
              <p key={i} className="mb-2 text-sm leading-relaxed whitespace-pre-wrap">
                {formatLinha(linha)}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatLinha(linha: string) {
  // negrito **texto**
  const partes = linha.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} className="text-zinc-100">{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}
