import { NextResponse } from "next/server";
import { criarPix } from "@/lib/pinpay";
import { calcularTotal, type IdFrete } from "@/lib/precos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const emailOk = (v: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v ?? "").trim());

export async function POST(req: Request) {
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

  let valores: ReturnType<typeof calcularTotal>;
  try {
    // O valor NÃO vem do cliente — é recalculado a partir do kit e do frete.
    valores = calcularTotal(kitIndex, qtd, frete);
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

    // devolve só o que o front precisa — nada de credencial
    return NextResponse.json({
      id: cobranca.id,
      pedido,
      total: valores.total,
      qr_code: cobranca.pix?.qr_code,
      qr_code_url: cobranca.pix?.qr_code_url,
      expires_at: cobranca.pix?.expires_at,
      status: cobranca.status,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    console.error("[pinpay] falha ao criar PIX:", err.message);
    const semChave = /PINPAY_TOKEN/.test(err.message);
    return NextResponse.json(
      { erro: semChave ? "Pagamento não configurado no servidor." : "Não foi possível gerar o PIX agora." },
      { status: semChave ? 503 : (err.status ?? 502) }
    );
  }
}
