-- Mensagem usada quando o robô não sabe responder e passa para um humano
alter table public.treinamento
  add column if not exists escalar_mensagem text not null default
    'Essa eu vou te encaminhar para outro setor, que consegue te informar direitinho sobre isso. Só um instante.';
