-- ---------------------------------------------------------------------
-- Aprendizado: o que o robô não soube responder vira treinamento
-- ---------------------------------------------------------------------
create table if not exists public.aprendizado (
  id          uuid primary key default gen_random_uuid(),
  pergunta    text not null,
  chave       text not null unique,       -- pergunta normalizada, agrupa repetições
  vezes       integer not null default 1,
  intencao    text,                       -- o que casou, se casou
  confianca   numeric(4,3),
  resolvido   boolean not null default false,
  primeira_em timestamptz not null default now(),
  ultima_em   timestamptz not null default now()
);

create index if not exists aprendizado_pendente_idx
  on public.aprendizado (resolvido, vezes desc);

alter table public.aprendizado enable row level security;
drop policy if exists aprendizado_leitura on public.aprendizado;
create policy aprendizado_leitura on public.aprendizado
  for select to authenticated using (true);
