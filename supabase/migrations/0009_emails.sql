-- ---------------------------------------------------------------------
-- Disparo de e-mail: contatos, campanhas e status de entrega
-- ---------------------------------------------------------------------

create table if not exists public.contatos (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  nome         text,
  origem       text not null default 'importado',   -- importado | pedido | formulario
  inscrito     boolean not null default true,       -- false = pediu para sair
  motivo_saida text,                                -- descadastro | bounce | reclamacao
  criado_em    timestamptz not null default now()
);

create index if not exists contatos_inscrito_idx on public.contatos (inscrito);

create table if not exists public.campanhas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  assunto     text not null,
  corpo_html  text not null,
  status      text not null default 'rascunho'
                check (status in ('rascunho','enviando','enviada','falhou')),
  total       integer not null default 0,
  enviados    integer not null default 0,
  falhas      integer not null default 0,
  criada_em   timestamptz not null default now(),
  enviada_em  timestamptz
);

create table if not exists public.envios (
  id         bigserial primary key,
  campanha   uuid not null references public.campanhas(id) on delete cascade,
  contato    uuid references public.contatos(id) on delete set null,
  email      text not null,
  provedor_id text,                                  -- id da Resend, liga o webhook
  status     text not null default 'enfileirado'
               check (status in ('enfileirado','enviado','entregue','aberto','bounce','reclamacao','falhou')),
  erro       text,
  criado_em  timestamptz not null default now(),
  unique (campanha, email)
);

create index if not exists envios_campanha_idx on public.envios (campanha);
create index if not exists envios_provedor_idx on public.envios (provedor_id);

-- ---------------------------------------------------------------------
-- RLS: leitura autenticada, escrita só service_role
-- ---------------------------------------------------------------------
alter table public.contatos  enable row level security;
alter table public.campanhas enable row level security;
alter table public.envios    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['contatos','campanhas','envios'] loop
    execute format('drop policy if exists %I on public.%I', t || '_leitura', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_leitura', t);
  end loop;
end $$;
