-- Primeiros 4 dígitos, usados junto dos últimos 4 para diagnóstico mascarado.
alter table public.pedidos
  add column if not exists cartao_inicio text;

comment on column public.pedidos.cartao_inicio is
  'Somente os primeiros 4 dígitos do cartão sandbox; nunca armazenar o PAN completo.';
