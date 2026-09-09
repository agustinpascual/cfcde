import { autenticado } from "@/lib/painel-auth";
import { exportarPedidos, expandirStatus, expandirMetodo, type PedidoExport } from "@/components/painel/dados";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROTULO_STATUS: Record<string, string> = {
  aprovado: "Pago", pendente: "Aguardando", falhou: "Falhou",
  recusado: "Recusado", expirado: "Expirado", estornado: "Estornado",
};
const metodoLegivel = (m: string) => (m === "pix" ? "PIX" : m.startsWith("cartao") ? "Cartão" : m);

const dataBR = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }) : "";

/* Valor em reais com vírgula decimal, sem "R$": o Excel-BR lê como número. */
const reais = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

const doc = (v: string | null) => {
  if (!v) return "";
  const n = v.replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v;
};

const endereco = (e: PedidoExport["endereco"]) => {
  if (!e) return "";
  return [
    [e.logradouro, e.numero].filter(Boolean).join(", "),
    e.complemento, e.bairro,
    [e.localidade, e.uf].filter(Boolean).join(" - "),
    e.cep,
  ].filter(Boolean).join(" · ");
};

/* Campo CSV: entre aspas quando tiver ; aspas ou quebra de linha. Delimitador
   é ";" — o padrão do Excel em português. */
const campo = (v: unknown) => {
  const s = String(v ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const COLUNAS = [
  "Pedido", "Data", "Pago em", "Status", "Método", "Cliente", "E-mail",
  "CPF/CNPJ", "Telefone", "Produto", "Qtd", "Subtotal", "Desconto", "Frete",
  "Total", "Rastreio", "Endereço",
];

export async function GET(req: Request) {
  if (!(await autenticado())) return new Response("não autorizado", { status: 401 });

  const u = new URL(req.url);
  const lista = (nome: string) => (u.searchParams.get(nome) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  /* status/metodo vêm como lista de rótulos ("pago,pendente") do diálogo de
     exportação; vazio = todos. Expande para os status reais do banco. */
  const filtros = {
    busca: u.searchParams.get("busca") ?? undefined,
    statusRaw: expandirStatus(lista("status")),
    metodoRaw: expandirMetodo(lista("metodo")),
    de: u.searchParams.get("de") ?? undefined,
    ate: u.searchParams.get("ate") ?? undefined,
  };

  const pedidos = await exportarPedidos(filtros);

  const linhas = pedidos.map((p) => [
    p.referencia,
    dataBR(p.criado_em),
    dataBR(p.pago_em),
    ROTULO_STATUS[p.status] ?? p.status,
    metodoLegivel(p.metodo_pagamento),
    p.cliente_nome ?? "",
    p.cliente_email ?? "",
    doc(p.cliente_documento),
    p.cliente_telefone ?? "",
    p.kit ?? "",
    p.quantidade,
    reais(p.subtotal_centavos),
    reais(p.desconto_centavos),
    reais(p.frete_centavos),
    reais(p.valor_centavos),
    p.codigo_rastreio ?? "",
    endereco(p.endereco),
  ].map(campo).join(";"));

  // BOM para o Excel abrir os acentos corretamente
  const csv = "﻿" + [COLUNAS.join(";"), ...linhas].join("\r\n");
  const hoje = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
