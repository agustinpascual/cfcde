-- Nome da atendente que assina as respostas do robô.
alter table public.treinamento
  add column if not exists atendente_nome text not null default 'Renata';

-- Saudação que puxa a dúvida em vez de esperar
update public.treinamento
set saudacao_mensagem =
  'Oi! 😊 Seja muito bem-vindo(a) à *Bela Blue Beauty*!' || chr(10) || chr(10) ||
  'Eu sou a Renata, do atendimento, e vou te ajudar por aqui.' || chr(10) || chr(10) ||
  'Qual seria a sua principal dúvida sobre o Gummy?'
where id = 1 and saudacao_mensagem like 'Bem-vindo%';
