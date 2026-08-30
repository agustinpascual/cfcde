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
/** Manda as boas-vindas se for o primeiro contato. `false` = não saudou. */
async function saudar(
  db: NonNullable<ReturnType<typeof supabaseAdmin>>,
  conversaId: string,
  telefone: string,
  mensagem: string
): Promise<boolean> {
  try {
    const { data, error } = await db
      .from("conversas").select("saudou_em").eq("id", conversaId).single();
    // 42703 = coluna não existe; a migration ainda não rodou
    if (error || data?.saudou_em) return false;

    await enviarWhatsApp(telefone, mensagem);
    await db.from("mensagens").insert({ conversa: conversaId, autor: "robo", texto: mensagem });
    await db.from("conversas").update({
      saudou_em: new Date().toISOString(),
      ultima_msg: mensagem.slice(0, 200),
      ultima_em: new Date().toISOString(),
    }).eq("id", conversaId);
    return true;
  } catch (e) {
    console.error("[zapi] saudação pulada:", (e as Error).message);
    return false;
  }
}

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
      .select("id,robo_ativo,nao_lidas")
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

    /* Boas-vindas no primeiro contato. Fica isolado de propósito: depende da
       coluna `saudou_em`, e se a migration não tiver rodado o atendimento não
       pode parar junto — era o que derrubava o robô inteiro. */
    if (treinamento.saudacao_ativa && (await saudar(db, conversa.id, telefone, treinamento.saudacao_mensagem))) {
      if (ehSoSaudacao(texto)) return NextResponse.json({ ok: true, saudou: true });
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
    console.error("[zapi] falha ao processar:", (e as Error).message);
    return NextResponse.json({ ok: false, motivo: (e as Error).message.slice(0, 120) }, { status: 202 });
  }
}
