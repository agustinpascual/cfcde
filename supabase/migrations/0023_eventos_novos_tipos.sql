-- Novos tipos de evento do funil, bloqueados pelo CHECK antigo (0002):
--   comprar          → clique no botão "Comprar" na página do produto
--   checkout_parcial → dados preenchidos no checkout (carrinho abandonado)
--   voltou           → retorno à aba após copiar o código PIX
-- Sem isto o insert desses eventos falha com eventos_tipo_check (23514) e o
-- evento é descartado em silêncio (a compra não quebra, mas o dado some).

alter table public.eventos drop constraint if exists eventos_tipo_check;

alter table public.eventos add constraint eventos_tipo_check
  check (tipo in (
    'pageview', 'secao', 'comprar', 'checkout', 'checkout_parcial',
    'pix_gerado', 'pix_copiado', 'voltou', 'compra', 'saida'
  ));
