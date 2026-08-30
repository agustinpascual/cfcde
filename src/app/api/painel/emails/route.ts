import { NextResponse } from "next/server";
import { autenticado } from "@/lib/painel-auth";
import { emailValido, enviarLote, enviarUm, LOTE, normalizar, PAUSA_MS } from "@/lib/email";
import { assinarDescadastro } from "@/lib/descadastro";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;   // disparo em lotes leva tempo

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bella-gummy.vercel.app";

/** Tabela ausente é erro de instalação, não de uso — vale dizer o que fazer. */
function mensagemDeErro(e: { code?: string; message: string }) {
  if (e.code === "PGRST205" || e.code === "42P01") {
    return "As tabelas de e-mail ainda não existem. Rode o SQL em Instalação.";
  }
  return e.message;
}
const urlDescadastro = (email: string) =>
  `${SITE}/descadastro?e=${encodeURIComponent(email)}&t=${assinarDescadastro(email)}`;

/** Contatos inscritos + resumo das campanhas. */
export async function GET() {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ contatos: [], campanhas: [] });

  const [contatos, campanhas] = await Promise.all([
    db.from("contatos").select("email,nome,origem,inscrito,criado_em").order("criado_em", { ascending: false }).limit(500),
    db.from("campanhas").select("*").order("criada_em", { ascending: false }).limit(30),
  ]);

  if (contatos.error) {
    return NextResponse.json({
      contatos: [], campanhas: [], inscritos: 0,
      erro: mensagemDeErro(contatos.error),
    });
  }

  const { count } = await db.from("contatos").select("*", { count: "exact", head: true }).eq("inscrito", true);

  return NextResponse.json({
    contatos: contatos.data ?? [],
    campanhas: campanhas.data ?? [],
    inscritos: count ?? 0,
  });
}

type Corpo = {
  acao?: string;
  lista?: string;
  assunto?: string;
  html?: string;
  nome?: string;
  teste?: string;
};

export async function POST(req: Request) {
  if (!(await autenticado())) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ erro: "Supabase não configurado" }, { status: 500 });

  let c: Corpo;
  try { c = await req.json(); } catch { return NextResponse.json({ erro: "JSON inválido" }, { status: 400 }); }

  /* ---------- importar lista ---------- */
  if (c.acao === "importar") {
    /* Quebra só por linha. Quebrar na vírgula perdia o nome do CSV comum
       "Maria,maria@ex.com", que virava duas entradas. */
    const linhas = String(c.lista ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    const vistos = new Set<string>();
    const validos: { email: string; nome: string | null }[] = [];
    let invalidos = 0, repetidos = 0;

    for (const linha of linhas) {
      // aceita "email", "nome <email>" e "nome,email" — CSV real vem sujo
      const achado = linha.match(/[^\s<,;]+@[^\s>,;]+/)?.[0] ?? "";
      const email = normalizar(achado);
      if (!email || !emailValido(email)) { invalidos++; continue; }
      if (vistos.has(email)) { repetidos++; continue; }
      vistos.add(email);
      // o que sobra da linha depois de tirar o e-mail é o nome
      const nome = linha.replace(achado, "").replace(/[<>,;"]/g, " ").replace(/\s+/g, " ").trim() || null;
      validos.push({ email, nome });
    }

    if (validos.length) {
      /* ignoreDuplicates preserva quem já pediu para sair: reimportar a lista
         não pode ressuscitar um descadastro. */
      const { error } = await db.from("contatos").upsert(
        validos.map((v) => ({ ...v, origem: "importado" })),
        { onConflict: "email", ignoreDuplicates: true }
      );
      /* O supabase-js devolve o erro no objeto, não lança. Sem checar, a tela
         dizia "4 importados" com a tabela inexistente. */
      if (error) return NextResponse.json({ erro: mensagemDeErro(error) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, importados: validos.length, invalidos, repetidos });
  }

  /* ---------- puxar e-mails de quem já comprou ---------- */
  if (c.acao === "importar_pedidos") {
    const { data } = await db.from("pedidos").select("cliente_email,cliente_nome").not("cliente_email", "is", null);
    const vistos = new Set<string>();
    const linhas = (data ?? [])
      .map((p) => ({ email: normalizar(String(p.cliente_email)), nome: p.cliente_nome ?? null }))
      .filter((p) => emailValido(p.email) && !vistos.has(p.email) && vistos.add(p.email));

    if (linhas.length) {
      const { error } = await db.from("contatos").upsert(
        linhas.map((l) => ({ ...l, origem: "pedido" })),
        { onConflict: "email", ignoreDuplicates: true }
      );
      if (error) return NextResponse.json({ erro: mensagemDeErro(error) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, importados: linhas.length });
  }

  /* ---------- envio de teste ---------- */
  if (c.acao === "teste") {
    const para = normalizar(String(c.teste ?? ""));
    if (!emailValido(para)) return NextResponse.json({ erro: "e-mail de teste inválido" }, { status: 400 });
    try {
      const html = String(c.html ?? "").replace(/\{\{\s*descadastro\s*\}\}/gi, urlDescadastro(para));
      await enviarUm(para, String(c.assunto ?? "(sem assunto)"), html);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
    }
  }

  /* ---------- disparo ---------- */
  if (c.acao === "disparar") {
    const assunto = String(c.assunto ?? "").trim();
    const html = String(c.html ?? "").trim();
    if (!assunto || !html) return NextResponse.json({ erro: "assunto e conteúdo são obrigatórios" }, { status: 400 });
    if (!/\{\{\s*descadastro\s*\}\}/i.test(html)) {
      return NextResponse.json(
        { erro: "O conteúdo precisa ter o link de descadastro {{descadastro}}." },
        { status: 400 }
      );
    }

    const { data: contatos } = await db.from("contatos")
      .select("id,email,nome").eq("inscrito", true).limit(5000);
    if (!contatos?.length) return NextResponse.json({ erro: "nenhum contato inscrito" }, { status: 400 });

    const { data: campanha } = await db.from("campanhas")
      .insert({ nome: String(c.nome ?? assunto).slice(0, 120), assunto, corpo_html: html, status: "enviando", total: contatos.length })
      .select("id").single();
    if (!campanha) return NextResponse.json({ erro: "não foi possível criar a campanha" }, { status: 500 });

    let enviados = 0, falhas = 0;
    for (let i = 0; i < contatos.length; i += LOTE) {
      const fatia = contatos.slice(i, i + LOTE);
      try {
        const r = await enviarLote(fatia, assunto, html, urlDescadastro);
        await db.from("envios").upsert(
          r.map((x, j) => ({
            campanha: campanha.id,
            contato: fatia[j].id,
            email: x.email,
            provedor_id: x.id ?? null,
            status: x.erro ? "falhou" : "enviado",
            erro: x.erro ?? null,
          })),
          { onConflict: "campanha,email", ignoreDuplicates: true }
        );
        enviados += r.filter((x) => !x.erro).length;
        falhas += r.filter((x) => x.erro).length;
      } catch (e) {
        falhas += fatia.length;
        console.error("[email] lote falhou:", (e as Error).message);
      }
      await db.from("campanhas").update({ enviados, falhas }).eq("id", campanha.id);
      if (i + LOTE < contatos.length) await new Promise((ok) => setTimeout(ok, PAUSA_MS));
    }

    await db.from("campanhas").update({
      status: falhas === contatos.length ? "falhou" : "enviada",
      enviados, falhas, enviada_em: new Date().toISOString(),
    }).eq("id", campanha.id);

    return NextResponse.json({ ok: true, enviados, falhas, total: contatos.length });
  }

  return NextResponse.json({ erro: "ação desconhecida" }, { status: 400 });
}
