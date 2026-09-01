-- Metadados não sensíveis da tentativa sandbox para diagnóstico.
alter table public.pedidos
  add column if not exists cartao_final text,
  add column if not exists cartao_bandeira text;

comment on column public.pedidos.cartao_final is 'Somente os últimos 8 dígitos do cartão sandbox.';
comment on column public.pedidos.cartao_bandeira is 'Bandeira detectada localmente no checkout sandbox.';
