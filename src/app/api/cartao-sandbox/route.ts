import { NextResponse } from "next/server";
import { excedeu, ipDe } from "@/lib/limite";
import { calcularTotal, type IdFrete } from "@/lib/precos";
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
  const cartaoInicioRecebido = soDigitos(body.cartaoInicio);
  const cartaoInicio = cartaoInicioRecebido.length === 4 ? cartaoInicioRecebido : null;
  const cartaoFinalRecebido = soDigitos(body.cartaoFinal);
  const cartaoFinal = cartaoFinalRecebido.length === 4 ? cartaoFinalRecebido : null;
  const bandeirasPermitidas = new Set(["Visa", "Mastercard", "American Express", "Elo", "Hipercard", "Bandeira não identificada"]);
  const bandeiraRecebida = texto(body.bandeiraCartao, 40);
  const cartaoBandeira = bandeirasPermitidas.has(bandeiraRecebida) ? bandeiraRecebida : null;

  let valores: ReturnType<typeof calcularTotal>;
  try {
    valores = calcularTotal(kitIndex, qtd, frete);
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
    cartao_inicio: cartaoInicio,
    cartao_final: cartaoFinal,
    cartao_bandeira: cartaoBandeira,
    endereco: body.endereco && typeof body.endereco === "object" ? body.endereco : null,
  });

  if (error) {
    console.error("[cartao-sandbox] falha ao registrar tentativa:", error.message);
    return NextResponse.json({ erro: "Não foi possível registrar a tentativa." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, referencia });
}
