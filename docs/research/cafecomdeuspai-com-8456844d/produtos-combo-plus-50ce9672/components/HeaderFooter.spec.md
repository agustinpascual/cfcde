# HeaderFooter specification

## Overview
- Target: `HeaderFooter.tsx`
- Interaction model: static navigation; mobile menu button is click-driven.

## Structure and styles
- Promo bar: 40px black, centered uppercase white/gray 12px bold text.
- Header: white, max-width 1300px, 72px tall desktop; logo left, uppercase nav center, rounded search and account/cart icons right.
- Desktop body font: Arial/Roboto-like sans-serif, black on white.
- Footer: `#f6f6f3`, rounded 8px, max-width 1300px, four columns, 28px gaps; legal/payment strip below on white.

## Responsive
- Mobile header 58px; hamburger, centered 34px logo, search and bag icons. Desktop nav hidden.
- Footer columns collapse into bordered accordion-like rows; social icons remain above.

## Text
- Lançamentos, Relâmpago, Imperdível, Combos, Kids/Teens, Idiomas, Compra Internacional.
- Footer text exactly follows `desktop.json` body content.
