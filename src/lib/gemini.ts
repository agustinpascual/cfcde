import "server-only";
import { ler } from "./config-integracoes";

/* Cliente do Gemini por HTTP puro — não vale puxar um SDK inteiro para uma
   chamada só numa rota de servidor. A chave sai do cofre (painel) ou do
   ambiente, igual às outras integrações. */

const MODELO = "gemini-2.5-flash";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

export type Turno = { papel: "user" | "model"; texto: string };

export async function temGemini(): Promise<boolean> {
  return Boolean(await ler("GEMINI_API_KEY"));
}

/**
 * Manda a conversa para o Gemini e devolve o texto.
 * `null` quando não há chave, a API falha ou a resposta vem vazia — quem
 * chama decide o que fazer, em vez de receber uma string inventada.
 */
export async function perguntarGemini(
  sistema: string,
  turnos: Turno[],
  maxTokens = 512
): Promise<string | null> {
  const chave = await ler("GEMINI_API_KEY");
  if (!chave || turnos.length === 0) return null;

  try {
    const res = await fetch(`${URL}?key=${encodeURIComponent(chave)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: turnos.map((t) => ({ role: t.papel, parts: [{ text: t.texto }] })),
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.4,       // atendimento: previsível vale mais que criativo
          topP: 0.9,
        },
        /* O produto é suplemento e as perguntas falam de saúde e peso; com os
           filtros no padrão o Gemini bloqueia respostas que só recusam a fazer
           alegação. O prompt é quem segura a política. */
        safetySettings: [
          "HARM_CATEGORY_HARASSMENT",
          "HARM_CATEGORY_HATE_SPEECH",
          "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          "HARM_CATEGORY_DANGEROUS_CONTENT",
        ].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" })),
      }),
    });

    if (!res.ok) {
      console.error(`[gemini] HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }

    const d = await res.json();
    const candidato = d?.candidates?.[0];
    // SAFETY / RECITATION: a resposta veio cortada, não dá para usar
    if (candidato?.finishReason && !["STOP", "MAX_TOKENS"].includes(candidato.finishReason)) {
      console.error(`[gemini] interrompido: ${candidato.finishReason}`);
      return null;
    }

    const texto = (candidato?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();

    return texto || null;
  } catch (e) {
    console.error("[gemini] falhou:", (e as Error).message);
    return null;
  }
}
