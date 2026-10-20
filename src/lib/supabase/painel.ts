import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Somente leituras do painel usam este cliente. Pagamentos e webhooks
// continuam com o cliente e os prazos próprios de cada integração.
let cliente: SupabaseClient | null = null;
export const PRAZO_LEITURA_PAINEL_MS = 8000;

export function supabasePainel(): SupabaseClient | null {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) return null;
  if (!cliente) {
    cliente = createClient(SUPABASE_URL, chave, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, {
          ...init,
          signal: AbortSignal.any([
            AbortSignal.timeout(PRAZO_LEITURA_PAINEL_MS),
            ...(init?.signal ? [init.signal] : []),
          ]),
        }),
      },
    });
  }
  return cliente;
}
