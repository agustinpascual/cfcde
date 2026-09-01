-- Registra tentativas recusadas do simulador sem armazenar dados do cartão.
alter table public.pedidos
  add column if not exists metodo_pagamento text not null default 'pix';

alter table public.pedidos drop constraint if exists pedidos_status_check;
alter table public.pedidos
  add constraint pedidos_status_check
  check (status in ('pendente','aprovado','expirado','falhou','estornado','recusado'));

comment on column public.pedidos.metodo_pagamento is
  'Meio usado na tentativa: pix ou cartao_sandbox. Nunca contém PAN, validade ou CVV.';
