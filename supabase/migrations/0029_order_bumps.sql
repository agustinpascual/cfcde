begin;

alter table public.pedidos
  add column if not exists order_bumps jsonb not null default '{}'::jsonb;

comment on column public.pedidos.order_bumps is
  'Adicionais escolhidos no checkout e conteúdo da carta, validados e precificados pelo backend.';

commit;
