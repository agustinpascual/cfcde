-- =====================================================================
-- Bela Gummy — credenciais das integrações, editáveis pelo painel
-- =====================================================================

create table if not exists public.configuracoes (
  chave          text primary key,      -- ex.: PINPAY_TOKEN
  valor_cifrado  text not null,         -- AES-256-GCM: iv:tag:conteudo (base64)
  atualizado_em  timestamptz not null default now(),
  atualizado_por text
);

comment on table public.configuracoes is
  'Segredos das integrações. O valor é cifrado pela aplicação com CHAVE_MESTRA; o banco nunca vê o texto puro.';

alter table public.configuracoes enable row level security;
-- nenhuma policy: só o service_role lê e escreve. A chave anon não enxerga.

create or replace function public.toca_config_atualizado_em()
returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;

drop trigger if exists configuracoes_atualizado_em on public.configuracoes;
create trigger configuracoes_atualizado_em
  before update on public.configuracoes
  for each row execute function public.toca_config_atualizado_em();
