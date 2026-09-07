-- ---------------------------------------------------------------------
-- Código de rastreio do envio, preenchido à mão no painel.
-- Nulo enquanto o pedido não foi postado.
-- ---------------------------------------------------------------------
alter table public.pedidos
  add column if not exists codigo_rastreio      text,
  add column if not exists rastreio_atualizado  timestamptz;

comment on column public.pedidos.codigo_rastreio is
  'Código dos Correios (ex.: AA123456789BR). Preenchido pelo painel e enviado ao cliente por e-mail.';

-- Marca que o e-mail de confirmação já saiu. A PinPay reenvia o mesmo evento,
-- e sem esta coluna o cliente receberia a confirmação várias vezes.
alter table public.pedidos
  add column if not exists confirmacao_enviada_em timestamptz;
