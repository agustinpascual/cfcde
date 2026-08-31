-- Acesso ao aplicativo entregue por e-mail quando o pagamento é aprovado.
-- O login é o e-mail informado na compra; a senha é gerada e enviada uma vez.
create table if not exists public.acessos_app (
  id          uuid primary key default gen_random_uuid(),
  pedido_ref  text,
  email       text not null,
  senha       text not null,          -- entregue ao cliente; troca no 1º acesso
  enviado_em  timestamptz,
  criado_em   timestamptz not null default now(),
  unique (pedido_ref)
);

create index if not exists acessos_email_idx on public.acessos_app (email);

alter table public.acessos_app enable row level security;
drop policy if exists acessos_leitura on public.acessos_app;
create policy acessos_leitura on public.acessos_app
  for select to authenticated using (true);
