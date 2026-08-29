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
