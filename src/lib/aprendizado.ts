import "server-only";
import { supabaseAdmin } from "./supabase/servidor";

/* Registra o que o robô não soube responder bem. Sem isso, melhorar o bot vira
   adivinhação: a gente inventa perguntas de teste em vez de olhar as reais. */

/* Abaixo disso a resposta foi um chute que passou raspando no limiar. */
const CONFIANCA_BAIXA = 0.68;

/** Normaliza para agrupar "tem gluten?" e "Tem glúten" na mesma linha. */
function chaveDe(pergunta: string) {
  return pergunta
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim()
    .slice(0, 200);
}

export async function registrarDuvida(
  pergunta: string,
  intencao: string | null,
  confianca: number | null
) {
  const db = supabaseAdmin();
  const texto = pergunta.trim();
  if (!db || texto.length < 3 || texto.length > 500) return;

  // resposta com confiança boa não é dúvida: não polui a fila
  if (intencao && confianca !== null && confianca >= CONFIANCA_BAIXA) return;

  const chave = chaveDe(texto);
  if (!chave) return;

  try {
    /* Conta repetição em vez de gravar uma linha por mensagem: o que importa
       é quais perguntas mais aparecem, não quantas mensagens houve. */
    const { data } = await db.from("aprendizado")
      .select("id,vezes").eq("chave", chave).maybeSingle();

    if (data) {
      await db.from("aprendizado")
        .update({ vezes: data.vezes + 1, ultima_em: new Date().toISOString() })
        .eq("id", data.id);
    } else {
      await db.from("aprendizado").insert({
        pergunta: texto.slice(0, 500), chave, intencao, confianca,
      });
    }
  } catch (e) {
    // aprendizado nunca pode derrubar o atendimento
    console.error("[aprendizado]", (e as Error).message);
  }
}
