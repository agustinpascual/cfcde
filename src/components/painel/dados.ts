import "server-only";
import { supabaseAdmin } from "@/lib/supabase/servidor";

/* Leituras do painel. Tudo pelo service_role no servidor — o navegador
   nunca fala direto com o banco. Se o Supabase não estiver configurado,
   devolve estruturas vazias em vez de quebrar a tela. */

export type Resumo = {
  pedidos_total: number; pedidos_pagos: number; pedidos_pendentes: number;
  receita_centavos: number; receita_hoje_centavos: number; pedidos_hoje: number;
};
export type DiaVenda = { dia: string; pedidos: number; pagos: number; receita_centavos: number };
export type Funil = { visitantes: number; checkout: number; pix_gerado: number; pix_copiado: number; compras: number };
export type Sessao = {
  sessao: string; pagina: string | null; secao: string | null;
  cidade: string | null; uf: string | null; latitude: number | null; longitude: number | null;
  dispositivo: string | null; copiou_pix: boolean; pedido_ref: string | null;
  segundos_no_site: number; visto_em: string;
};
export type Pedido = {
  id: string; referencia: string; status: string; valor_centavos: number;
  kit: string | null; quantidade: number; cliente_nome: string | null;
  cliente_email: string | null; criado_em: string; pago_em: string | null;
};

const VAZIO_RESUMO: Resumo = {
  pedidos_total: 0, pedidos_pagos: 0, pedidos_pendentes: 0,
  receita_centavos: 0, receita_hoje_centavos: 0, pedidos_hoje: 0,
};
const VAZIO_FUNIL: Funil = { visitantes: 0, checkout: 0, pix_gerado: 0, pix_copiado: 0, compras: 0 };

export const configurado = () => Boolean(supabaseAdmin());

async function ler<T>(view: string, cair: T, montar: (db: NonNullable<ReturnType<typeof supabaseAdmin>>) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  const db = supabaseAdmin();
  if (!db) return cair;
  try {
    const { data, error } = await montar(db);
    if (error) { console.error(`[painel] ${view}:`, error); return cair; }
    return (data as T) ?? cair;
  } catch (e) {
    console.error(`[painel] ${view}:`, (e as Error).message);
    return cair;
  }
}

export const lerResumo = () =>
  ler<Resumo>("painel_resumo", VAZIO_RESUMO, (db) => db.from("painel_resumo").select("*").single());

export const lerVendasPorDia = () =>
  ler<DiaVenda[]>("vendas_por_dia", [], (db) => db.from("vendas_por_dia").select("*").order("dia"));

export const lerFunil = () =>
  ler<Funil>("funil_24h", VAZIO_FUNIL, (db) => db.from("funil_24h").select("*").single());

export const lerAoVivo = () =>
  ler<Sessao[]>("ao_vivo", [], (db) => db.from("ao_vivo").select("*").order("visto_em", { ascending: false }).limit(200));

export const lerPedidos = (limite = 50) =>
  ler<Pedido[]>("pedidos", [], (db) =>
    db.from("pedidos")
      .select("id,referencia,status,valor_centavos,kit,quantidade,cliente_nome,cliente_email,criado_em,pago_em")
      .order("criado_em", { ascending: false }).limit(limite));

export const moeda = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
