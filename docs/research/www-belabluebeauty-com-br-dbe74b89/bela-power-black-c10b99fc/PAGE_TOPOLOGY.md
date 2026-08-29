# Topologia — belabluebeauty.com.br/bela-power-black/

Origem: `https://www.belabluebeauty.com.br/bela-power-black/` (plataforma wBuy, jQuery 3.7.1)
Medido em 1440px. Altura total do original: **5192px**.

| # | Seção | Seletor original | y | altura | Modelo de interação |
|---|-------|------------------|---|--------|---------------------|
| 1 | Letreiro | `div.bb-letreiro` | 0 | 44 | animação CSS infinita |
| 2 | Barra de contagem | `div.top-countdown-message` (owl) | 44 | 54 | timer JS |
| 3 | Header | `header.header` | 98 | 90 | **sticky** (top 0, z-12) |
| 4 | Breadcrumb | `#produto .central nav.mb-4` | 188 | 17 | estático |
| 5 | Galeria | `div.cln` | 205 | 1576 | slick: miniaturas + slide principal |
| 6 | Info do produto | `div.detalhes` | 205 | 1546 | **sticky** (top 112px) |
| 7 | Seletor de kits | `.bb-kit-card` ×3 | — | 492 | clique (radio) |
| 8 | Descrição | `div.info-desc` (920px) | 1781 | 1555 | accordion (aberto) |
| 9 | Especificações | `div.descricao` | — | 111 | accordion (fechado) |
| 10 | Avaliações | `div.native-reviews-product` | 3336 | 395 | carrossel owl |
| 11 | Relacionados | `section.showcase-relateds` | 3807 | 716 | estático (4 cards) |
| 12 | Benefícios | `#alerts` | 4335 | 188 | estático |
| 13 | Newsletter | `div.cols-newsletter` | 4563 | 82 | formulário |
| 14 | Rodapé | `div.wrapper__pages` | 4681 | 301 | estático |
| 15 | Selos/pagamentos | `div.wrapper__payments-seals` | 5017 | 117 | estático |
| + | WhatsApp | `a.left` | fixed | 50×50 | bottom 64 / left 10 |
| + | Assistente "Bela" | div z-10000 | fixed | 264×52 + 72×72 | bottom 13 / right 13 |

## Layout
`main.main-product-page` tem `overflow: hidden`.
`.central-product` é flex (wrap) com largura 1440 e padding 0 20px → conteúdo de 1400:
`.cln` (840) + `.detalhes` (560, sticky) na primeira linha; `.info-desc` (920, margin 0 240) e
as avaliações (1400) quebram para as linhas seguintes.

## Desvios conscientes no clone
- O assistente virtual foi **removido a pedido**; o botão do WhatsApp ocupa o canto inferior direito.
- Foi **adicionada** uma notificação de prova social (canto inferior esquerdo) que não existe no original.
- Os carrosséis owl/slick foram reimplementados em React (estado local), sem as bibliotecas.
