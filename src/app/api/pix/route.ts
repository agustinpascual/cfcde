import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { criarPix } from "@/lib/pinpay";
import { lerGateways } from "@/lib/gateways-config";
import { processarAxxon } from "@/lib/pagamentos-axxon";
import { excedeu, ipDe } from "@/lib/limite";
import { calcularCarrinhoCafe, calcularTotal, calcularTotalCafe, type IdFrete, type ItemCarrinhoCafe } from "@/lib/precos";
import { ler } from "@/lib/config-integracoes";
import { depois, enviarPixPorEmail } from "@/lib/confirmar-pedido";
import { novoNumeroPedido } from "@/lib/numero-pedido";
import { origemOficial } from "@/lib/origem";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { documentoBrasileiroValido } from "@/lib/documento-br";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const emailOk = (v: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v ?? "").trim());
const itensDoCorpo = (body: Record<string, unknown>): ItemCarrinhoCafe[] => Array.isArray(body.itens)
  ? body.itens.map((item) => {
      const linha = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
      return { produto: String(linha.produto ?? ""), qtd: Number(linha.qtd) };
    })
  : [{ produto: String(body.produto ?? ""), qtd: Number(body.qtd) }];

export async function POST(req: Request) {
  // cada chamada cria uma cobrança de verdade na conta do lojista
  /* Bloqueia cobrança pedida de um domínio que não é o seu: um clone em
     proxy reverso não consegue vender usando a sua conta da PinPay. */
  if (!origemOficial(req)) {
    console.warn("[pix] origem recusada:", req.headers.get("origin"));
    return NextResponse.json({ erro: "Origem não autorizada." }, { status: 403 });
  }

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
  try {
    if ((await lerGateways()).pix === "axxonpay") return processarAxxon(body, "pix");
  } catch { return NextResponse.json({ erro: "Configuração de pagamentos indisponível." }, { status: 503 }); }
  const email = String(body.email ?? "").trim();
  const documento = soDigitos(body.documento);
  const kitIndex = Number(body.kitIndex);
  const qtd = Number(body.qtd);
  const frete = String(body.frete ?? "") as IdFrete;

  if (nome.split(/\s+/).length < 2) return NextResponse.json({ erro: "Informe o nome completo." }, { status: 422 });
  if (!emailOk(email)) return NextResponse.json({ erro: "E-mail inválido." }, { status: 422 });
  if (!documentoBrasileiroValido(documento))
    return NextResponse.json({ erro: "CPF ou CNPJ inválido." }, { status: 422 });

  let valores: ReturnType<typeof calcularTotal> | ReturnType<typeof calcularTotalCafe>;
  try {
    // O valor NÃO vem do cliente — é recalculado a partir do catálogo do servidor.
    valores = body.loja === "cafecomdeuspai"
      ? calcularCarrinhoCafe(itensDoCorpo(body), String(body.frete ?? ""), {
          cupom: typeof body.cupom === "string" ? body.cupom : undefined,
          pagamento: "pix",
        })
      : calcularTotal(kitIndex, qtd, frete);
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 422 });
  }

  const pedido = await novoNumeroPedido();
  const origem = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  try {
    const cobranca = await criarPix({
      amount: valores.total,
      description: `GOKOCO Escova Modeladora de Cabelo Bivolt - Pedido #${pedido}`.slice(0, 200),
      customer: { name: nome, email, document: { number: documento } },
      metadata: { external_reference: pedido, checkout_url: `${origem}/checkout` },
    });

    /* A PinPay às vezes devolve qr_code_url = null. O BR Code (qr_code) é o
       dado autoritativo, então geramos a imagem aqui a partir dele — sem
       depender de serviço externo de QR. */
    const brcode = cobranca.pix?.qr_code ?? "";
    const imagemDoGateway = cobranca.pix?.qr_code_url ?? null;
    const gerarImagem = brcode
      ? QRCode.toDataURL(brcode, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 420,
          color: { dark: "#151515", light: "#ffffff" },  // preto da marca, não o navy antigo
        }).catch((e) => {
        console.error("[pinpay] falha ao gerar QR local:", (e as Error).message);
        return imagemDoGateway;
      })
      : Promise.resolve(imagemDoGateway);

    /* Registra o pedido. Se o banco falhar, a cobrança já existe na PinPay —
       então logamos e seguimos, em vez de derrubar a compra do cliente.
       A imagem do QR e o INSERT correm juntos: não há motivo para somar essas
       duas esperas depois que a adquirente já devolveu a cobrança. */
    const db = supabaseAdmin();
    const dadosPedido = {
      referencia: pedido,
      pix_id: cobranca.id,
      status: "pendente",
      valor_centavos: valores.total,
      subtotal_centavos: valores.subtotal,
      desconto_centavos: valores.desconto,
      frete_centavos: valores.frete.centavos,
      kit: valores.kit.nome,
      quantidade: "quantidadeTotal" in valores ? valores.quantidadeTotal : qtd,
      frete_tipo: valores.frete.nome,
      cliente_nome: nome,
      cliente_email: email,
      cliente_documento: documento,
      cliente_telefone: soDigitos(body.celular) || null,
      endereco: (body.endereco && typeof body.endereco === "object") ? body.endereco : null,
    };
    const registrar = db
      ? db.from("pedidos").insert({
        ...dadosPedido,
        pix_copia_cola: brcode || null,
        pix_qr_url: imagemDoGateway,
      })
      : Promise.resolve({ error: null });
    const [imagemQr, registro] = await Promise.all([gerarImagem, registrar]);
    let erroRegistro = registro.error;
    /* Compatibilidade com instalações que ainda não receberam as colunas de
       QR: tenta o registro essencial, sem deixar uma cobrança órfã. */
    if (db && erroRegistro && /pix_(copia_cola|qr_url)/i.test(erroRegistro.message)) {
      const fallback = await db.from("pedidos").insert(dadosPedido);
      erroRegistro = fallback.error;
    }
    if (erroRegistro) console.error("[pix] falha ao registrar pedido:", erroRegistro.message);
    else if (db && imagemQr && imagemQr !== imagemDoGateway && !registro.error) {
      /* A imagem local é grande e não deve atrasar a tela. O copia-e-cola e o
         pedido já estão salvos; apenas troca a imagem provisória no painel. */
      depois(Promise.resolve(db.from("pedidos").update({ pix_qr_url: imagemQr }).eq("referencia", pedido))
        .then(({ error }) => {
          if (error) console.error("[pix] QR não salvo:", error.message);
        }));
    }

    /* Manda o código por e-mail. Em segundo plano: o cliente não pode esperar
       a Resend para ver o QR na tela. Sem este e-mail, quem fecha a aba perde
       o código e o pedido morre pendente. */
    if (email) {
      depois(enviarPixPorEmail({
        referencia: pedido,
        clienteNome: nome,
        clienteEmail: email,
        clienteDocumento: documento,
        clienteTelefone: soDigitos(body.celular) || null,
        itens: "itens" in valores
          ? valores.itens.map((item) => ({ descricao: item.nome, quantidade: item.quantidade, totalCentavos: item.totalCentavos }))
          : [{ descricao: valores.kit.nome, quantidade: qtd, totalCentavos: valores.subtotal }],
        subtotalCentavos: valores.subtotal,
        descontoCentavos: valores.desconto,
        freteCentavos: valores.frete.centavos,
        freteTipo: valores.frete.nome,
        totalCentavos: valores.total,
        brcode,
      }).catch((e) => console.error("[pix] e-mail do código falhou:", (e as Error).message)));
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

    /* Confere no cofre também: a credencial pode estar salva pelo painel e
       ausente do ambiente, e antes essa checagem acusava "não configurado"
       mesmo com a chave gravada. */
    if (!(await ler("PINPAY_TOKEN")) && !process.env.PINPAY_TOKEN) {
      return NextResponse.json(
        { erro: "Pagamento indisponível: credencial da PinPay não configurada." },
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
