# CatalogProductPage Specification

## Overview
- Target: `src/components/sites/cafecomdeuspai-com-8456844d/product-catalog/CatalogProductStore.tsx` and module CSS.
- Reference: existing Combo Plus product detail route and original Café com Deus Pai product layout.
- Interaction model: click-driven gallery, quantity, description accordion and cart.

## DOM and exact visual foundation
- Reuse `SiteHeader` and `SiteFooter` from the Combo Plus namespace.
- Main product section: max-width 1180 px, centered, breadcrumb above a two-column gallery/info grid.
- Gallery uses the exact product card asset as the main image with `object-fit: contain`, white background.
- Product title 27 px desktop; old price struck through; current price 30 px; installment and free-shipping line below.
- Quantity stepper and black purchase button match the existing Combo Plus control dimensions.
- Description, reviews and recommendation rail follow the existing product-page visual language.

## States and behavior
- Quantity minus is bounded at one; plus increments.
- Comprar opens the shared cart with selected product and quantity.
- Description toggles with +/-.
- Cart checkout routes to `/checkout`.
- Cards in recommendations navigate to their actual local product routes.
- Image/card/button hover transitions: 160–250 ms ease.

## Responsive
- Desktop 1440: two columns.
- Tablet 768 and mobile 390: gallery stacks over details; purchase controls remain usable without horizontal overflow.
- Breakpoint: 767 px.
