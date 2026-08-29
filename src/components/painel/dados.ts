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

export type Endereco = {
  logradouro?: string; numero?: string; complemento?: string;
  bairro?: string; localidade?: string; uf?: string; cep?: string;
};

export type PedidoDetalhe = Pedido & {
  pix_id: string | null;
  subtotal_centavos: number; desconto_centavos: number; frete_centavos: number;
  frete_tipo: string | null;
  cliente_documento: string | null; cliente_telefone: string | null;
  endereco: Endereco | null;
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

/* ---------- período ---------- */
export type Periodo = { de: string; ate: string; dias: number; rotulo: string };

export const PERIODOS: Record<string, { dias: number; rotulo: string }> = {
  hoje: { dias: 1, rotulo: "Hoje" },
  "7d": { dias: 7, rotulo: "7 dias" },
  "30d": { dias: 30, rotulo: "30 dias" },
  "90d": { dias: 90, rotulo: "90 dias" },
};

/** Resolve o período a partir da URL, com 30 dias como padrão. */
export function resolverPeriodo(busca?: { periodo?: string; de?: string; ate?: string }): Periodo {
  const hoje = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  // intervalo escolhido à mão vence o atalho
  if (busca?.de && busca?.ate && /^\d{4}-\d{2}-\d{2}$/.test(busca.de) && /^\d{4}-\d{2}-\d{2}$/.test(busca.ate)) {
    const de = new Date(busca.de + "T00:00:00");
    const ate = new Date(busca.ate + "T00:00:00");
    if (de <= ate) {
      const dias = Math.round((ate.getTime() - de.getTime()) / 86400000) + 1;
      return { de: busca.de, ate: busca.ate, dias, rotulo: `${busca.de} a ${busca.ate}` };
    }
  }

  const p = PERIODOS[busca?.periodo ?? "30d"] ?? PERIODOS["30d"];
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - (p.dias - 1));
  return { de: iso(inicio), ate: iso(hoje), dias: p.dias, rotulo: p.rotulo };
}

/* Fim do dia final, para o filtro pegar o dia inteiro. */
const fimDoDia = (d: string) => `${d}T23:59:59.999Z`;
const inicioDoDia = (d: string) => `${d}T00:00:00.000Z`;

export const lerResumo = (p?: Periodo) =>
  p
    ? ler<Resumo>("resumo_periodo", VAZIO_RESUMO, async (db) => {
        const { data, error } = await db.from("pedidos")
          .select("status,valor_centavos,criado_em")
          .gte("criado_em", inicioDoDia(p.de)).lte("criado_em", fimDoDia(p.ate));
        if (error) return { data: null, error };
        const linhas = (data ?? []) as { status: string; valor_centavos: number; criado_em: string }[];
        const pagos = linhas.filter((l) => l.status === "aprovado");
        const hoje = new Date().toISOString().slice(0, 10);
        const doDia = linhas.filter((l) => l.criado_em.slice(0, 10) === hoje);
        return {
          data: {
            pedidos_total: linhas.length,
            pedidos_pagos: pagos.length,
            pedidos_pendentes: linhas.filter((l) => l.status === "pendente").length,
            receita_centavos: pagos.reduce((a, l) => a + l.valor_centavos, 0),
            receita_hoje_centavos: doDia.filter((l) => l.status === "aprovado").reduce((a, l) => a + l.valor_centavos, 0),
            pedidos_hoje: doDia.length,
          },
          error: null,
        };
      })
    : ler<Resumo>("painel_resumo", VAZIO_RESUMO, (db) => db.from("painel_resumo").select("*").single());

export const lerVendasPorDia = (p?: Periodo) =>
  ler<DiaVenda[]>("vendas_por_dia", [], (db) => {
    const q = db.from("vendas_por_dia").select("*").order("dia");
    return p ? q.gte("dia", p.de).lte("dia", p.ate) : q;
  });

export const lerFunil = () =>
  ler<Funil>("funil_24h", VAZIO_FUNIL, (db) => db.from("funil_24h").select("*").single());

export const lerAoVivo = () =>
  ler<Sessao[]>("ao_vivo", [], (db) => db.from("ao_vivo").select("*").order("visto_em", { ascending: false }).limit(200));

export const POR_PAGINA = 10;

/** Uma página de pedidos + o total, para montar a paginação.
    `count: "exact"` vem fora de `data`, por isso não usa o helper `ler`. */
export async function lerPaginaPedidos(pagina: number): Promise<{ linhas: Pedido[]; total: number }> {
  const db = supabaseAdmin();
  if (!db) return { linhas: [], total: 0 };
  const de = (Math.max(1, pagina) - 1) * POR_PAGINA;
  try {
    const { data, error, count } = await db.from("pedidos")
      .select("id,referencia,status,valor_centavos,kit,quantidade,cliente_nome,cliente_email,criado_em,pago_em",
        { count: "exact" })
      .order("criado_em", { ascending: false })
      .range(de, de + POR_PAGINA - 1);
    if (error) { console.error("[painel] pedidos:", error); return { linhas: [], total: 0 }; }
    return { linhas: (data as Pedido[]) ?? [], total: count ?? 0 };
  } catch (e) {
    console.error("[painel] pedidos:", (e as Error).message);
    return { linhas: [], total: 0 };
  }
}

export const lerPedido = (id: string) =>
  ler<PedidoDetalhe | null>("pedido", null, (db) =>
    db.from("pedidos").select("*").eq("id", id).single());

export const moeda = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ---------- diagnóstico de instalação ---------- */
export const TABELAS = [
  { nome: "pedidos", para: "Pedidos e receita" },
  { nome: "eventos", para: "Funil e rastreamento" },
  { nome: "sessoes", para: "Visitantes ao vivo e mapa" },
  { nome: "eventos_webhook", para: "Confirmação de pagamento" },
  { nome: "configuracoes", para: "Integrações salvas no painel" },
  { nome: "conversas", para: "WhatsApp" },
  { nome: "mensagens", para: "WhatsApp" },
  { nome: "treinamento", para: "Robô do WhatsApp" },
] as const;

export type EstadoTabela = { nome: string; para: string; existe: boolean };

/** Consulta cada tabela de verdade — `head:true` devolve 204 até para tabela
    inexistente, então o SELECT precisa pedir uma linha. */
export async function estadoInstalacao(): Promise<EstadoTabela[] | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  return Promise.all(TABELAS.map(async ({ nome, para }) => {
    const { error } = await db.from(nome).select("*").limit(1);
    // PGRST205 = tabela ausente do cache do schema. Outros erros (RLS, etc.)
    // significam que a tabela existe.
    const existe = !error || (error as { code?: string }).code !== "PGRST205";
    return { nome, para, existe };
  }));
}
