import "server-only";
import crypto from "node:crypto";
import { enviarUm } from "./email";
import { supabaseAdmin } from "./supabase/servidor";

/* Entrega do acesso ao app depois que a PinPay confirma o pagamento.
   Roda uma vez por pedido (unique em pedido_ref), então reenvio de webhook
   não gera senha nova nem e-mail duplicado. */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bella-gummy.vercel.app";
const LOGO = `${SITE}/sites/www-belabluebeauty-com-br-dbe74b89/bela-power-black-c10b99fc/images/email-logo.png`;

/** Senha legível: sem 0/O/1/l para não confundir quem digita. */
function gerarSenha(tamanho = 10) {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(tamanho);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

function corpoEmail(nome: string, email: string, senha: string, pedido: string) {
  const ola = nome ? `Olá, ${nome.split(/\s+/)[0]}` : "Olá";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;margin:0;padding:24px 12px;font-family:Helvetica,Arial,sans-serif">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden">

      <tr><td align="center" style="background:#0b2860;font-size:0;line-height:0">
        <img src="${LOGO}" width="600" alt="Bela Blue Beauty" style="display:block;border:0;width:100%;max-width:600px;height:auto">
      </td></tr>
      <tr><td style="height:4px;background:#d4b45d;font-size:0;line-height:0">&nbsp;</td></tr>

      <tr><td style="padding:34px 34px 6px">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td style="background:#e7f6ec;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;color:#12833e">
            ✓ PAGAMENTO APROVADO
          </td></tr>
        </table>
        <h1 style="margin:16px 0 12px;font-size:24px;line-height:1.3;color:#0b2860;font-weight:800">
          ${ola}, seu pedido está confirmado!
        </h1>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#40464f">
          Recebemos o seu pagamento${pedido ? ` do pedido <strong>${pedido}</strong>` : ""}. 🎉
        </p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#40464f">
          O <strong>código de rastreamento</strong> será informado em breve, assim que o envio for postado — você recebe por aqui.
        </p>
      </td></tr>

      <tr><td style="padding:0 34px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e3e8f0;border-radius:11px">
          <tr><td style="padding:22px 24px">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#d4b45d">
              Acesso ao aplicativo fitness
            </p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#5b6472">
              Seu acesso já está liberado. Use os dados abaixo para entrar:
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e3e8f0;border-radius:9px">
              <tr><td style="padding:14px 18px;border-bottom:1px solid #eef1f6">
                <span style="font-size:12px;color:#9aa2ae">E-mail de acesso</span><br>
                <span style="font-size:15px;color:#0b2860;font-weight:700">${email}</span>
              </td></tr>
              <tr><td style="padding:14px 18px">
                <span style="font-size:12px;color:#9aa2ae">Senha provisória</span><br>
                <span style="font-size:18px;color:#0b2860;font-weight:800;letter-spacing:1px;font-family:ui-monospace,Menlo,monospace">${senha}</span>
              </td></tr>
            </table>
            <p style="margin:14px 0 0;font-size:12.5px;line-height:1.6;color:#8a919c">
              Por segurança, troque essa senha no primeiro acesso.
            </p>
          </td></tr>
        </table>
      </td></tr>

      <tr><td align="center" style="padding:28px 34px 34px">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="background:#0b2860;border-radius:9px">
            <a href="${SITE}" style="display:inline-block;padding:15px 40px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">
              Acessar o aplicativo
            </a>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="background:#0b2860;padding:24px 34px">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#ffffff">Bela Blue Beauty</p>
        <p style="margin:0;font-size:12px;line-height:1.7;color:#a6b6d5">
          Você recebeu este e-mail porque concluiu uma compra na nossa loja.
          Se não reconhece esta compra, responda este e-mail.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>`;
}

/** Gera o acesso, grava e envia. Idempotente por pedido. Nunca lança. */
export async function entregarAcessoApp(pedidoRef: string): Promise<{ ok: boolean; motivo?: string }> {
  const db = supabaseAdmin();
  if (!db) return { ok: false, motivo: "sem_supabase" };

  try {
    const { data: pedido } = await db.from("pedidos")
      .select("referencia,cliente_email,cliente_nome")
      .eq("referencia", pedidoRef).maybeSingle();

    const email = pedido?.cliente_email?.trim();
    if (!email) return { ok: false, motivo: "pedido_sem_email" };

    // já entregue? não gera senha nova nem reenvia
    const { data: existente } = await db.from("acessos_app")
      .select("id,enviado_em").eq("pedido_ref", pedidoRef).maybeSingle();
    if (existente?.enviado_em) return { ok: true, motivo: "ja_enviado" };

    const senha = existente ? null : gerarSenha();
    if (senha) {
      await db.from("acessos_app").insert({ pedido_ref: pedidoRef, email, senha });
    }
    const senhaFinal = senha ?? (await db.from("acessos_app").select("senha").eq("pedido_ref", pedidoRef).single()).data?.senha;
    if (!senhaFinal) return { ok: false, motivo: "sem_senha" };

    await enviarUm(
      email,
      "Compra aprovada • Seu acesso ao aplicativo fitness 🎉",
      corpoEmail(pedido?.cliente_nome ?? "", email, senhaFinal, pedido?.referencia ?? "")
    );
    await db.from("acessos_app").update({ enviado_em: new Date().toISOString() }).eq("pedido_ref", pedidoRef);
    return { ok: true };
  } catch (e) {
    console.error("[entrega-app]", (e as Error).message);
    return { ok: false, motivo: (e as Error).message.slice(0, 120) };
  }
}
