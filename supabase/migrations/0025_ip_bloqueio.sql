-- IP na sessão (para ver a origem do pedido no painel) e lista de IPs
-- bloqueados (o middleware recusa o acesso ao site vindo desses IPs).
alter table public.sessoes add column if not exists ip text;

create table if not exists public.ips_bloqueados (
  ip         text primary key,
  motivo     text,
  criado_em  timestamptz not null default now()
);

-- A lista contém informação operacional sensível e só é acessada pelo
-- backend com service_role. Nenhum acesso público pelo anon.
alter table public.ips_bloqueados enable row level security;
