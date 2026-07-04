# SignDoc — Design Specification

> Reference doc for all frontend work. Read this before building/styling any component or page.

## Visual Identity

**Feel:** Enterprise-rich, professional, modern — closer to premium SaaS (Linear/Vercel-tier polish) than playful/colorful startup design.

**Palette:** Strictly monochrome/metallic. No accent colors beyond metallic gradients.
- **Light mode:** "Metallic white" — base surfaces use subtle multi-stop light-grey gradients (e.g. `#FAFAFA` → `#F0F0F0`) with soft inner shadows to read as brushed metal, not flat paper.
- **Dark mode:** "Metallic black" — same gradient logic inverted (e.g. `#0A0A0A` → `#161616`).
- One neutral chrome/silver highlight tone for focus states and the logo — no bright/saturated colors anywhere.

## Typography

- **Headings:** Geist or Söhne — geometric, confident, premium feel.
- **Body:** Inter — neutral, highly readable, pairs cleanly with headings.

## Shape Language

- Corners: consistently rounded. Cards ~12–16px radius, buttons ~8px radius. Soft, not sharp — but not bubbly/playful either.

## Clickable Elements (Glass style)

- No visible button borders/outlines by default.
- Background: faint frosted-glass blur (`backdrop-filter: blur(...)`) that appears/intensifies only on hover — clickable area itself should feel like it "fades in" as a surface.
- Hover interaction: subtle scale-up, 1.02–1.03x, eased over 150–200ms. No harsh snapping.

## Ambient Background Motion

- A full-screen layer (canvas or SVG) behind all page content.
- Very low-opacity wave/ripple effect that gently follows the cursor position.
- Motion should use easing/lag (not instant 1:1 tracking) so it feels alive but subtle — visible, not distracting.
- Applies even over empty space on sparse pages.

## Dark / Light Mode

- Required on every screen.
- Toggle control: small lamp icon, fixed top-right.
- Switching modes triggers a smooth ~300ms crossfade across the entire theme (not an abrupt flash/snap).

## Motion (General)

- Page transitions: soft fade + slight upward slide, ~200ms. Nothing more elaborate than this — avoid complex choreography.

## Logo

- Monogram built from "S" and "D" (SignDoc), interlocking.
- Rendered using the same metallic gradient treatment as the rest of the UI — the logo should look "made of" the same material as the interface, not a separate flat asset.
- Provide as a reusable SVG component, works in both light and dark mode.

## Build Order (for reference when assigning tasks)

1. Theme foundation — Tailwind config + CSS variables for both modes, dark/light toggle with crossfade.
2. Ambient cursor-following background layer (standalone component).
3. Glass-style reusable clickable components (buttons, cards, nav items).
4. Apply theme + background + glass components to existing pages (envelopes list, templates list, envelope detail, sign page) — visual/structural changes only, no logic changes.
5. Logo SVG component + page transition motion + final dark/light QA pass across every touched page.

## Explicit Non-Goals (for this phase)

- No colorful/bright accent palette.
- No complex animation choreography beyond what's specified above.
- No changes to backend logic, API routes, or data handling — this spec governs visual/frontend presentation only.
