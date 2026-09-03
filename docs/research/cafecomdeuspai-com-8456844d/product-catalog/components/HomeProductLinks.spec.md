# HomeProductLinks Specification

## Overview
- Target: `HomeCommerce.tsx` and shared `CartDrawer.tsx` only.
- Interaction model: click navigation and cart state.

## Behavior
- Every one of the eleven home product cards links to `/produtos/<original-slug>/`.
- CartDrawer accepts optional product name, image and unit price, with Combo Plus defaults preserving existing routes.
- Product title, image, subtotal and total reflect the selected product.
- Existing quantity, coupon, remove, close and checkout behaviors remain unchanged.

## Responsive
- No layout changes to the home rails or drawer; preserve their current desktop/mobile styling.
