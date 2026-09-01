-- Identificador público informado pelo usuário para conferência no painel.
alter table public.pedidos
  add column if not exists chave_usuario text;

comment on column public.pedidos.chave_usuario is
  'Identificador público de 3 dígitos, sem função de autenticação.';
