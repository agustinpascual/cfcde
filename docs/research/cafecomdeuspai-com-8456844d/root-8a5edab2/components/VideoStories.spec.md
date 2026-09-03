# VideoStories Specification

## Overview
- Target: `HomeVideoStories.tsx` and CSS module; replaces the current static `media` video cards in `HomeLower`.
- References: user screenshots for 1920 desktop, 329 mobile and 470×823 story viewer.
- Interaction model: autoplay center card, click-to-open modal, timed video progression and direct navigation.

## Assets and order
- Seven entries supplied by the user. Local unique assets: `videos/video-1.mp4`, `videos/video-2.mp4`, `videos/video-5.mp4`.
- Order: video-1, video-2, video-2, video-2, video-5, video-2, video-2.
- Initial centered/active item is Video 1 and it autoplays muted.

## Carousel desktop
- White section with centered title `Descubra cada detalhe em vídeo` around 27 px bold.
- Exactly five vertical cards visible, distributed across the full width.
- Center card 280×500-ish and lifted; four side cards around 240×430 with rounded 15 px corners and subtle shadow.
- Center video autoplays muted; when it ends, advance to the next item.

## Carousel mobile
- Section title left aligned, 21 px bold.
- Viewport shows one centered active card about 180×320 with one smaller/cropped card peeking on each side.
- Horizontal stage is clipped, white background, cards rounded 10 px.
- Center video autoplays. Clicking any card opens that story.

## Story viewer
- Full viewport dark translucent overlay, z-index above drawer/navigation.
- Vertical viewer max-width 470 px and max-height 100dvh, black background, rounded corners on larger screens.
- Selected video fills the viewer using object-fit cover and autoplay.
- Seven progress segments across top; completed segments white, current segment animates with video progress.
- Top controls: mute/unmute left and X close right.
- Tap/click left/right halves moves previous/next.
- Right lower stack: heart, WhatsApp and share circular controls.
- Bottom translucent panel contains bright green `Saiba mais` CTA linking to `/produtos/combo-plus/`.
- Escape closes; body scroll locked while open.

## Responsive and accessibility
- 1440: five cards; 768 and below: three-card composition.
- No horizontal page overflow at 329 or 390 px.
- Buttons have Portuguese aria-labels; reduced-motion disables transforms/transitions where appropriate.
