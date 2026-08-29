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
