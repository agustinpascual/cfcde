import { NextResponse } from "next/server";
import { enviarWhatsApp, lerTreinamento, responder, type Historico } from "@/lib/robo";
import { supabaseAdmin } from "@/lib/supabase/servidor";

/* "oi", "bom dia" e afins: a saudação de boas-vindas já cobre. */
const SO_SAUDACAO = /^(oi+|ol[aá]+|opa+|e a[ií]|eae|salve|hey|oii+|bom dia|boa tarde|boa noite|tudo bem|tudo bom|blz|beleza)[\s!,.?]*$/i;
const ehSoSaudacao = (t: string) =>
  SO_SAUDACAO.test(t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Webhook de mensagens recebidas da Z-API.
   Grava a mensagem, decide se o robô responde e devolve 200 rápido —
   a Z-API reenvia se demorar. */
export async function POST(req: Request) {
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ ok: false, motivo: "sem_supabase" }, { status: 202 });

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });

  // mensagens que nós mesmos enviamos voltam no webhook — ignorar
  if (corpo.fromMe) return NextResponse.json({ ok: true, ignorado: "propria" });

  const telefone = String(corpo.phone ?? "").replace(/\D/g, "");
  const texto = String(corpo.text?.message ?? corpo.message ?? "").trim();
  const zapId = corpo.messageId ? String(corpo.messageId) : null;
  if (!telefone || !texto) return NextResponse.json({ ok: true, ignorado: "sem_texto" });

  try {
    // conversa (cria se for a primeira mensagem)
    const { data: conversa } = await db.from("conversas")
      .upsert({
        telefone,
        nome: corpo.senderName ?? corpo.chatName ?? null,
        foto: corpo.senderPhoto ?? null,
        ultima_msg: texto.slice(0, 200),
        ultima_em: new Date().toISOString(),
      }, { onConflict: "telefone" })
      .select("id,robo_ativo,nao_lidas,saudou_em")
      .single();

    if (!conversa) return NextResponse.json({ ok: false }, { status: 202 });

    // zap_id é único: se a Z-API reenviar o mesmo evento, não duplica
    await db.from("mensagens").upsert(
      { conversa: conversa.id, zap_id: zapId, autor: "cliente", texto },
      { onConflict: "zap_id", ignoreDuplicates: true }
    );
    await db.from("conversas")
      .update({ nao_lidas: (conversa.nao_lidas ?? 0) + 1 })
      .eq("id", conversa.id);

    if (!conversa.robo_ativo) return NextResponse.json({ ok: true, robo: "desligado" });

    const treinamento = await lerTreinamento();
    if (!treinamento.ativo) return NextResponse.json({ ok: true, robo: "inativo" });

    /* Primeiro contato deste número: manda as boas-vindas antes de responder.
       `saudou_em` guarda a marca para não repetir a cada mensagem. */
    if (treinamento.saudacao_ativa && !conversa.saudou_em) {
      const boasVindas = treinamento.saudacao_mensagem;
      await enviarWhatsApp(telefone, boasVindas);
      await db.from("mensagens").insert({ conversa: conversa.id, autor: "robo", texto: boasVindas });
      await db.from("conversas").update({
        saudou_em: new Date().toISOString(),
        ultima_msg: boasVindas.slice(0, 200),
        ultima_em: new Date().toISOString(),
      }).eq("id", conversa.id);

      /* Se a primeira mensagem foi só "oi", a saudação já responde tudo —
         mandar as duas seguidas soa robótico. */
      if (ehSoSaudacao(texto)) {
        return NextResponse.json({ ok: true, saudou: true });
      }
    }

    // últimas mensagens como contexto
    const { data: anteriores } = await db.from("mensagens")
      .select("autor,texto").eq("conversa", conversa.id)
      .order("criado_em", { ascending: false }).limit(16);

    const historico = ((anteriores ?? []).reverse() as Historico);
    const resposta = await responder(historico, treinamento);
    if (!resposta?.texto) return NextResponse.json({ ok: true, robo: "sem_resposta" });

    await enviarWhatsApp(telefone, resposta.texto);
    await db.from("mensagens").insert({ conversa: conversa.id, autor: "robo", texto: resposta.texto });
    await db.from("conversas").update({
      ultima_msg: resposta.texto.slice(0, 200),
      ultima_em: new Date().toISOString(),
      // o robô pediu ajuda: sai de cena e marca a conversa
      ...(resposta.escalar ? { robo_ativo: false, status: "pendente" } : {}),
    }).eq("id", conversa.id);

    return NextResponse.json({ ok: true, respondeu: true, escalou: resposta.escalar });
  } catch (e) {
    console.error("[zapi] falha:", (e as Error).message);
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
