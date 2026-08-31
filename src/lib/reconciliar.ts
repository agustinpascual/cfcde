import "server-only";
import { entregarAcessoApp } from "./entrega-app";
import { consultarPix } from "./pinpay";
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
  if (!db) return r;

  const { data: pendentes } = await db.from("pedidos")
    .select("referencia,pix_id,status")
    .eq("status", "pendente")
    .not("pix_id", "is", null)
    .order("criado_em", { ascending: false })
    .limit(limite);

  for (const p of pendentes ?? []) {
    r.verificados++;
    try {
      const pix = await consultarPix(p.pix_id as string);
      const novo = MAPA[pix.status];
      if (!novo || novo === "pendente") continue;   // ainda em aberto

      const aprovado = novo === "aprovado";
      const { error } = await db.from("pedidos").update({
        status: novo,
        ...(aprovado ? { pago_em: pix.paid_at ?? new Date().toISOString() } : {}),
      }).eq("referencia", p.referencia);

      if (error) { r.erros++; continue; }
      r.atualizados++;

      if (aprovado) {
        r.aprovados++;
        // libera o acesso ao app, como o webhook faria
        await entregarAcessoApp(p.referencia as string);
      }
    } catch {
      r.erros++;
    }
  }
  return r;
}
