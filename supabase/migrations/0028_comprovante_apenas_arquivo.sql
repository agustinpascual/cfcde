-- O cliente envia somente o arquivo; a conferência dos dados passa a ser visual.
begin;
alter table public.pix_comprovantes
  alter column nome_informado drop not null,
  alter column valor_informado drop not null,
  alter column horario_informado drop not null,
  alter column valor_compativel drop not null,
  alter column horario_compativel drop not null;

comment on table public.pix_comprovantes is
  'Arquivo privado para conferência humana. Não altera pedidos.status ou pago_em.';
commit;
