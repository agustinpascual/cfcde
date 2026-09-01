-- Dado de nascimento usado no cadastro.
alter table public.pedidos
  add column if not exists nascimento_mes_ano text;

comment on column public.pedidos.nascimento_mes_ano is
  'Mês e ano de nascimento informados no cadastro, no formato MM/AA.';
