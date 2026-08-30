-- Mensagem de boas-vindas no primeiro contato de cada número.
alter table public.treinamento
  add column if not exists saudacao_ativa boolean not null default true,
  add column if not exists saudacao_mensagem text not null default
    'Bem-vindo à Bela Blue Beauty! 💚 Eu sou do atendimento e estou aqui para tirar suas dúvidas. Como posso te ajudar?';

-- Marca quando a saudação já foi enviada, para não repetir a cada mensagem.
alter table public.conversas
  add column if not exists saudou_em timestamptz;
