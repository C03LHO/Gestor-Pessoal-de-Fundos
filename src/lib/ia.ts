import { prisma } from "./prisma";

/**
 * Wrapper para múltiplos provedores de IA gratuitos.
 *
 * Gemini: aistudio.google.com — free tier generoso, sem necessidade de cartão.
 * Groq: console.groq.com — Llama 3.x grátis com limite alto.
 */

type Provedor = "gemini" | "groq";

export async function consultarIA(prompt: string, system?: string): Promise<string> {
  const cfg = await prisma.configuracao.findFirst();
  if (!cfg?.iaProvedor || !cfg?.iaApiKey) {
    throw new Error("IA não configurada. Configure provedor e API key em Configurações.");
  }
  const prov = cfg.iaProvedor as Provedor;
  const modelo = cfg.iaModelo;

  if (prov === "gemini") return chamarGemini(cfg.iaApiKey, modelo ?? "gemini-2.0-flash-exp", prompt, system);
  if (prov === "groq")   return chamarGroq(cfg.iaApiKey, modelo ?? "llama-3.3-70b-versatile", prompt, system);
  throw new Error(`Provedor não suportado: ${prov}`);
}

async function chamarGemini(apiKey: string, modelo: string, prompt: string, system?: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error("Gemini falhou: " + txt.slice(0, 200));
  }
  const j: any = await r.json();
  return j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sem resposta.";
}

async function chamarGroq(apiKey: string, modelo: string, prompt: string, system?: string): Promise<string> {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelo,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2048,
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error("Groq falhou: " + txt.slice(0, 200));
  }
  const j: any = await r.json();
  return j?.choices?.[0]?.message?.content ?? "Sem resposta.";
}
