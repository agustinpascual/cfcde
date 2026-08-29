import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ler } from "./config-integracoes";
import { responderLocal } from "./robo-interno";
import { supabaseAdmin } from "./supabase/servidor";

/* Robô de atendimento do WhatsApp.
   O system prompt é montado a partir da tabela `treinamento`, editável no
   painel — trocar o texto lá muda o comportamento sem novo deploy. */

export type Treinamento = {
  ativo: boolean;
  tom: string;
  sobre_produto: string;
  regras: string;
  nao_pode: string;
  exemplos: { pergunta: string; resposta: string }[];
  escalar_quando: string;
  escalar_mensagem: string;
};

/* Texto padrão quando o robô não sabe. Editável no painel. */
export const ENCAMINHAR_PADRAO =
  "Essa eu vou te encaminhar para outro setor, que consegue te informar direitinho sobre isso. Só um instante.";

export const TREINAMENTO_VAZIO: Treinamento = {
  ativo: false, tom: "", sobre_produto: "", regras: "", nao_pode: "",
  exemplos: [], escalar_quando: "", escalar_mensagem: ENCAMINHAR_PADRAO,
};

export async function lerTreinamento(): Promise<Treinamento> {
  const db = supabaseAdmin();
  if (!db) return TREINAMENTO_VAZIO;
  const { data, error } = await db.from("treinamento").select("*").eq("id", 1).single();
  if (error || !data) return TREINAMENTO_VAZIO;
  return {
    ativo: data.ativo,
    tom: data.tom ?? "",
    sobre_produto: data.sobre_produto ?? "",
    regras: data.regras ?? "",
    nao_pode: data.nao_pode ?? "",
    exemplos: Array.isArray(data.exemplos) ? data.exemplos : [],
    escalar_quando: data.escalar_quando ?? "",
    escalar_mensagem: data.escalar_mensagem?.trim() || ENCAMINHAR_PADRAO,
  };
}

const seccao = (titulo: string, corpo: string) =>
  corpo.trim() ? `\n\n## ${titulo}\n${corpo.trim()}` : "";

/** Monta o system prompt. O conteúdo fixo vem primeiro para o cache pegar. */
export function montarPrompt(t: Treinamento) {
  let p =
    "Você atende clientes da Bela Blue Beauty pelo WhatsApp. " +
    "Escreve como uma pessoa real do time, não como robô: sem saudação protocolar, " +
    "sem repetir o nome do cliente, sem 'estou à disposição'. Respostas curtas — " +
    "duas ou três frases na maioria das vezes, porque é WhatsApp.";

  p += seccao("Tom de voz", t.tom);
  p += seccao("Sobre o produto", t.sobre_produto);
  p += seccao("Como responder", t.regras);
  p += seccao("O que você NÃO pode fazer", t.nao_pode);

  if (t.exemplos.length) {
    p += "\n\n## Exemplos de respostas boas\n" +
      t.exemplos
        .filter((e) => e.pergunta?.trim() && e.resposta?.trim())
        .map((e) => `Cliente: ${e.pergunta.trim()}\nVocê: ${e.resposta.trim()}`)
        .join("\n\n");
  }

  p += seccao("Quando passar para um humano", t.escalar_quando);

  p +=
    "\n\n## Regra final\n" +
    "Se não souber a resposta, ou se a pergunta envolver saúde, medicação, " +
    "condição médica, gravidez ou uso por menor de idade, NÃO invente e não " +
    "aconselhe. Nesse caso responda exatamente isto e mais nada, seguido da " +
    `marcação [ESCALAR]:\n"${t.escalar_mensagem || ENCAMINHAR_PADRAO}"\n` +
    "Nunca prometa resultado de emagrecimento, nunca compare o produto com medicamento.";

  return p;
}

export type Historico = { autor: "cliente" | "robo" | "atendente"; texto: string }[];

export type Resposta = { texto: string; escalar: boolean } | null;

export async function responder(historico: Historico, t: Treinamento): Promise<Resposta> {
  if (!t.ativo) return null;

  const ultima = [...historico].reverse().find((m) => m.autor === "cliente")?.texto ?? "";
  const chave = process.env.ANTHROPIC_API_KEY;

  /* Sem chave da Anthropic o robô continua funcionando pelo motor interno:
     casa a pergunta com o que você escreveu no treinamento e com as
     intenções embutidas. Não inventa nada — se não reconhece, escala. */
  if (!chave) {
    const local = responderLocal(ultima, t.exemplos);
    if (local) return { texto: local.texto, escalar: local.escalar };
    return { texto: t.escalar_mensagem || ENCAMINHAR_PADRAO, escalar: true };
  }

  /* Com chave: o motor interno resolve primeiro os casos de segurança
     (saúde, reclamação, troca) — resposta previsível vale mais que criativa. */
  const local = responderLocal(ultima, t.exemplos);
  if (local?.escalar) return { texto: local.texto, escalar: true };

  const client = new Anthropic({ apiKey: chave });

  try {
    const r = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024, // WhatsApp: resposta curta de propósito
      thinking: { type: "adaptive" },
      output_config: { effort: "low" }, // atendimento simples não pede esforço alto
      cache_control: { type: "ephemeral" }, // o treinamento repete a cada mensagem
      system: montarPrompt(t),
      messages: historico.map((m) => ({
        role: m.autor === "cliente" ? ("user" as const) : ("assistant" as const),
        content: m.texto,
      })),
    });

    if (r.stop_reason === "refusal") return { texto: t.escalar_mensagem || ENCAMINHAR_PADRAO, escalar: true };

    const texto = r.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!texto) return null;
    const escalar = texto.includes("[ESCALAR]");
    return { texto: texto.replace(/\[ESCALAR\]/g, "").trim(), escalar };
  } catch (e) {
    console.error("[robo] Claude falhou, caindo no motor interno:", (e as Error).message);
    // a API caiu ou estourou cota — o atendimento não pode parar junto
    const reserva = responderLocal(ultima, t.exemplos);
    return reserva
      ? { texto: reserva.texto, escalar: reserva.escalar }
      : { texto: t.escalar_mensagem || ENCAMINHAR_PADRAO, escalar: true };
  }
}

/* ---------- envio pela Z-API ---------- */
export async function enviarWhatsApp(telefone: string, texto: string) {
  const [instancia, token, clientToken] = await Promise.all([
    ler("ZAPI_INSTANCIA"), ler("ZAPI_TOKEN"), ler("ZAPI_CLIENT_TOKEN"),
  ]);
  if (!instancia || !token) throw new Error("Z-API não configurada");

  const res = await fetch(
    `https://api.z-api.io/instances/${instancia}/token/${token}/send-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(clientToken ? { "Client-Token": clientToken } : {}),
      },
      body: JSON.stringify({ phone: telefone, message: texto }),
    }
  );
  if (!res.ok) throw new Error(`Z-API respondeu ${res.status}: ${await res.text()}`);
  return res.json();
}
