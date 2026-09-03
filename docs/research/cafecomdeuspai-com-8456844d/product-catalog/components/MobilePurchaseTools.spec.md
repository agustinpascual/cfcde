# MobilePurchaseTools Specification

## Overview
- Target: shared `ProductPurchaseTools.tsx` and CSS module.
- Reference: two user screenshots, 329px mobile viewport.
- Interaction model: click-driven shipping calculation and fixed purchase controls.

## DOM and styles
- Shipping calculator sits directly below the product image/gallery in the normal document flow.
- Light gray #f7f7f7 panel, thin #e5e5e5 borders, 12px text, CEP field and underlined `Calcular` action.
- After an 8-digit CEP calculation show `Sucesso! Você tem frete grátis`, then PAC and SEDEX rows.
- Mobile purchase bar fixed to viewport bottom, white, top border/shadow, z-index below cart drawer.
- Bar includes product name, optional struck price, current price, installment text, `Frete grátis`, compact quantity capsule and black Comprar button.
- Approximate reference height 130px; 16px horizontal padding; product name 11px bold; price 14px; metadata 9px; controls 48px capsule and 52px CTA.

## Behavior
- PAC delivery date = consultation date + 25 calendar days.
- SEDEX delivery date = consultation date + 13 calendar days.
- Date displayed explicitly in pt-BR format.
- Invalid CEP displays a validation message.
- Quantity is shared with the page's desktop purchase controls.
- Comprar uses the existing cart-opening callback.
- Hidden above 767px; fixed only on mobile.

## Responsive
- 390px and 329px: no horizontal overflow; long product names clamp to two lines.
- Desktop: fixed bar hidden; shipping calculator remains below the gallery.
