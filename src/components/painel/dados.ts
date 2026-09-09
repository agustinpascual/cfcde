import "server-only";
import { supabaseAdmin } from "@/lib/supabase/servidor";

/* Leituras do painel. Tudo pelo service_role no servidor — o navegador
   nunca fala direto com o banco. Se o Supabase não estiver configurado,
   devolve estruturas vazias em vez de quebrar a tela. */

export type Resumo = {
  pedidos_total: number; pedidos_pagos: number; pedidos_pendentes: number;
  receita_centavos: number; receita_hoje_centavos: number; pedidos_hoje: number;
  taxa_gateway_percentual_centavos: number; taxa_gateway_fixa_centavos: number;
  taxas_gateway_centavos: number; receita_liquida_centavos: number;
};
export type DiaVenda = { dia: string; pedidos: number; pagos: number; receita_centavos: number };
export type Funil = { visitantes: number; checkout: number; pix_gerado: number; pix_copiado: number; compras: number };
export type Sessao = {
  sessao: string; pagina: string | null; secao: string | null;
  cidade: string | null; uf: string | null; latitude: number | null; longitude: number | null;
  dispositivo: string | null; copiou_pix: boolean; pedido_ref: string | null;
  segundos_no_site: number; visto_em: string; ip?: string | null; pais?: string | null;
};

export function rotuloDispositivo(valor: string | null): string {
  const rotulos: Record<string, string> = {
    iphone: "Apple · iPhone", ipad: "Apple · iPad", android: "Android",
    android_tablet: "Android · Tablet", mac: "Apple · Mac",
    windows: "Computador · Windows", linux: "Computador · Linux",
    mobile: "Celular", tablet: "Tablet", desktop: "Computador",
  };
  return valor ? rotulos[valor] ?? "Outro dispositivo" : "Dispositivo não identificado";
}

export const dispositivoApple = (valor: string | null) =>
  valor === "iphone" || valor === "ipad";
export const dispositivoAndroid = (valor: string | null) =>
  valor === "android" || valor === "android_tablet";
export const dispositivoComputador = (valor: string | null) =>
  valor === "desktop" || valor === "mac" || valor === "windows" || valor === "linux";
export type Pedido = {
  id: string; referencia: string; status: string; valor_centavos: number;
  metodo_pagamento: string;
  kit: string | null; quantidade: number; cliente_nome: string | null;
  cliente_email: string | null; criado_em: string; pago_em: string | null;
};

export type Endereco = {
  logradouro?: string; numero?: string; complemento?: string;
  bairro?: string; localidade?: string; uf?: string; cep?: string;
};

export type PedidoDetalhe = Pedido & {
  pix_id: string | null;
  /* Opcionais: só existem depois da migration 0021. Marcados com `?` para o
     painel continuar funcionando se ela ainda não tiver sido aplicada. */
  codigo_rastreio?: string | null;
  rastreio_atualizado?: string | null;
  /* Copia-e-cola e QR da cobrança PIX (migration 0024). */
  pix_copia_cola?: string | null;
  pix_qr_url?: string | null;
  subtotal_centavos: number; desconto_centavos: number; frete_centavos: number;
  frete_tipo: string | null;
  cliente_documento: string | null; cliente_telefone: string | null;
  endereco: Endereco | null;
};

const VAZIO_RESUMO: Resumo = {
  pedidos_total: 0, pedidos_pagos: 0, pedidos_pendentes: 0,
  receita_centavos: 0, receita_hoje_centavos: 0, pedidos_hoje: 0,
  taxa_gateway_percentual_centavos: 0, taxa_gateway_fixa_centavos: 0,
  taxas_gateway_centavos: 0, receita_liquida_centavos: 0,
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

const FUSO_PAINEL = "America/Sao_Paulo";
const FORMATO_DATA_PAINEL = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_PAINEL, year: "numeric", month: "2-digit", day: "2-digit",
});

/** Data civil usada pelo painel, sem depender do fuso UTC do servidor. */
export function hojeNoPainel(agora = new Date()): string {
  const partes = Object.fromEntries(
    FORMATO_DATA_PAINEL.formatToParts(agora).map((p) => [p.type, p.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}`;
}

const deslocarData = (iso: string, dias: number) => {
  const data = new Date(`${iso}T12:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
};

const dataLegivel = (iso: string) => iso.split("-").reverse().join("/");

/** Resolve o período a partir da URL, com hoje como padrão. */
export function resolverPeriodo(busca?: { periodo?: string; de?: string; ate?: string }): Periodo {
  const hoje = hojeNoPainel();

  // intervalo escolhido à mão vence o atalho
  if (busca?.de && busca?.ate && /^\d{4}-\d{2}-\d{2}$/.test(busca.de) && /^\d{4}-\d{2}-\d{2}$/.test(busca.ate)) {
    const de = Date.parse(`${busca.de}T12:00:00.000Z`);
    const ate = Date.parse(`${busca.ate}T12:00:00.000Z`);
    if (Number.isFinite(de) && Number.isFinite(ate) && de <= ate && busca.ate <= hoje) {
      const dias = Math.round((ate - de) / 86400000) + 1;
      const rotulo = busca.de === busca.ate
        ? dataLegivel(busca.de)
        : `${dataLegivel(busca.de)} a ${dataLegivel(busca.ate)}`;
      return { de: busca.de, ate: busca.ate, dias, rotulo };
    }
  }

  const p = PERIODOS[busca?.periodo ?? "hoje"] ?? PERIODOS.hoje;
  return { de: deslocarData(hoje, -(p.dias - 1)), ate: hoje, dias: p.dias, rotulo: p.rotulo };
}

/* O banco armazena timestamps em UTC, mas um dia do painel segue São Paulo.
   O offset -03:00 converte exatamente da meia-noite local para o intervalo UTC. */
const fimDoDia = (d: string) => `${d}T23:59:59.999-03:00`;
const inicioDoDia = (d: string) => `${d}T00:00:00.000-03:00`;

export const lerResumo = (p?: Periodo) =>
  p
    ? ler<Resumo>("resumo_periodo", VAZIO_RESUMO, async (db) => {
        const { data, error } = await db.from("pedidos")
          .select("status,valor_centavos,criado_em")
          .gte("criado_em", inicioDoDia(p.de)).lte("criado_em", fimDoDia(p.ate));
        if (error) return { data: null, error };
        const linhas = (data ?? []) as { status: string; valor_centavos: number; criado_em: string }[];
        const pagos = linhas.filter((l) => l.status === "aprovado");
        const hoje = hojeNoPainel();
        const doDia = linhas.filter((l) => hojeNoPainel(new Date(l.criado_em)) === hoje);
        /* O gateway desconta 5,99% + R$ 1,50 em cada transacao aprovada.
           Arredondar o percentual pedido a pedido reproduz melhor o extrato do
           que aplicar a porcentagem uma unica vez sobre o faturamento total. */
        const taxaPercentual = pagos.reduce(
          (total, pedido) => total + Math.round(pedido.valor_centavos * 0.0599), 0,
        );
        const taxaFixa = pagos.length * 150;
        const receita = pagos.reduce((a, l) => a + l.valor_centavos, 0);
        return {
          data: {
            pedidos_total: linhas.length,
            pedidos_pagos: pagos.length,
            pedidos_pendentes: linhas.filter((l) => l.status === "pendente").length,
            receita_centavos: receita,
            receita_hoje_centavos: doDia.filter((l) => l.status === "aprovado").reduce((a, l) => a + l.valor_centavos, 0),
            pedidos_hoje: doDia.length,
            taxa_gateway_percentual_centavos: taxaPercentual,
            taxa_gateway_fixa_centavos: taxaFixa,
            taxas_gateway_centavos: taxaPercentual + taxaFixa,
            receita_liquida_centavos: receita - taxaPercentual - taxaFixa,
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

/** Funil do período escolhido. As etapas de navegação vêm dos eventos, mas a
    compra vem de `pedidos`: o webhook confirma vendas mesmo que o cliente já
    tenha fechado a página, portanto é a fonte confiável para esse número. */
export async function lerFunil(p?: Periodo): Promise<Funil> {
  if (!p) return ler<Funil>("funil_24h", VAZIO_FUNIL, (db) => db.from("funil_24h").select("*").single());
  const db = supabaseAdmin();
  if (!db) return VAZIO_FUNIL;

  try {
    /* O PostgREST limita cada resposta (normalmente a 1.000 linhas). Buscar
       cada etapa paginada impede o funil de diminuir artificialmente quando
       o período tem bastante tráfego. */
    const sessoesDaEtapa = async (tipo: string) => {
      const unicas = new Set<string>();
      const tamanho = 1000;
      for (let pagina = 0; pagina < 50; pagina++) {
        const { data, error } = await db.from("eventos").select("id,sessao")
          .eq("tipo", tipo)
          .gte("criado_em", inicioDoDia(p.de)).lte("criado_em", fimDoDia(p.ate))
          .order("id", { ascending: true })
          .range(pagina * tamanho, (pagina + 1) * tamanho - 1);
        if (error) throw new Error(`eventos ${tipo}: ${error.message}`);
        for (const evento of data ?? []) unicas.add(evento.sessao);
        if ((data?.length ?? 0) < tamanho) break;
      }
      return unicas.size;
    };

    const [visitantes, checkout, pixGerado, pixCopiado, pagosR, pagosAntigosR] = await Promise.all([
      sessoesDaEtapa("pageview"), sessoesDaEtapa("checkout"),
      sessoesDaEtapa("pix_gerado"), sessoesDaEtapa("pix_copiado"),
      db.from("pedidos").select("referencia", { count: "exact", head: true }).eq("status", "aprovado")
        .gte("pago_em", inicioDoDia(p.de)).lte("pago_em", fimDoDia(p.ate)),
      /* Compatibilidade com pedidos antigos aprovados antes de `pago_em`
         passar a ser preenchido pelo webhook. */
      db.from("pedidos").select("referencia", { count: "exact", head: true }).eq("status", "aprovado").is("pago_em", null)
        .gte("criado_em", inicioDoDia(p.de)).lte("criado_em", fimDoDia(p.ate)),
    ]);

    if (pagosR.error) console.error("[painel] funil:pagos:", pagosR.error);
    if (pagosAntigosR.error) console.error("[painel] funil:pagos_antigos:", pagosAntigosR.error);
    const compras = (pagosR.count ?? 0) + (pagosAntigosR.count ?? 0);

    return {
      visitantes, checkout, pix_gerado: pixGerado, pix_copiado: pixCopiado, compras,
    };
  } catch (e) {
    console.error("[painel] funil:", (e as Error).message);
    return VAZIO_FUNIL;
  }
}

export const lerAoVivo = () =>
  ler<Sessao[]>("ao_vivo", [], (db) => db.from("ao_vivo").select("*").order("visto_em", { ascending: false }).limit(200));

export const POR_PAGINA = 10;

export type FiltroPedidos = {
  busca?: string; status?: string; metodo?: string; de?: string; ate?: string;
  /* Listas de status/métodos crus (DB) — usadas na exportação, que deixa
     escolher vários ao mesmo tempo. Têm prioridade sobre status/metodo. */
  statusRaw?: string[]; metodoRaw?: string[];
};

/* Expande rótulos amigáveis ("pago", "recusado") nos status reais do banco. */
export const expandirStatus = (chaves: string[]) => chaves.flatMap((c) => STATUS_FILTRO[c] ?? []);
export const expandirMetodo = (chaves: string[]) => chaves.flatMap((c) => METODO_FILTRO[c] ?? []);

/* Aplica os filtros da lista de pedidos numa query do PostgREST. Vive num só
   lugar para a listagem e a exportação nunca divergirem no que consideram
   "filtrado". O builder é tipado como `any`: seus tipos encadeados são
   recursivos demais e estouram o compilador num genérico. */
/* eslint-disable @typescript-eslint/no-explicit-any */
function filtrarPedidos(q: any, f: FiltroPedidos): any {
  const busca = f.busca?.trim();
  if (busca) {
    const so = busca.replace(/[%,()]/g, " ");
    const dig = busca.replace(/\D/g, "");
    const alvos = [`cliente_nome.ilike.*${so}*`, `cliente_email.ilike.*${so}*`, `referencia.ilike.*${so}*`];
    if (dig) alvos.push(`cliente_documento.ilike.*${dig}*`, `cliente_telefone.ilike.*${dig}*`);
    q = q.or(alvos.join(","));
  }
  const st = f.statusRaw?.length ? f.statusRaw : (f.status ? STATUS_FILTRO[f.status] : undefined);
  if (st?.length) q = q.in("status", st);
  const mt = f.metodoRaw?.length ? f.metodoRaw : (f.metodo ? METODO_FILTRO[f.metodo] : undefined);
  if (mt?.length) q = q.in("metodo_pagamento", mt);
  if (f.de && /^\d{4}-\d{2}-\d{2}$/.test(f.de)) q = q.gte("criado_em", inicioDoDia(f.de));
  if (f.ate && /^\d{4}-\d{2}-\d{2}$/.test(f.ate)) q = q.lte("criado_em", fimDoDia(f.ate));
  return q;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* Rótulo amigável → status reais no banco. "Recusado" cobre também as falhas e
   expirações, que para o lojista são a mesma coisa: não pagou. */
const STATUS_FILTRO: Record<string, string[]> = {
  pago: ["aprovado"],
  pendente: ["pendente"],
  recusado: ["recusado", "falhou", "expirado"],
  estornado: ["estornado"],
};
const METODO_FILTRO: Record<string, string[]> = {
  pix: ["pix"],
  cartao: ["cartao", "cartao_sandbox"],
};

/** Uma página de pedidos + o total, para montar a paginação.
    `count: "exact"` vem fora de `data`, por isso não usa o helper `ler`. */
export async function lerPaginaPedidos(
  pagina: number, filtros: FiltroPedidos = {},
): Promise<{ linhas: Pedido[]; total: number }> {
  const db = supabaseAdmin();
  if (!db) return { linhas: [], total: 0 };
  const de = (Math.max(1, pagina) - 1) * POR_PAGINA;
  try {
    const q = filtrarPedidos(
      db.from("pedidos").select(
        "id,referencia,status,metodo_pagamento,valor_centavos,kit,quantidade,cliente_nome,cliente_email,criado_em,pago_em",
        { count: "exact" }),
      filtros,
    );

    const { data, error, count } = await q
      .order("criado_em", { ascending: false })
      .range(de, de + POR_PAGINA - 1);
    if (error) { console.error("[painel] pedidos:", error); return { linhas: [], total: 0 }; }
    return { linhas: (data as Pedido[]) ?? [], total: count ?? 0 };
  } catch (e) {
    console.error("[painel] pedidos:", (e as Error).message);
    return { linhas: [], total: 0 };
  }
}

export type PedidoExport = {
  referencia: string; criado_em: string; pago_em: string | null;
  status: string; metodo_pagamento: string;
  cliente_nome: string | null; cliente_email: string | null;
  cliente_documento: string | null; cliente_telefone: string | null;
  kit: string | null; quantidade: number;
  subtotal_centavos: number; desconto_centavos: number; frete_centavos: number; valor_centavos: number;
  frete_tipo: string | null; codigo_rastreio: string | null; endereco: Endereco | null;
};

/* Todos os pedidos que batem com o filtro, sem a paginação da tela — é o que o
   CSV precisa. Pagina internamente (teto do PostgREST) e tem um limite de
   segurança para não montar um arquivo gigante sem querer. */
export async function exportarPedidos(filtros: FiltroPedidos = {}, limite = 5000): Promise<PedidoExport[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const cols = "referencia,criado_em,pago_em,status,metodo_pagamento,cliente_nome,cliente_email,cliente_documento,cliente_telefone,kit,quantidade,subtotal_centavos,desconto_centavos,frete_centavos,valor_centavos,frete_tipo,codigo_rastreio,endereco";
  const linhas: PedidoExport[] = [];
  const tamanho = 1000;
  try {
    for (let pagina = 0; pagina < Math.ceil(limite / tamanho); pagina++) {
      const { data, error } = await filtrarPedidos(db.from("pedidos").select(cols), filtros)
        .order("criado_em", { ascending: false })
        .range(pagina * tamanho, (pagina + 1) * tamanho - 1);
      if (error) { console.error("[painel] exportar:", error.message); break; }
      const bloco = (data as PedidoExport[]) ?? [];
      linhas.push(...bloco);
      if (bloco.length < tamanho) break;
    }
  } catch (e) {
    console.error("[painel] exportar:", (e as Error).message);
  }
  return linhas.slice(0, limite);
}

export const lerPedido = (id: string) =>
  ler<PedidoDetalhe | null>("pedido", null, async (db) => {
    // Lista explícita: os campos legados de cartão nunca saem do banco.
    const base = "id,referencia,status,metodo_pagamento,valor_centavos,kit,quantidade,cliente_nome,cliente_email,criado_em,pago_em,pix_id,subtotal_centavos,desconto_centavos,frete_centavos,frete_tipo,cliente_documento,cliente_telefone,endereco";
    const opcionais = ["codigo_rastreio", "rastreio_atualizado", "pix_copia_cola", "pix_qr_url"];
    for (;;) {
      const resultado = await db.from("pedidos").select([base, ...opcionais].join(",")).eq("id", id).single();
      // Preserva compatibilidade com bancos sem as migrations opcionais,
      // sem recorrer a SELECT * nem esconder outros erros do banco.
      const erro = resultado.error;
      const faltante = erro && ["42703", "PGRST204"].includes(erro.code)
        ? opcionais.findIndex(coluna => erro.message.includes(coluna)) : -1;
      if (faltante === -1) return resultado;
      opcionais.splice(faltante, 1);
    }
  });

/* ---------- carrinhos abandonados ---------- */

export type CarrinhoAbandonado = {
  sessao: string; etapa: string;
  email: string | null; nome: string | null; telefone: string | null;
  cep: string | null; cidade: string | null; uf: string | null;
  produto_nome: string | null; valor: number | null;
  dispositivo: string | null; atualizado_em: string;
};

/* Carrinho abandonado = preencheu algum dado no checkout mas NÃO chegou a gerar
   o PIX. A sessão recebe `pedido_ref` quando o PIX é criado; então quem já tem
   pedido_ref saiu do abandono (virou pedido pendente, aparece na aba Pedidos).
   Junta o último `checkout_parcial` de cada sessão sem pedido. Sem contato não
   entra — não há o que recuperar. */
export async function lerCarrinhos(limite = 100): Promise<CarrinhoAbandonado[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  try {
    const { data: evs, error } = await db.from("eventos")
      .select("sessao,dados,criado_em").eq("tipo", "checkout_parcial")
      .order("criado_em", { ascending: false }).limit(600);
    if (error || !evs) return [];

    type Ev = { sessao: string; dados: Record<string, unknown> | null; criado_em: string };
    const porSessao = new Map<string, Ev>();
    for (const e of evs as Ev[]) if (!porSessao.has(e.sessao)) porSessao.set(e.sessao, e);
    const sessoes = [...porSessao.keys()];
    if (!sessoes.length) return [];

    const { data: ses } = await db.from("sessoes")
      .select("sessao,pedido_ref,dispositivo").in("sessao", sessoes);
    type S = { sessao: string; pedido_ref: string | null; dispositivo: string | null };
    const info = new Map((ses as S[] ?? []).map((s) => [s.sessao, s]));

    const lista: CarrinhoAbandonado[] = [];
    for (const [sessao, e] of porSessao) {
      const s = info.get(sessao);
      if (s?.pedido_ref) continue;   // gerou PIX → não é mais abandonado
      const d = e.dados ?? {};
      const str = (v: unknown) => (typeof v === "string" && v ? v : null);
      lista.push({
        sessao,
        etapa: str(d.etapa) ?? "Contato",
        email: str(d.email), nome: str(d.nome), telefone: str(d.telefone),
        cep: str(d.cep), cidade: str(d.cidade), uf: str(d.uf),
        produto_nome: str(d.produto_nome),
        valor: typeof d.valor === "number" ? d.valor : null,
        dispositivo: s?.dispositivo ?? null,
        atualizado_em: e.criado_em,
      });
    }
    return lista.slice(0, limite);
  } catch (e) {
    console.error("[painel] carrinhos:", (e as Error).message);
    return [];
  }
}

/* ---------- jornada do cliente (funil por pedido) ---------- */

export type EventoJornada = { tipo: string; pagina: string | null; dados: Record<string, unknown>; criado_em: string };
export type Jornada = {
  sessao: Sessao | null;
  eventos: EventoJornada[];
};

/* Liga o pedido à trilha de eventos da sessão que o gerou. A sessão recebe
   `pedido_ref` quando o PIX é criado; a partir dela lemos todos os eventos
   daquela visita (inclui os anteriores ao pedido, como o clique em comprar). */
export async function lerJornada(referencia: string): Promise<Jornada> {
  const sessao = await ler<Sessao | null>("jornada:sessao", null, (db) =>
    db.from("sessoes").select("*").eq("pedido_ref", referencia)
      .order("visto_em", { ascending: false }).limit(1).maybeSingle());
  if (!sessao) return { sessao: null, eventos: [] };
  const eventos = await ler<EventoJornada[]>("jornada:eventos", [], (db) =>
    db.from("eventos").select("tipo,pagina,dados,criado_em")
      .eq("sessao", sessao.sessao).order("criado_em", { ascending: true }));
  return { sessao, eventos };
}

/* True se o IP já está na blacklist — para o detalhe do pedido mostrar o
   estado certo do botão de bloquear. Falha em silêncio como "não bloqueado". */
export async function ipBloqueado(ip: string | null | undefined): Promise<boolean> {
  if (!ip) return false;
  return ler<boolean>("ip_bloqueado", false, async (db) => {
    const { data, error } = await db.from("ips_bloqueados").select("ip").eq("ip", ip).maybeSingle();
    return { data: Boolean(data), error };
  });
}

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
  { nome: "aprendizado", para: "Perguntas sem resposta do robô" },
  { nome: "acessos_app", para: "Acesso ao app entregue por e-mail" },
  { nome: "contatos", para: "Lista de e-mails" },
  { nome: "campanhas", para: "Disparos de e-mail" },
  { nome: "envios", para: "Status de entrega dos e-mails" },
] as const;

export type EstadoTabela = { nome: string; para: string; existe: boolean; colunasFaltando: string[] };

/* Colunas adicionadas por migrations posteriores. Tabela existir não basta:
   o webhook do WhatsApp morria inteiro porque `saudou_em` não tinha sido
   criada, e nada na tela indicava isso. */
const COLUNAS: Record<string, string[]> = {
  pedidos: ["metodo_pagamento", "aviso_pix_em"],
  conversas: ["saudou_em"],
  treinamento: ["escalar_mensagem", "saudacao_ativa", "saudacao_mensagem", "atendente_nome"],
};

/** Consulta cada tabela de verdade — `head:true` devolve 204 até para tabela
    inexistente, então o SELECT precisa pedir uma linha. */
export async function estadoInstalacao(): Promise<EstadoTabela[] | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  return Promise.all(TABELAS.map(async ({ nome, para }) => {
    const { error } = await db.from(nome).select(nome === "configuracoes" ? "chave" : "id").limit(1);
    // PGRST205 = tabela ausente do cache do schema. Outros erros (RLS, etc.)
    // significam que a tabela existe.
    const existe = !error || (error as { code?: string }).code !== "PGRST205";

    /* Em paralelo, não em série. O laço sequencial anterior fazia 9 idas ao
       banco só em `pedidos`, uma esperando a outra — ~1,8s somados, pagos em
       TODA tela do painel (a faixa de instalação está em todas). Como as
       sondagens são independentes, o custo passa a ser o da mais lenta. */
    let colunasFaltando: string[] = [];
    if (existe) {
      const sondas = await Promise.all((COLUNAS[nome] ?? []).map(async (coluna) => {
        const r = await db.from(nome).select(coluna).limit(1);
        // 42703 = coluna não existe
        return (r.error as { code?: string } | null)?.code === "42703" ? coluna : null;
      }));
      colunasFaltando = sondas.filter((c): c is string => c !== null);
    }
    return { nome, para, existe, colunasFaltando };
  }));
}
