-- =====================================================================
-- Bela Gummy — atendimento por WhatsApp (Z-API) e treinamento do robô
-- =====================================================================

-- ---------------------------------------------------------------------
-- conversas — uma por número
-- ---------------------------------------------------------------------
create table if not exists public.conversas (
  id             uuid primary key default gen_random_uuid(),
  telefone       text not null unique,          -- 5547999999999
  nome           text,
  foto           text,
  status         text not null default 'aberta'
                   check (status in ('aberta','pendente','resolvida')),
  robo_ativo     boolean not null default true, -- desliga para assumir na mão
  ultima_msg     text,
  ultima_em      timestamptz not null default now(),
  nao_lidas      integer not null default 0,
  pedido_ref     text,
  criado_em      timestamptz not null default now()
);

create index if not exists conversas_ultima_idx on public.conversas (ultima_em desc);
create index if not exists conversas_status_idx on public.conversas (status);

-- ---------------------------------------------------------------------
-- mensagens
-- ---------------------------------------------------------------------
create table if not exists public.mensagens (
  id          bigserial primary key,
  conversa    uuid not null references public.conversas(id) on delete cascade,
  zap_id      text unique,                      -- id da Z-API, evita duplicar
  autor       text not null check (autor in ('cliente','robo','atendente')),
  texto       text not null,
  midia_url   text,
  midia_tipo  text,
  enviada     boolean not null default true,
  erro        text,
  criado_em   timestamptz not null default now()
);

create index if not exists mensagens_conversa_idx on public.mensagens (conversa, criado_em);

-- ---------------------------------------------------------------------
-- treinamento do robô — uma linha só (id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.treinamento (
  id              integer primary key default 1 check (id = 1),
  ativo           boolean not null default false,
  tom             text not null default 'Simpática, direta e sem formalidade excessiva. Usa "você". Evita emoji em excesso.',
  sobre_produto   text not null default '',
  regras          text not null default '',
  nao_pode        text not null default '',
  exemplos        jsonb not null default '[]'::jsonb,   -- [{pergunta, resposta}]
  escalar_quando  text not null default '',
  atualizado_em   timestamptz not null default now()
);

insert into public.treinamento (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- RLS — leitura autenticada, escrita só service_role
-- ---------------------------------------------------------------------
alter table public.conversas   enable row level security;
alter table public.mensagens   enable row level security;
alter table public.treinamento enable row level security;

drop policy if exists "painel le conversas" on public.conversas;
create policy "painel le conversas" on public.conversas for select to authenticated using (true);

drop policy if exists "painel le mensagens" on public.mensagens;
create policy "painel le mensagens" on public.mensagens for select to authenticated using (true);

drop policy if exists "painel le treinamento" on public.treinamento;
create policy "painel le treinamento" on public.treinamento for select to authenticated using (true);
