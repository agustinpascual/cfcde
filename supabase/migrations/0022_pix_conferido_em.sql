-- Alterna os pedidos consultados: um Pix antigo ainda aberto não bloqueia os demais.
alter table public.pedidos
  add column if not exists pix_conferido_em timestamptz;

create index if not exists pedidos_pix_conferir_idx
  on public.pedidos (pix_conferido_em asc nulls first, criado_em)
  where status = 'pendente' and metodo_pagamento = 'pix' and pix_id is not null;
