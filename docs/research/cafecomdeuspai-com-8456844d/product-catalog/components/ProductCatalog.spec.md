# ProductCatalog Specification

## Overview
- Target: `src/components/sites/cafecomdeuspai-com-8456844d/shared/productCatalog.ts`
- Interaction model: static typed data.

## Content
- Eleven products from the three home rails, using the exact home images asset-006 through 009, 012 through 015, and 017 through 019.
- Each item includes slug, name, current price in cents, display price, original price from the source homepage, installment text, image path, category, short product description and SKU.
- Slugs match the original store URLs recovered by browser automation.

## Behavior
- Expose lookup by slug and the complete list for `generateStaticParams`.
- No UI or responsive behavior.
