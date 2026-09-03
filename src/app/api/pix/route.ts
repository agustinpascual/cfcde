import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { criarPix } from "@/lib/pinpay";
import { excedeu, ipDe } from "@/lib/limite";
import { calcularTotal, calcularTotalCafe, type IdFrete } from "@/lib/precos";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const emailOk = (v: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v ?? "").trim());

export async function POST(req: Request) {
  // cada chamada cria uma cobrança de verdade na conta do lojista
  if (excedeu(`pix:${ipDe(req)}`, 8, 60_000)) {
    return NextResponse.json(
      { erro: "Muitas tentativas. Aguarde um minuto." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").trim();
  const documento = soDigitos(body.documento);
  const kitIndex = Number(body.kitIndex);
  const qtd = Number(body.qtd);
  const frete = String(body.frete ?? "") as IdFrete;

  if (nome.split(/\s+/).length < 2) return NextResponse.json({ erro: "Informe o nome completo." }, { status: 422 });
  if (!emailOk(email)) return NextResponse.json({ erro: "E-mail inválido." }, { status: 422 });
  if (documento.length !== 11 && documento.length !== 14)
    return NextResponse.json({ erro: "CPF ou CNPJ inválido." }, { status: 422 });

  let valores: ReturnType<typeof calcularTotal> | ReturnType<typeof calcularTotalCafe>;
  try {
    // O valor NÃO vem do cliente — é recalculado a partir do catálogo do servidor.
    valores = body.loja === "cafecomdeuspai"
      ? calcularTotalCafe(String(body.produto ?? ""), qtd, String(body.frete ?? ""))
      : calcularTotal(kitIndex, qtd, frete);
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 422 });
  }

  const pedido = `PED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const origem = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  try {
    const cobranca = await criarPix({
      amount: valores.total,
      description: `Pedido ${pedido} · ${valores.kit.nome}`,
      customer: { name: nome, email, document: { number: documento } },
      metadata: { external_reference: pedido, checkout_url: `${origem}/checkout` },
    });

    /* A PinPay às vezes devolve qr_code_url = null. O BR Code (qr_code) é o
       dado autoritativo, então geramos a imagem aqui a partir dele — sem
       depender de serviço externo de QR. */
    const brcode = cobranca.pix?.qr_code ?? "";
    let imagemQr = cobranca.pix?.qr_code_url ?? null;
    if (brcode) {
      try {
        imagemQr = await QRCode.toDataURL(brcode, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 420,
          color: { dark: "#0b2860", light: "#ffffff" },
        });
      } catch (e) {
        console.error("[pinpay] falha ao gerar QR local:", (e as Error).message);
      }
    }

    /* Registra o pedido. Se o banco falhar, a cobrança já existe na PinPay —
       então logamos e seguimos, em vez de derrubar a compra do cliente. */
    const db = supabaseAdmin();
    if (db) {
      const { error } = await db.from("pedidos").insert({
        referencia: pedido,
        pix_id: cobranca.id,
        status: "pendente",
        valor_centavos: valores.total,
        subtotal_centavos: valores.subtotal,
        desconto_centavos: valores.desconto,
        frete_centavos: valores.frete.centavos,
        kit: valores.kit.nome,
        quantidade: qtd,
        frete_tipo: valores.frete.nome,
        cliente_nome: nome,
        cliente_email: email,
        cliente_documento: documento,
        cliente_telefone: soDigitos(body.celular) || null,
        endereco: (body.endereco && typeof body.endereco === "object") ? body.endereco : null,
      });
      if (error) console.error("[pix] falha ao registrar pedido:", error.message);
    }

    // devolve só o que o front precisa — nada de credencial
    return NextResponse.json({
      id: cobranca.id,
      pedido,
      total: valores.total,
      qr_code: brcode,
      qr_code_url: imagemQr,
      expires_at: cobranca.pix?.expires_at,
      status: cobranca.status,
    });
  } catch (e) {
    const err = e as Error & { status?: number; codigo?: string };
    console.error("[pinpay] falha ao criar PIX:", err.status ?? "-", err.codigo ?? "-", err.message);

    if (!process.env.PINPAY_TOKEN) {
      return NextResponse.json(
        { erro: "Pagamento indisponível: PINPAY_TOKEN não configurado no servidor." },
        { status: 503 }
      );
    }
    if (err.status === 401) {
      return NextResponse.json(
        { erro: "Credencial da PinPay recusada. Confira a chave sk_ em .env.local." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { erro: "Não foi possível gerar o PIX agora. Tente novamente." },
      { status: err.status ?? 502 }
    );
  }
}
