-- Chave funcional enviada por e-mail; não representa dados de pagamento.
alter table public.pedidos
  add column if not exists chave_ativacao text;

comment on column public.pedidos.chave_ativacao is
  'Chave numérica de ativação com 16 dígitos, sem relação com cartão de pagamento.';
