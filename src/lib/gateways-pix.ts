import "server-only";
import { consultarPix as consultarPinpay, type PixStatus } from "./pinpay";
import { consultarPagamentoAxxon } from "./axxonpay";
import { ehAxxon, idRemotoAxxon, idAxxon, statusAxxon } from "./axxonpay-protocolo";

/** Gateway persistido no ID; a seleção atual nunca altera cobranças antigas. */
export async function consultarPix(id: string, signal?: AbortSignal): Promise<PixStatus> {
  if (!ehAxxon(id)) return consultarPinpay(id, signal);
  const p = await consultarPagamentoAxxon(idRemotoAxxon(id), signal);
  return { id: idAxxon(p.id), amount: p.amount, status: statusAxxon(p.status),
    paid_at: p.confirmedAt ?? undefined, external_reference: p.metadata?.external_reference };
}
