import "server-only";
import { ler } from "./config-integracoes";
import { supabaseAdmin } from "./supabase/servidor";

/* Libera o acesso ao app quando a PinPay confirma o pagamento.
   Não criamos conta nem senha aqui: chamamos o endpoint do próprio app
   (app-bella-two), que cria o usuário em auth.users, confirma o e-mail e
   envia a senha. Mandar só a referência é de propósito — o app busca e-mail
   e nome na tabela de pedidos, então a integração não depende do formato do
   webhook da PinPay, que pode mudar. */

export type ResultadoAcesso = { ok: boolean; status?: string; motivo?: string };

export async function entregarAcessoApp(pedidoRef: string): Promise<ResultadoAcesso> {
  const db = supabaseAdmin();
  if (!db) return { ok: false, motivo: "sem_supabase" };

  const [url, token] = await Promise.all([
    ler("BBF_PROVISIONAMENTO_URL"),
    ler("BBF_PROVISIONAMENTO_TOKEN"),
  ]);
  if (!url || !token) return { ok: false, motivo: "provisionamento_nao_configurado" };

  try {
    // já liberado? o endpoint também é idempotente, mas evitamos a ida à rede
    const { data: existente } = await db.from("acessos_app")
      .select("status,provisionado_em").eq("pedido_ref", pedidoRef).maybeSingle();
    if (existente?.provisionado_em && existente.status !== "falhou") {
      return { ok: true, status: "ja_registrado" };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bbf-token": token },
      body: JSON.stringify({ referencia: pedidoRef }),
    });

    const corpo = await res.json().catch(() => ({}));

    if (!res.ok) {
      // 404 = pedido não aprovado ainda; 401 = token; 503 = app sem config
      await registrar(db, pedidoRef, corpo?.email ?? null, "falhou", `HTTP ${res.status}: ${JSON.stringify(corpo).slice(0, 160)}`);
      return { ok: false, motivo: `HTTP ${res.status}`, status: String(res.status) };
    }

    const status = corpo?.status ?? "criado";   // "criado" | "ja_existia"
    await registrar(db, pedidoRef, corpo?.email ?? null, status,
      corpo?.enviouEmail === false ? "conta criada, mas o app não enviou o e-mail (Resend do app)" : null);
    return { ok: true, status };
  } catch (e) {
    await registrar(db, pedidoRef, null, "falhou", (e as Error).message.slice(0, 160));
    return { ok: false, motivo: (e as Error).message.slice(0, 120) };
  }
}

async function registrar(
  db: NonNullable<ReturnType<typeof supabaseAdmin>>,
  pedidoRef: string, email: string | null, status: string, detalhe: string | null
) {
  const enviado = status !== "falhou";
  await db.from("acessos_app").upsert({
    pedido_ref: pedidoRef, email, status, detalhe,
    ...(enviado ? { provisionado_em: new Date().toISOString() } : {}),
  }, { onConflict: "pedido_ref" });
}
