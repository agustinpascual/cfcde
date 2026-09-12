-- Comprovantes são evidência para conferência, não confirmação de pagamento.
begin;
create table if not exists public.pix_comprovantes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references public.pedidos(id) on delete restrict,
  arquivo_path text not null unique,
  mime text not null check (mime in ('image/jpeg','image/png','image/webp','application/pdf')),
  tamanho integer not null check (tamanho > 0 and tamanho <= 5242880),
  sha256 text not null,
  recebido_em timestamptz not null default now(),
  copiado_em timestamptz,
  nome_informado text not null check (length(nome_informado) between 3 and 200),
  valor_informado integer not null check (valor_informado > 0),
  horario_informado timestamptz not null,
  mesmo_ip boolean,
  nome_compativel boolean,
  valor_compativel boolean not null,
  horario_compativel boolean not null
);
alter table public.pix_comprovantes enable row level security;
revoke all on public.pix_comprovantes from anon, authenticated;
grant select, insert, delete on public.pix_comprovantes to service_role;
comment on table public.pix_comprovantes is 'Arquivo privado e dados declarados para conferência humana. Não altera pedidos.status ou pago_em.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pix-comprovantes', 'pix-comprovantes', false, 5242880,
  array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- Sem políticas públicas de storage: upload/download somente pelo backend.
commit;
