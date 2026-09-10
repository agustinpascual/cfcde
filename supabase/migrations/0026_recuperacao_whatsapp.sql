-- Recuperações automáticas por WhatsApp. Os registros existentes são
-- marcados como tratados para que ativar a função não dispare mensagens
-- antigas em massa.
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'recuperacao_pix_em'
  ) then
    alter table public.pedidos add column recuperacao_pix_em timestamptz;
    update public.pedidos set recuperacao_pix_em = now();
  end if;
end $$;

alter table public.pedidos
  add column if not exists recuperacao_pix_erro text,
  add column if not exists recuperacao_pix_tentativas integer not null default 0;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sessoes' and column_name = 'recuperacao_carrinho_em'
  ) then
    alter table public.sessoes add column recuperacao_carrinho_em timestamptz;
    update public.sessoes set recuperacao_carrinho_em = now();
  end if;
end $$;

alter table public.sessoes
  add column if not exists recuperacao_carrinho_erro text,
  add column if not exists recuperacao_carrinho_tentativas integer not null default 0;

create index if not exists pedidos_recuperacao_pix_idx
  on public.pedidos (criado_em)
  where status = 'pendente' and metodo_pagamento = 'pix' and recuperacao_pix_em is null;

create index if not exists sessoes_recuperacao_carrinho_idx
  on public.sessoes (criado_em)
  where pedido_ref is null and recuperacao_carrinho_em is null;
