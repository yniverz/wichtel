---
title: Design guidelines
description: How Wichtel looks and why – principles, colour tokens, typography and patterns for everyone working on the interface.
---

Goal: Wichtel should feel like a deliberately designed tool of a festival, not like a generic (AI)
template. The model is a **printed festival programme**: warm paper, ink-black type, one loud signal
colour, clear lines.

## Principles

1. **Hierarchy through typography, lines and spacing** – not through shadows, gradients or cards.
2. **One signal colour.** The primary colour (default: signal red `#c03a1c`) marks the single most
   important action and active states. The accent colour (default: wristband yellow `#f4c430`) is
   reserved for hints and small markers.
3. **Little rounding.** 3 px for small elements (badges, checkboxes), 4–6 px for controls and
   surfaces. No pills except for actual pills.
4. **Honest content.** Texts say something concrete about the festival; no placeholder slogans, no
   emojis as icons, no decorative “live” badges.
5. **Mobile first** for volunteers, large touch targets (≥ 44 px), navigation at the bottom.

## Tokens (`src/routes/layout.css`)

| Token              | Light             | Dark      | Use                     |
| ------------------ | ----------------- | --------- | ----------------------- |
| `surface`          | `#f5f2eb`         | `#161512` | Page background (paper) |
| `surface-raised`   | `#fffdf8`         | `#1f1d19` | Input fields, surfaces  |
| `ink`              | `#1d1b17`         | `#f2eee6` | Text, strong lines      |
| `ink-muted`        | `#696358`         | `#a29c90` | Secondary text          |
| `line`             | `#dcd5c7`         | `#36322b` | Fine dividers           |
| `brand` / `accent` | from the settings |           | Signal colour / hints   |
| `brand-text`       | `brand`           | lightened | Links and coloured text |

## Typography

**Archivo** (variable, bundled locally – no Google Fonts requests):

- `font-display` – condensed (72 %), very bold, for page titles and large numbers, mostly in capitals.
- Body text and controls in normal width, 400–700.
- Numbers with `tabular-nums`.

## Patterns

- **Page titles**: `PageHeader` – large condensed title with an ink-black line below.
- **Lists instead of card grids**: entries separated by lines; cards (`Card`) only for form sections.
- **Numbers**: large in `font-display`, not in tiles.
- **Confirmations**: always `ConfirmForm` (the same dialog for every consequential action).
- **Contrast**: text at least 4.5 : 1; the settings warn about brand colours that are too weak.
