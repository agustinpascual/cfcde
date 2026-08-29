import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/* Cliente com service_role: ignora RLS e é o único que ESCREVE.
   Só existe no servidor — a chave nunca pode ir para o browser. */
let cliente: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient | null {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) return null; // sem chave, o site funciona; só não registra nada
  if (!cliente) {
    cliente = createClient(SUPABASE_URL, chave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}
