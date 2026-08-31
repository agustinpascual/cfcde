-- Registro das liberações de acesso ao app, disparadas no pagamento aprovado.
-- A conta e a senha vivem no app (app-bella-two) via /api/acesso/provisionar.
-- Aqui guardamos só a auditoria — quem foi liberado, quando e com que status.
create table if not exists public.acessos_app (
  id            uuid primary key default gen_random_uuid(),
  pedido_ref    text unique,
  email         text,
  status        text not null default 'pendente',   -- criado | ja_existia | falhou
  detalhe       text,
  provisionado_em timestamptz,
  criado_em     timestamptz not null default now()
);

create index if not exists acessos_email_idx on public.acessos_app (email);

alter table public.acessos_app enable row level security;
drop policy if exists acessos_leitura on public.acessos_app;
create policy acessos_leitura on public.acessos_app
  for select to authenticated using (true);
