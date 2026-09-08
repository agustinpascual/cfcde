import "server-only";
import { confirmarPorEmail, depois, registrarCompraNoPixel } from "./confirmar-pedido";
import { entregarAcessoApp } from "./entrega-app";
import { consultarPix } from "./gateways-pix";
import { ehAxxon, idRemotoAxxon } from "./axxonpay-protocolo";
import { consultarPagamentoAxxon } from "./axxonpay";
import { sincronizarAxxon } from "./pagamentos-axxon";
import { supabaseAdmin } from "./supabase/servidor";

/* Rede de segurança do pagamento. O webhook é o caminho normal, mas ele pode
   falhar (segredo errado, indisponibilidade, evento não cadastrado). Aqui a
   gente pergunta o status direto para a PinPay e corrige o pedido — assim
   "pago mas mostrando pendente" se resolve sozinho no próximo ciclo. */

const MAPA: Record<string, string> = {
  approved: "aprovado",
  paid: "aprovado",
  failed: "falhou",
  refused: "falhou",
  expired: "expirado",
  refunded: "estornado",
};

export type ResultadoReconciliacao = {
  verificados: number;
  atualizados: number;
  aprovados: number;
  erros: number;
};

/** Confere os pedidos pendentes (opcionalmente um só) contra a PinPay. */
export async function reconciliarPendentes(limite = 100): Promise<ResultadoReconciliacao> {
  const db = supabaseAdmin();
  const r: ResultadoReconciliacao = { verificados: 0, atualizados: 0, aprovados: 0, erros: 0 };
  if (!db) throw new Error("Supabase não configurado");
  const prazo = Date.now() + 40_000;

  const { data: pendentes, error: erroLeitura } = await db.from("pedidos")
    .select("referencia,pix_id,status,valor_centavos")
    .eq("status", "pendente")
    .in("metodo_pagamento", ["pix", "cartao"])
    .not("pix_id", "is", null)
    .order("pix_conferido_em", { ascending: true, nullsFirst: true })
    .order("criado_em", { ascending: true })
    .limit(limite);
  if (erroLeitura) throw new Error(erroLeitura.message);

  for (const p of pendentes ?? []) {
    if (Date.now() >= prazo) break;
    // Reserva a tentativa no histórico antes da rede, inclusive se a PinPay falhar.
    const { data: reservado, error: erroReserva } = await db.from("pedidos")
      .update({ pix_conferido_em: new Date().toISOString() })
      .eq("referencia", p.referencia).eq("status", "pendente")
      .in("metodo_pagamento", ["pix", "cartao"]).select("referencia").maybeSingle();
    if (erroReserva) { r.erros++; continue; }
    if (!reservado) continue;
    r.verificados++;
    try {
      if (ehAxxon(p.pix_id)) {
        const resultado = await sincronizarAxxon(await consultarPagamentoAxxon(idRemotoAxxon(p.pix_id), AbortSignal.timeout(8000)));
        if (MAPA[resultado.status]) r.atualizados++;
        if (resultado.status === "approved") r.aprovados++;
        continue;
      }
      const pix = await consultarPix(p.pix_id as string, AbortSignal.timeout(8000));
      if (pix.amount !== p.valor_centavos ||
          (pix.external_reference && pix.external_reference !== p.referencia)) {
        throw new Error("Dados da transação divergem do pedido");
      }
      const novo = MAPA[pix.status];
      if (!novo || novo === "pendente") continue;   // ainda em aberto

      const aprovado = novo === "aprovado";
      const { data: atualizado, error } = await db.from("pedidos").update({
        status: novo,
        ...(aprovado ? { pago_em: pix.paid_at ?? pix.updated_at ?? new Date().toISOString() } : {}),
      }).eq("referencia", p.referencia).eq("status", "pendente")
        .eq("metodo_pagamento", "pix").select("referencia").maybeSingle();

      if (error) { r.erros++; continue; }
      if (!atualizado) continue; // O webhook ou outra consulta já atualizou o pedido.
      r.atualizados++;

      if (aprovado) {
        r.aprovados++;
        // A aprovação por consulta também precisa confirmar a compra por e-mail.
        depois(confirmarPorEmail(p.referencia as string).then((resultado) => {
          if (!resultado.ok) console.error("[reconciliar] confirmação falhou:", resultado.motivo);
        }));
        depois(registrarCompraNoPixel(p.referencia as string));
        depois(entregarAcessoApp(p.referencia as string).then((resultado) => {
          if (!resultado.ok) console.error("[reconciliar] entrega do app falhou:", resultado.motivo);
        }));
      }
    } catch {
      r.erros++;
    }
  }
  return r;
}
