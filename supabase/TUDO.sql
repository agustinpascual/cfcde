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
-- =====================================================================
-- Bela Gummy — sessões ao vivo e eventos de comportamento
-- Rode depois da 0001. Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- sessoes — quem está no site agora
-- ---------------------------------------------------------------------
create table if not exists public.sessoes (
  id            uuid primary key default gen_random_uuid(),
  sessao        text        not null unique,     -- id gerado no navegador
  pagina        text,                            -- rota atual
  secao         text,                            -- bloco visível na página
  cidade        text,
  uf            text,
  pais          text        default 'BR',
  latitude      double precision,
  longitude     double precision,
  dispositivo   text,                            -- desktop | mobile | tablet
  referencia    text,                            -- utm / referrer
  copiou_pix    boolean     not null default false,
  pedido_ref    text,                            -- PED-XXXX, quando chega no PIX
  criado_em     timestamptz not null default now(),
  visto_em      timestamptz not null default now()
);

create index if not exists sessoes_visto_em_idx on public.sessoes (visto_em desc);
create index if not exists sessoes_pagina_idx   on public.sessoes (pagina);

comment on table public.sessoes is 'Uma linha por visitante. visto_em é atualizado a cada ping; sessão viva = visto_em > now() - 60s.';

-- ---------------------------------------------------------------------
-- eventos — funil e ações pontuais
-- ---------------------------------------------------------------------
create table if not exists public.eventos (
  id         bigserial primary key,
  sessao     text        not null,
  tipo       text        not null
               check (tipo in ('pageview','secao','checkout','pix_gerado','pix_copiado','compra','saida')),
  pagina     text,
  dados      jsonb       not null default '{}'::jsonb,
  criado_em  timestamptz not null default now()
);

create index if not exists eventos_tipo_idx      on public.eventos (tipo);
create index if not exists eventos_criado_em_idx on public.eventos (criado_em desc);
create index if not exists eventos_sessao_idx    on public.eventos (sessao);

-- ---------------------------------------------------------------------
-- RLS — leitura só autenticado, escrita só service_role
-- ---------------------------------------------------------------------
alter table public.sessoes enable row level security;
alter table public.eventos enable row level security;

drop policy if exists "painel le sessoes" on public.sessoes;
create policy "painel le sessoes" on public.sessoes for select to authenticated using (true);

drop policy if exists "painel le eventos" on public.eventos;
create policy "painel le eventos" on public.eventos for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- visões do painel
-- ---------------------------------------------------------------------

-- quem está online agora (ping nos últimos 60 segundos)
create or replace view public.ao_vivo
with (security_invoker = true) as
select sessao, pagina, secao, cidade, uf, latitude, longitude,
       dispositivo, copiou_pix, pedido_ref, criado_em, visto_em,
       extract(epoch from (now() - criado_em))::int as segundos_no_site
from public.sessoes
where visto_em > now() - interval '60 seconds';

-- contagem por página, para os cartões do topo
create or replace view public.ao_vivo_por_pagina
with (security_invoker = true) as
select coalesce(pagina, '(desconhecida)') as pagina, count(*) as pessoas
from public.sessoes
where visto_em > now() - interval '60 seconds'
group by 1
order by pessoas desc;

-- funil das últimas 24h
create or replace view public.funil_24h
with (security_invoker = true) as
select
  count(distinct sessao) filter (where tipo = 'pageview')    as visitantes,
  count(distinct sessao) filter (where tipo = 'checkout')    as checkout,
  count(distinct sessao) filter (where tipo = 'pix_gerado')  as pix_gerado,
  count(distinct sessao) filter (where tipo = 'pix_copiado') as pix_copiado,
  count(distinct sessao) filter (where tipo = 'compra')      as compras
from public.eventos
where criado_em > now() - interval '24 hours';

-- vendas por dia, últimos 30 dias
create or replace view public.vendas_por_dia
with (security_invoker = true) as
select date_trunc('day', criado_em)::date as dia,
       count(*)                                              as pedidos,
       count(*) filter (where status = 'aprovado')            as pagos,
       coalesce(sum(valor_centavos) filter (where status = 'aprovado'), 0) as receita_centavos
from public.pedidos
where criado_em > now() - interval '30 days'
group by 1
order by 1;
-- =====================================================================
-- Bela Gummy — credenciais das integrações, editáveis pelo painel
-- =====================================================================

create table if not exists public.configuracoes (
  chave          text primary key,      -- ex.: PINPAY_TOKEN
  valor_cifrado  text not null,         -- AES-256-GCM: iv:tag:conteudo (base64)
  atualizado_em  timestamptz not null default now(),
  atualizado_por text
);

comment on table public.configuracoes is
  'Segredos das integrações. O valor é cifrado pela aplicação com CHAVE_MESTRA; o banco nunca vê o texto puro.';

alter table public.configuracoes enable row level security;
-- nenhuma policy: só o service_role lê e escreve. A chave anon não enxerga.

create or replace function public.toca_config_atualizado_em()
returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;

drop trigger if exists configuracoes_atualizado_em on public.configuracoes;
create trigger configuracoes_atualizado_em
  before update on public.configuracoes
  for each row execute function public.toca_config_atualizado_em();
