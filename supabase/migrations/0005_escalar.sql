-- Mensagem usada quando o robô não sabe responder e passa para um humano
alter table public.treinamento
  add column if not exists escalar_mensagem text not null default
    'Vou te encaminhar para outro setor, que vai estar conseguindo te informar sobre esses assuntos.';
