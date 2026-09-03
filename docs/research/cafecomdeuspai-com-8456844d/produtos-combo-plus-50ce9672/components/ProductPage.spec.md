# ProductPage specification

## Overview
- Target: `ProductPage.tsx`
- Interaction model: click-driven gallery, quantity, description and cookie dismissal.
- Desktop screenshot: `desktop-full.png`; mobile: `mobile-full.png`.

## Styles
- Main max-width 1300px, desktop grid 65%/35%, gap 28px, top margin 55px.
- Gallery uses a 72px thumbnail rail and square primary image; thumbnails separated by 10px.
- Product title 26px bold. Pricing panel `#f7f7f7`, 24px vertical padding. Old price gray struck-through; current R$289,90 bold 22px.
- Buy button black, white 14px bold, radius 3px.
- Description 14px/1.5; intro heading serif bold 18px; bullets spaced 12px.
- Reviews and recommendations separated by light borders, centered headings.

## Responsive
- Below 768px gallery is full width, thumbnail rail overlays/scrolls horizontally; content stacks.
- Product title and price reduce slightly; description follows immediately.

## Assets
- `combo-main.webp` through `combo-7.webp`; `logo.png`.

## Text
- Use verbatim product and footer content from `desktop.json`.
