-- =====================================================================
-- Bela Gummy — schema de pedidos e eventos de webhook
-- Rode no Supabase → SQL Editor → New query → Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- pedidos
-- ---------------------------------------------------------------------
create table if not exists public.pedidos (
  id                 uuid primary key default gen_random_uuid(),
  referencia         text        not null unique,          -- PED-XXXX gerado pelo site
  pix_id             text        unique,                   -- id da cobrança na PinPay
  status             text        not null default 'pendente'
                       check (status in ('pendente','aprovado','expirado','falhou','estornado')),

  -- valores sempre em centavos, para não ter erro de ponto flutuante
  valor_centavos     integer     not null check (valor_centavos >= 0),
  subtotal_centavos  integer     not null default 0,
  desconto_centavos  integer     not null default 0,
  frete_centavos     integer     not null default 0,

  kit                text,
  quantidade         integer     not null default 1 check (quantidade > 0),
  frete_tipo         text,

  cliente_nome       text,
  cliente_email      text,
  cliente_documento  text,      -- CPF/CNPJ: dado pessoal, ver política de retenção
  cliente_telefone   text,
  endereco           jsonb,

  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  pago_em            timestamptz
);

comment on table  public.pedidos is 'Pedidos da loja. Escrita só pelo backend (service_role).';
comment on column public.pedidos.cliente_documento is 'CPF/CNPJ — dado pessoal sob LGPD. Definir prazo de retenção.';

create index if not exists pedidos_status_idx    on public.pedidos (status);
create index if not exists pedidos_criado_em_idx on public.pedidos (criado_em desc);
create index if not exists pedidos_email_idx     on public.pedidos (cliente_email);

-- mantém atualizado_em em dia
create or replace function public.toca_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists pedidos_atualizado_em on public.pedidos;
create trigger pedidos_atualizado_em
  before update on public.pedidos
  for each row execute function public.toca_atualizado_em();

-- ---------------------------------------------------------------------
-- eventos_webhook — log cru + idempotência
-- ---------------------------------------------------------------------
create table if not exists public.eventos_webhook (
  id           bigserial primary key,
  provedor     text        not null default 'pinpay',
  evento       text        not null,
  pix_id       text,
  payload      jsonb       not null,
  processado   boolean     not null default false,
  recebido_em  timestamptz not null default now()
);

-- a PinPay pode reenviar o mesmo evento; isto evita processar duas vezes
create unique index if not exists eventos_webhook_unico
  on public.eventos_webhook (provedor, evento, coalesce(pix_id, ''), recebido_em);
create index if not exists eventos_webhook_pix_idx on public.eventos_webhook (pix_id);

-- ---------------------------------------------------------------------
-- RLS — nada é público. A chave anon NÃO enxerga estes dados.
-- ---------------------------------------------------------------------
alter table public.pedidos          enable row level security;
alter table public.eventos_webhook  enable row level security;

-- leitura só para quem está autenticado (o painel usa login do Supabase Auth)
drop policy if exists "painel le pedidos" on public.pedidos;
create policy "painel le pedidos"
  on public.pedidos for select
  to authenticated
  using (true);

drop policy if exists "painel le eventos" on public.eventos_webhook;
create policy "painel le eventos"
  on public.eventos_webhook for select
  to authenticated
  using (true);

-- Escrita: nenhuma policy. Só o service_role (que ignora RLS) grava —
-- ou seja, apenas o backend do site.

-- ---------------------------------------------------------------------
-- visão agregada para o painel
-- ---------------------------------------------------------------------
create or replace view public.painel_resumo
with (security_invoker = true) as
select
  count(*)                                                          as pedidos_total,
  count(*) filter (where status = 'aprovado')                       as pedidos_pagos,
  count(*) filter (where status = 'pendente')                       as pedidos_pendentes,
  coalesce(sum(valor_centavos) filter (where status = 'aprovado'),0) as receita_centavos,
  coalesce(sum(valor_centavos) filter (where status = 'aprovado'
    and criado_em >= date_trunc('day', now())), 0)                  as receita_hoje_centavos,
  count(*) filter (where criado_em >= date_trunc('day', now()))      as pedidos_hoje
from public.pedidos;
