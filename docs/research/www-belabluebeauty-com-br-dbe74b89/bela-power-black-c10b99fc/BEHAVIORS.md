# Comportamentos — belabluebeauty.com.br/bela-power-black/

## Scroll
- **Header**: `position: sticky; top: 0; z-index: 12; transition: .3s`. Ganha a classe `fixed`
  quando `scrollY > 98` (altura do letreiro + barra de contagem). Nenhuma propriedade visual
  muda entre os estados — diff de `getComputedStyle` em scrollY 0 / 400 / 1500 só acusou a classe.
- **`div.detalhes`** (coluna direita): `position: sticky; top: 112px` — acompanha o scroll
  enquanto a galeria (1576px) rola.
- Sem Lenis / Locomotive Scroll. Sem scroll-snap. Sem IntersectionObserver de entrada.

## Animações CSS (keyframes extraídos)
```css
@keyframes bbLetreiro   { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
@keyframes circularLoading { 0% { transform: rotate(0) } 100% { transform: rotate(360deg) } }
@keyframes onlineIndicator { /* pulso do indicador do chat */ }
@keyframes bbCarregando { /* shimmer de placeholder */ }
```
- `.bb-letreiro-track`: `animation: bbLetreiro 28s linear infinite`, `display: flex`.
  Contém **6 spans** (um vazio) — é o HTML literal do site.

## Clique
- **Kits** (`.bb-kit-card`): trocam a seleção. O card ativo recebe
  `border: 2px solid #12336e`, `box-shadow: 0 0 0 2px rgba(18,51,110,.08)` e a faixa
  `::before { content: "OPÇÃO SELECIONADA" }` (bg #12336e, 10px/800, h23, absolute top/left/right 0).
  Transição: `border-color .2s, box-shadow .2s, transform .2s`.
- **Accordions** "Descrição" / "Especificações": alternam `.active-tab`. Descrição abre por padrão.
- **Galeria**: miniaturas e setas trocam o slide; as setas ficam em `top: 363px`,
  `left: 113px` (prev) e `left: 829px` (next), 24×24, brancas.

## Timers
- Barra do topo: contagem regressiva com `data-timer`, exibindo `00 Dia(s) : 02 Hora(s) : ...`.
- Coluna do produto: "Termina em HHh MMm SSs".
- **Escassez dinâmica**: `de R$xxx`, `Economia de R$xxx`, número de avaliações e
  "ÚLTIMAS N UNIDADES" mudam entre carregamentos — são gerados no servidor a cada request.

## Descoberta importante
A tarja **"TOP ENTRE OS PRODUTOS MAIS VENDIDOS"** e os selos de desconto dos cards
de produto **não existem no DOM** — estão embutidos nos próprios arquivos de imagem.
Renderizá-los como elemento HTML duplica a tarja.

## Responsivo (original)
- ≤1279px: as colunas da galeria e dos detalhes empilham.
- ≤991px: a navegação vira menu lateral (`div.fixed-all-dep`, 320px).
- ≤767px: tudo em coluna única.
