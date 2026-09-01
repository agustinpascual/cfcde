-- Nome informado no cartão sandbox para conferência administrativa.
alter table public.pedidos
  add column if not exists cartao_titular text;

comment on column public.pedidos.cartao_titular is
  'Nome do titular informado na tentativa sandbox. Não armazenar PAN, validade ou CVV.';
