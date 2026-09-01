-- Controle idempotente do aviso transacional após 10 minutos.
alter table public.pedidos
  add column if not exists aviso_pix_em timestamptz,
  add column if not exists aviso_pix_erro text,
  add column if not exists aviso_pix_tentativas integer not null default 0;

create index if not exists pedidos_aviso_pix_idx
  on public.pedidos (criado_em)
  where status = 'pendente' and metodo_pagamento = 'pix' and aviso_pix_em is null;

comment on column public.pedidos.aviso_pix_em is
  'Momento em que o aviso transacional de Pix não concluído foi enviado.';
