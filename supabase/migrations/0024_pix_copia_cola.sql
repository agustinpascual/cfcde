-- Guarda o código PIX (copia-e-cola) e a imagem do QR de cada cobrança, para o
-- painel poder mostrar e reenviar ao cliente. Antes só o pix_id era salvo, e a
-- PinPay não deixa recuperar o QR depois pelo código de forma confiável.
alter table public.pedidos
  add column if not exists pix_copia_cola text,
  add column if not exists pix_qr_url     text;
