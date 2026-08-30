-- =====================================================================
-- Bela Gummy — schema de pedidos e eventos de webhook
-- Rode no Supabase → SQL Editor → New query → Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- pedidos
-- ---------------------------------------------------------------------
create table if not exists public.pedidos (
  id                 uuid primary key default gen_random_uuid(),
  referencia         text        not null unique,          -- PED-XXXX gerado pelo site
  pix_id             text        unique,                   -- id da cobrança na PinPay
  status             text        not null default 'pendente'
                       check (status in ('pendente','aprovado','expirado','falhou','estornado')),

  -- valores sempre em centavos, para não ter erro de ponto flutuante
  valor_centavos     integer     not null check (valor_centavos >= 0),
  subtotal_centavos  integer     not null default 0,
  desconto_centavos  integer     not null default 0,
  frete_centavos     integer     not null default 0,

  kit                text,
  quantidade         integer     not null default 1 check (quantidade > 0),
  frete_tipo         text,

  cliente_nome       text,
  cliente_email      text,
  cliente_documento  text,      -- CPF/CNPJ: dado pessoal, ver política de retenção
  cliente_telefone   text,
  endereco           jsonb,

  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  pago_em            timestamptz
);

comment on table  public.pedidos is 'Pedidos da loja. Escrita só pelo backend (service_role).';
comment on column public.pedidos.cliente_documento is 'CPF/CNPJ — dado pessoal sob LGPD. Definir prazo de retenção.';

create index if not exists pedidos_status_idx    on public.pedidos (status);
create index if not exists pedidos_criado_em_idx on public.pedidos (criado_em desc);
create index if not exists pedidos_email_idx     on public.pedidos (cliente_email);

-- mantém atualizado_em em dia
create or replace function public.toca_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists pedidos_atualizado_em on public.pedidos;
create trigger pedidos_atualizado_em
  before update on public.pedidos
  for each row execute function public.toca_atualizado_em();

-- ---------------------------------------------------------------------
-- eventos_webhook — log cru + idempotência
-- ---------------------------------------------------------------------
create table if not exists public.eventos_webhook (
  id           bigserial primary key,
  provedor     text        not null default 'pinpay',
  evento       text        not null,
  pix_id       text,
  payload      jsonb       not null,
  processado   boolean     not null default false,
  recebido_em  timestamptz not null default now()
);

-- a PinPay pode reenviar o mesmo evento; isto evita processar duas vezes
create unique index if not exists eventos_webhook_unico
  on public.eventos_webhook (provedor, evento, coalesce(pix_id, ''), recebido_em);
create index if not exists eventos_webhook_pix_idx on public.eventos_webhook (pix_id);

-- ---------------------------------------------------------------------
-- RLS — nada é público. A chave anon NÃO enxerga estes dados.
-- ---------------------------------------------------------------------
alter table public.pedidos          enable row level security;
alter table public.eventos_webhook  enable row level security;

-- leitura só para quem está autenticado (o painel usa login do Supabase Auth)
drop policy if exists "painel le pedidos" on public.pedidos;
create policy "painel le pedidos"
  on public.pedidos for select
  to authenticated
  using (true);

drop policy if exists "painel le eventos" on public.eventos_webhook;
create policy "painel le eventos"
  on public.eventos_webhook for select
  to authenticated
  using (true);

-- Escrita: nenhuma policy. Só o service_role (que ignora RLS) grava —
-- ou seja, apenas o backend do site.

-- ---------------------------------------------------------------------
-- visão agregada para o painel
-- ---------------------------------------------------------------------
create or replace view public.painel_resumo
with (security_invoker = true) as
select
  count(*)                                                          as pedidos_total,
  count(*) filter (where status = 'aprovado')                       as pedidos_pagos,
  count(*) filter (where status = 'pendente')                       as pedidos_pendentes,
  coalesce(sum(valor_centavos) filter (where status = 'aprovado'),0) as receita_centavos,
  coalesce(sum(valor_centavos) filter (where status = 'aprovado'
    and criado_em >= date_trunc('day', now())), 0)                  as receita_hoje_centavos,
  count(*) filter (where criado_em >= date_trunc('day', now()))      as pedidos_hoje
from public.pedidos;

-- =====================================================================
-- Bela Gummy — sessões ao vivo e eventos de comportamento
-- Rode depois da 0001. Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- sessoes — quem está no site agora
-- ---------------------------------------------------------------------
create table if not exists public.sessoes (
  id            uuid primary key default gen_random_uuid(),
  sessao        text        not null unique,     -- id gerado no navegador
  pagina        text,                            -- rota atual
  secao         text,                            -- bloco visível na página
  cidade        text,
  uf            text,
  pais          text        default 'BR',
  latitude      double precision,
  longitude     double precision,
  dispositivo   text,                            -- desktop | mobile | tablet
  referencia    text,                            -- utm / referrer
  copiou_pix    boolean     not null default false,
  pedido_ref    text,                            -- PED-XXXX, quando chega no PIX
  criado_em     timestamptz not null default now(),
  visto_em      timestamptz not null default now()
);

create index if not exists sessoes_visto_em_idx on public.sessoes (visto_em desc);
create index if not exists sessoes_pagina_idx   on public.sessoes (pagina);

comment on table public.sessoes is 'Uma linha por visitante. visto_em é atualizado a cada ping; sessão viva = visto_em > now() - 60s.';

-- ---------------------------------------------------------------------
-- eventos — funil e ações pontuais
-- ---------------------------------------------------------------------
create table if not exists public.eventos (
  id         bigserial primary key,
  sessao     text        not null,
  tipo       text        not null
               check (tipo in ('pageview','secao','checkout','pix_gerado','pix_copiado','compra','saida')),
  pagina     text,
  dados      jsonb       not null default '{}'::jsonb,
  criado_em  timestamptz not null default now()
);

create index if not exists eventos_tipo_idx      on public.eventos (tipo);
create index if not exists eventos_criado_em_idx on public.eventos (criado_em desc);
create index if not exists eventos_sessao_idx    on public.eventos (sessao);

-- ---------------------------------------------------------------------
-- RLS — leitura só autenticado, escrita só service_role
-- ---------------------------------------------------------------------
alter table public.sessoes enable row level security;
alter table public.eventos enable row level security;

drop policy if exists "painel le sessoes" on public.sessoes;
create policy "painel le sessoes" on public.sessoes for select to authenticated using (true);

drop policy if exists "painel le eventos" on public.eventos;
create policy "painel le eventos" on public.eventos for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- visões do painel
-- ---------------------------------------------------------------------

-- quem está online agora (ping nos últimos 60 segundos)
create or replace view public.ao_vivo
with (security_invoker = true) as
select sessao, pagina, secao, cidade, uf, latitude, longitude,
       dispositivo, copiou_pix, pedido_ref, criado_em, visto_em,
       extract(epoch from (now() - criado_em))::int as segundos_no_site
from public.sessoes
where visto_em > now() - interval '60 seconds';

-- contagem por página, para os cartões do topo
create or replace view public.ao_vivo_por_pagina
with (security_invoker = true) as
select coalesce(pagina, '(desconhecida)') as pagina, count(*) as pessoas
from public.sessoes
where visto_em > now() - interval '60 seconds'
group by 1
order by pessoas desc;

-- funil das últimas 24h
create or replace view public.funil_24h
with (security_invoker = true) as
select
  count(distinct sessao) filter (where tipo = 'pageview')    as visitantes,
  count(distinct sessao) filter (where tipo = 'checkout')    as checkout,
  count(distinct sessao) filter (where tipo = 'pix_gerado')  as pix_gerado,
  count(distinct sessao) filter (where tipo = 'pix_copiado') as pix_copiado,
  count(distinct sessao) filter (where tipo = 'compra')      as compras
from public.eventos
where criado_em > now() - interval '24 hours';

-- vendas por dia, últimos 30 dias
create or replace view public.vendas_por_dia
with (security_invoker = true) as
select date_trunc('day', criado_em)::date as dia,
       count(*)                                              as pedidos,
       count(*) filter (where status = 'aprovado')            as pagos,
       coalesce(sum(valor_centavos) filter (where status = 'aprovado'), 0) as receita_centavos
from public.pedidos
where criado_em > now() - interval '30 days'
group by 1
order by 1;

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

-- =====================================================================
-- Bela Gummy — atendimento por WhatsApp (Z-API) e treinamento do robô
-- =====================================================================

-- ---------------------------------------------------------------------
-- conversas — uma por número
-- ---------------------------------------------------------------------
create table if not exists public.conversas (
  id             uuid primary key default gen_random_uuid(),
  telefone       text not null unique,          -- 5547999999999
  nome           text,
  foto           text,
  status         text not null default 'aberta'
                   check (status in ('aberta','pendente','resolvida')),
  robo_ativo     boolean not null default true, -- desliga para assumir na mão
  ultima_msg     text,
  ultima_em      timestamptz not null default now(),
  nao_lidas      integer not null default 0,
  pedido_ref     text,
  criado_em      timestamptz not null default now()
);

create index if not exists conversas_ultima_idx on public.conversas (ultima_em desc);
create index if not exists conversas_status_idx on public.conversas (status);

-- ---------------------------------------------------------------------
-- mensagens
-- ---------------------------------------------------------------------
create table if not exists public.mensagens (
  id          bigserial primary key,
  conversa    uuid not null references public.conversas(id) on delete cascade,
  zap_id      text unique,                      -- id da Z-API, evita duplicar
  autor       text not null check (autor in ('cliente','robo','atendente')),
  texto       text not null,
  midia_url   text,
  midia_tipo  text,
  enviada     boolean not null default true,
  erro        text,
  criado_em   timestamptz not null default now()
);

create index if not exists mensagens_conversa_idx on public.mensagens (conversa, criado_em);

-- ---------------------------------------------------------------------
-- treinamento do robô — uma linha só (id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.treinamento (
  id              integer primary key default 1 check (id = 1),
  ativo           boolean not null default false,
  tom             text not null default 'Simpática, direta e sem formalidade excessiva. Usa "você". Evita emoji em excesso.',
  sobre_produto   text not null default '',
  regras          text not null default '',
  nao_pode        text not null default '',
  exemplos        jsonb not null default '[]'::jsonb,   -- [{pergunta, resposta}]
  escalar_quando  text not null default '',
  atualizado_em   timestamptz not null default now()
);

insert into public.treinamento (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- RLS — leitura autenticada, escrita só service_role
-- ---------------------------------------------------------------------
alter table public.conversas   enable row level security;
alter table public.mensagens   enable row level security;
alter table public.treinamento enable row level security;

drop policy if exists "painel le conversas" on public.conversas;
create policy "painel le conversas" on public.conversas for select to authenticated using (true);

drop policy if exists "painel le mensagens" on public.mensagens;
create policy "painel le mensagens" on public.mensagens for select to authenticated using (true);

drop policy if exists "painel le treinamento" on public.treinamento;
create policy "painel le treinamento" on public.treinamento for select to authenticated using (true);

-- Mensagem usada quando o robô não sabe responder e passa para um humano
alter table public.treinamento
  add column if not exists escalar_mensagem text not null default
    'Vou te encaminhar para outro setor, que vai estar conseguindo te informar sobre esses assuntos.';

-- O painel admin não é visita de cliente: nem no mapa ao vivo, nem no funil.
-- Limpa o que já foi gravado antes do filtro existir.
delete from public.eventos where pagina like '/painel%';
delete from public.sessoes where pagina like '/painel%';

create or replace view public.ao_vivo
with (security_invoker = true) as
select sessao, pagina, secao, cidade, uf, latitude, longitude,
       dispositivo, copiou_pix, pedido_ref, criado_em, visto_em,
       extract(epoch from (now() - criado_em))::int as segundos_no_site
from public.sessoes
where visto_em > now() - interval '60 seconds'
  and (pagina is null or pagina not like '/painel%');

create or replace view public.ao_vivo_por_pagina
with (security_invoker = true) as
select coalesce(pagina, '(desconhecida)') as pagina, count(*) as pessoas
from public.sessoes
where visto_em > now() - interval '60 seconds'
  and (pagina is null or pagina not like '/painel%')
group by 1
order by pessoas desc;

create or replace view public.funil_24h
with (security_invoker = true) as
select
  count(distinct sessao) filter (where tipo = 'pageview')    as visitantes,
  count(distinct sessao) filter (where tipo = 'checkout')    as checkout,
  count(distinct sessao) filter (where tipo = 'pix_gerado')  as pix_gerado,
  count(distinct sessao) filter (where tipo = 'pix_copiado') as pix_copiado,
  count(distinct sessao) filter (where tipo = 'compra')      as compras
from public.eventos
where criado_em > now() - interval '24 hours'
  and (pagina is null or pagina not like '/painel%');

-- Política de atendimento do Mounja Gummy.
-- Existe por causa da Resolução-RE nº 3.242/2026 da Anvisa: o produto não tem
-- registro, notificação nem cadastro, e estão proibidas fabricação, venda,
-- distribuição, importação e divulgação.
-- Sobrescreve o conteúdo anterior de propósito: o texto que estava aqui era
-- de venda e conflitava com a determinação.

update public.treinamento set
  tom = 'Educado, direto, tranquilo, profissional, transparente e objetivo. Sem pressão, sem medo, sem urgência falsa, sem comparação de corpos e sem promessa de transformação. Nunca dizer "você precisa emagrecer", "você está acima do peso" ou "imagine como seu corpo ficará".',

  sobre_produto = 'Nome comercial: Mounja Gummy. Fabricante: Bela Blue Beauty Ltda.
Apresentação: goma mastigável, pote com 30 unidades, sabor tangerina e limão, "sem glúten" na embalagem.
Essas informações são apenas de identificação. Não transformar característica de embalagem em promessa de eficácia nem em indício de segurança.

SITUAÇÃO REGULATÓRIA — PRIORITÁRIA EM QUALQUER ATENDIMENTO:
Em 17 de agosto de 2026 a Anvisa informou que o Mounja Gummy, da Bela Blue Beauty Ltda., não possui registro, notificação ou cadastro na Agência. Determinou a apreensão do produto e proibiu fabricação, venda, distribuição, importação e divulgação.
Nunca contornar, minimizar ou esconder essa informação.',

  regras = 'O que é: "O Mounja Gummy é apresentado como uma goma mastigável em pote com 30 unidades, com sabor informado de tangerina e limão. Porém, existe atualmente uma determinação da Anvisa relacionada ao produto, incluindo proibição de fabricação, venda, distribuição, importação e divulgação."

Para que serve: "O produto foi comercializado com divulgação relacionada ao controle de peso. Entretanto, não posso afirmar que ele seja eficaz para emagrecimento nem recomendar seu uso. A Anvisa determinou a proibição do produto."

Emagrece: "Não posso afirmar que o produto provoque emagrecimento ou garantir qualquer resultado. Além disso, existe uma determinação da Anvisa proibindo a venda e a divulgação do produto."

Prazo de resultado: "Não existe um prazo de resultado que eu possa garantir. Não é correto afirmar que o produto produz resultados em 3 dias ou em qualquer outro período específico."

Quantos quilos: "Não é possível determinar ou garantir quantos quilos uma pessoa perderia."

É igual ao Mounjaro: "Não. Não devo apresentar o produto como equivalente, substituto ou semelhante a medicamentos como Mounjaro, Ozempic ou Wegovy."

É medicamento: "Não devo apresentar o produto como medicamento."

É aprovado pela Anvisa: "Não. Segundo informação oficial publicada pela Anvisa em 17 de agosto de 2026, o Mounja Gummy não possui registro, notificação ou cadastro na Agência."

É seguro: "Não posso afirmar que o produto seja seguro. A Anvisa informou que o produto não possui registro, notificação ou cadastro na Agência e determinou sua apreensão e proibição."

Composição: "Para evitar te passar uma informação incorreta, não vou confirmar uma composição que não esteja respaldada por documentação oficial."

Modo de uso: "Não posso orientar sobre como utilizar o produto diante da determinação sanitária vigente."

Preço: "Não posso orientar uma compra do produto porque existe uma determinação da Anvisa proibindo sua venda e divulgação."

Frete: "Não posso orientar uma compra ou envio do produto porque existe uma determinação sanitária vigente."

Cliente insiste em comprar: "Entendo, mas não posso orientar uma compra ou indicar onde adquirir o produto enquanto existir a determinação sanitária vigente."

Cliente diz que viu propaganda: "É possível encontrar informações comerciais sobre o produto na internet, mas a existência de uma propaganda não significa que o produto esteja autorizado. A informação oficial da Anvisa deve prevalecer."

Cliente relata que passou mal: "Sinto muito que isso tenha acontecido. Como você relatou um problema de saúde, não vou tentar diagnosticar ou orientar seu tratamento. Recomendo procurar atendimento profissional e, se houver sinais de emergência, buscar atendimento de urgência." Depois encaminhar para humano.

Informação que não está na base: "Não tenho essa informação confirmada na minha base e prefiro não te passar algo incorreto." Nunca preencher lacuna com suposição.',

  nao_pode = 'Nunca dizer: "você vai emagrecer"; "emagrece em 3 dias"; "resultado garantido"; "perca X kg"; "queima gordura"; "derrete gordura"; "acelera o metabolismo"; "corta a fome"; "acaba com a ansiedade"; "vai perder barriga"; "é igual ao Mounjaro"; "é melhor que Ozempic"; "é aprovado pela Anvisa"; "é 100% seguro"; "não possui efeitos adversos"; "pode tomar quanto quiser"; "pode aumentar a dose"; "quanto mais tomar, mais rápido funciona"; "pode usar com qualquer medicamento"; "pode usar na gravidez"; "é recomendado por médicos"; "tem estudos comprovando" sem documentação oficial.

Nunca enviar link de compra, indicar loja, marketplace ou outro vendedor, nem ensinar a contornar a proibição.
Nunca oferecer kit, desconto, frete grátis, promoção, oferta relâmpago, bônus ou brinde.
Nunca criar escassez artificial: "últimas unidades", "oferta termina hoje", "compre antes que acabe".
Nunca fornecer dados de Pix, dados bancários, checkout ou orientação de pagamento.
Nunca diagnosticar, indicar tratamento, recomendar medicamento ou suplemento, alterar dose ou avaliar sintomas.',

  escalar_quando = 'Transferir imediatamente quando: reclamação; relato de reação adversa; cliente disse que passou mal; pergunta sobre interação com medicamentos; condição médica; gravidez ou amamentação; pedido de reembolso; cobrança; problema financeiro; problema com pedido; problema de entrega; ameaça de processo ou denúncia; questão jurídica; pedido de documentação sanitária; qualquer informação que não esteja na base.',

  escalar_mensagem = 'Vou te encaminhar para outro setor, que vai estar conseguindo te informar sobre esses assuntos.',

  atualizado_em = now()
where id = 1;

-- Mensagem de boas-vindas no primeiro contato de cada número.
alter table public.treinamento
  add column if not exists saudacao_ativa boolean not null default true,
  add column if not exists saudacao_mensagem text not null default
    'Bem-vindo à Bela Blue Beauty! 💚 Eu sou do atendimento e estou aqui para tirar suas dúvidas. Como posso te ajudar?';

-- Marca quando a saudação já foi enviada, para não repetir a cada mensagem.
alter table public.conversas
  add column if not exists saudou_em timestamptz;

-- ---------------------------------------------------------------------
-- Disparo de e-mail: contatos, campanhas e status de entrega
-- ---------------------------------------------------------------------

create table if not exists public.contatos (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  nome         text,
  origem       text not null default 'importado',   -- importado | pedido | formulario
  inscrito     boolean not null default true,       -- false = pediu para sair
  motivo_saida text,                                -- descadastro | bounce | reclamacao
  criado_em    timestamptz not null default now()
);

create index if not exists contatos_inscrito_idx on public.contatos (inscrito);

create table if not exists public.campanhas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  assunto     text not null,
  corpo_html  text not null,
  status      text not null default 'rascunho'
                check (status in ('rascunho','enviando','enviada','falhou')),
  total       integer not null default 0,
  enviados    integer not null default 0,
  falhas      integer not null default 0,
  criada_em   timestamptz not null default now(),
  enviada_em  timestamptz
);

create table if not exists public.envios (
  id         bigserial primary key,
  campanha   uuid not null references public.campanhas(id) on delete cascade,
  contato    uuid references public.contatos(id) on delete set null,
  email      text not null,
  provedor_id text,                                  -- id da Resend, liga o webhook
  status     text not null default 'enfileirado'
               check (status in ('enfileirado','enviado','entregue','aberto','bounce','reclamacao','falhou')),
  erro       text,
  criado_em  timestamptz not null default now(),
  unique (campanha, email)
);

create index if not exists envios_campanha_idx on public.envios (campanha);
create index if not exists envios_provedor_idx on public.envios (provedor_id);

-- ---------------------------------------------------------------------
-- RLS: leitura autenticada, escrita só service_role
-- ---------------------------------------------------------------------
alter table public.contatos  enable row level security;
alter table public.campanhas enable row level security;
alter table public.envios    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['contatos','campanhas','envios'] loop
    execute format('drop policy if exists %I on public.%I', t || '_leitura', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_leitura', t);
  end loop;
end $$;

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
