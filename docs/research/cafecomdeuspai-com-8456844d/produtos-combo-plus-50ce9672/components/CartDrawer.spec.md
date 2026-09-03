# CartDrawer Specification

## Overview
- **Target files:** `CartDrawer.tsx` and `CartDrawer.module.css`
- **Reference:** user-provided 738 × 1460 screenshot
- **Interaction model:** click-driven drawer with quantity, removal, coupon, checkout and close actions.

## DOM Structure
- Fixed full-viewport root and dimmed backdrop.
- Right-side white drawer, 738 px wide at the reference viewport and full available width on smaller screens.
- Header: outlined bag icon left, centered `Sua sacola`, X icon right.
- Product row: 200 × 190-ish product image; title, price and quantity controls in center; trash icon right.
- Thin divider below product, flexible whitespace, and bottom purchase block.

## Computed/Measured Styles
- Drawer: white, height 100dvh, width min(738px,100vw), dark teal 3 px top accent, Work Sans.
- Inner horizontal padding: 32 px at 738 px width.
- Header: 112 px tall; title about 36 px/700; icons about 48 px.
- Product image: 200 × 190 px, object-fit cover, lower corners rounded 16 px.
- Product title: 28 px/400; price: 32 px/600; quantity label: 25 px/600.
- Stepper: 160 × 57 px, #f5f5f5 background, 18 px radius; circular gray +/- controls.
- Trash: icon-only, 39 px. Divider: #ddd, 1 px.
- Subtotal and total: 29–31 px; values right aligned and bold.
- Coupon label: uppercase, 20 px; input/button row 84 px tall; apply button 184 px.
- Checkout: 64 px, #202020, white bold 27 px, 17 px radius.
- Continue: 64 px, white, 4 px #202020 border, bold 27 px, 17 px radius.

## States & Behaviors
- Closed: invisible and drawer translated 100% right.
- Open: backdrop fades in and drawer slides from right in 300 ms.
- X, backdrop and `Continuar comprando` close the drawer.
- Plus increments quantity and updates subtotal/total.
- Minus decrements; at one it removes the item. Trash removes the item.
- Coupon accepts text. `PRIMEIRACOMPRA` shows success; other values show invalid feedback.
- `Finalizar compra` links to `/checkout`.
- Hover: controls receive a subtle gray background; primary button lightens slightly.

## Assets
- Product: `/sites/cafecomdeuspai-com-8456844d/produtos-combo-plus-50ce9672/combo-main.webp`.
- Icons: Lucide outline ShoppingBag, X, Trash2, Minus and Plus.

## Text Content
`Sua sacola`, `Combo Plus | Frete grátis`, `R$289,90`, `Quantidade:`, `Sub-total:`, `CUPOM DE DESCONTO`, `Digite seu Cupom`, `Aplicar`, `Total:`, `Finalizar compra`, `Continuar comprando`.

## Responsive Behavior
- **Desktop:** right drawer is 738 px wide.
- **Tablet (768 px):** drawer keeps 738 px maximum, nearly full screen.
- **Mobile (390 px):** full width with 20 px padding, smaller product image/type, and the purchase block anchored at bottom.
- **Breakpoint:** compact layout under 560 px.
