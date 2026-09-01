import "server-only";
import { enviarUm, emailValido } from "./email";
import { consultarPix } from "./pinpay";
import { supabaseAdmin } from "./supabase/servidor";

const LIMITE = 30;

const escapar = (valor: string) => valor.replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c] ?? c));

const moeda = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", {
  style: "currency", currency: "BRL",
});

function htmlAviso(p: { referencia: string; cliente_nome: string | null; valor_centavos: number }) {
  const primeiroNome = escapar((p.cliente_nome ?? "").trim().split(/\s+/)[0] || "Olá");
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#182230">
  <div style="max-width:580px;margin:0 auto;padding:32px 18px">
    <div style="background:#fff;border:1px solid #e5e9ef;border-radius:14px;padding:30px">
      <h1 style="margin:0 0 16px;font-size:22px">Seu pedido não foi concluído</h1>
      <p style="font-size:15px;line-height:1.6">${primeiroNome}, não identificamos a confirmação do pagamento do pedido <strong>${escapar(p.referencia)}</strong>.</p>
      <div style="margin:20px 0;padding:16px;border-radius:9px;background:#fff5f5;border:1px solid #f1c7c7">
        <strong>Não realize o pagamento deste Pix.</strong>
      </div>
      <p style="font-size:14px;line-height:1.6">Valor do pedido: <strong>${moeda(p.valor_centavos)}</strong>.</p>
      <p style="font-size:14px;line-height:1.6">Caso já tenha efetuado o pagamento, entre em contato com o atendimento e informe o número do pedido para verificação e possível reembolso.</p>
      <p style="margin-top:26px;font-size:12px;color:#697586">Este é um aviso transacional automático.</p>
    </div>
  </div>
</body></html>`;
}

export async function processarAvisosPix() {
  const db = supabaseAdmin();
  const resultado = { encontrados: 0, enviados: 0, ignorados: 0, erros: 0 };
  if (!db) return resultado;

  const limite = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data, error } = await db.from("pedidos")
    .select("id,referencia,pix_id,status,cliente_nome,cliente_email,valor_centavos,aviso_pix_tentativas")
    .eq("status", "pendente")
    .eq("metodo_pagamento", "pix")
    .is("aviso_pix_em", null)
    .lte("criado_em", limite)
    .order("criado_em", { ascending: true })
    .limit(LIMITE);

  if (error) throw new Error(error.message);
  resultado.encontrados = data?.length ?? 0;

  for (const pedido of data ?? []) {
    const agora = new Date().toISOString();
    // Reserva a linha antes de consultar/enviar para impedir duplicidade entre execuções.
    const { data: reservado } = await db.from("pedidos")
      .update({ aviso_pix_em: agora, aviso_pix_erro: null })
      .eq("id", pedido.id).is("aviso_pix_em", null)
      .select("id").maybeSingle();
    if (!reservado) { resultado.ignorados++; continue; }

    try {
      if (!pedido.pix_id || !pedido.cliente_email || !emailValido(pedido.cliente_email)) {
        resultado.ignorados++;
        continue;
      }

      const pix = await consultarPix(pedido.pix_id);
      if (pix.status !== "pending") {
        const status = pix.status === "approved" || pix.status === "paid" ? "aprovado"
          : pix.status === "expired" ? "expirado" : "falhou";
        await db.from("pedidos").update({
          status,
          ...(status === "aprovado" ? { pago_em: pix.paid_at ?? agora } : {}),
        }).eq("id", pedido.id);
        resultado.ignorados++;
        continue;
      }

      await enviarUm(
        pedido.cliente_email,
        `Aviso sobre o pedido ${pedido.referencia}`,
        htmlAviso(pedido),
      );
      resultado.enviados++;
    } catch (e) {
      resultado.erros++;
      await db.from("pedidos").update({
        aviso_pix_em: null,
        aviso_pix_erro: String((e as Error).message).slice(0, 500),
        aviso_pix_tentativas: Number(pedido.aviso_pix_tentativas ?? 0) + 1,
      }).eq("id", pedido.id);
    }
  }

  return resultado;
}
