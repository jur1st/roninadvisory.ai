# Tokens

Tokens are the project's **design vocabulary**. Every color, type size, spacing value, and layout width that appears on a page resolves, eventually, to a name declared in `site/static/tokens.css`. Component CSS consumes those names via `var(--*)`. It does not invent new ones.

The metaphor carries a real constraint: a vocabulary with ten words can say a limited number of things, and it can say each of them precisely. A vocabulary that grows by one word every time a contributor needs something slightly different ends up being neither precise nor limited. The token file is the enforceable form of "add a word to the vocabulary, then use it."

Two quality-gate agents keep the contract from eroding:

- `rag-web-css-auditor` — requires the three-line fallback pattern on every semantic color, and flags raw color / font / spacing values outside the token block.
- `rag-web-token-enforcer` — maps hard-coded pixel, hex, and `oklch()` values in component CSS back to the nearest token and reports the diff.

[`authoring.md`](authoring.md) documents the authoring flow that rides on top. This file documents the catalog itself.

## The file and what it contains

`site/static/tokens.css` declares a single `:root {}` block plus a `color-scheme: light dark` root declaration. The categories are:

1. Semantic colors (with the three-line fallback pattern).
2. Font stacks — four families keyed to role, not identity.
3. Type scale — six sizes on a modular ratio.
4. Line heights and tracking.
5. Spatial grid — twelve spacing tokens on a quarter-rem scale.
6. Layout widths — the four canonical column constraints.

None of these are expected to grow monotonically. When a token becomes load-bearing on the site but ambiguous in its name, the right move is to rename it (with a scheduled sweep of the consumers), not to add a clearer alias and leave the old one behind.

## Colors and the three-line fallback

Every semantic color declares three times. The browser picks the last line it understands; every other line is dead code for that browser, which is the point.

```css
--color-text: #1a1b22;                              /* static fallback */
--color-text: oklch(0.169 0.034 265);               /* OKLch token    */
--color-text: light-dark(                           /* semantic       */
  oklch(0.169 0.034 265),
  oklch(0.913 0.006 265)
);
```

Three browsers, one declaration:

- A browser that does not parse `oklch()` (very old mobile Safari, some embedded webviews) resolves to `#1a1b22`.
- A browser that parses `oklch()` but does not yet support `light-dark()` resolves to the middle line — a fixed OKLch value.
- A modern browser resolves to the `light-dark()` call, which honors `prefers-color-scheme` via the `color-scheme: light dark` on `:root`.

The dark-mode half of `light-dark()` is not a hand-tuned parallel palette. OKLch being perceptually uniform, the dark variant is what the light variant looks like when you lift lightness and soften chroma in a rule-bound way. A visitor switching system preferences sees the same design, read under different ambient conditions — not a second theme.

**The catalog today:**

| Token                  | Role                                         |
|------------------------|----------------------------------------------|
| `--color-text`         | Primary foreground                           |
| `--color-bg`           | Page background                              |
| `--color-text-muted`   | Secondary copy, captions, metadata           |
| `--color-border`       | Hairlines, table rules, card borders         |
| `--color-surface`      | Elevated panels, code blocks, blockquotes    |
| `--color-accent`       | Links, focus rings, primary actions          |
| `--color-accent-hover` | Hover variant of `--color-accent`            |
| `--color-success`      | Affirmative states                           |
| `--color-warning`      | Attention states                             |
| `--color-error`        | Error / destructive states                   |

Why this many and not more? Because every additional semantic color is one more place a design decision has to resolve. Ten is enough to distinguish structure from state without forcing a contributor to guess which "blue" they need.

**What auditor flags:** any `#…`, `rgb()`, `hsl()`, `oklch()`, `color()`, or named-color literal outside the `:root {}` block. `transparent`, `currentColor`, and `inherit` are allowed.

## Typography

Four font tokens, keyed to role:

| Token              | Role                                    |
|--------------------|-----------------------------------------|
| `--font-structure` | Headings, UI chrome, navigation         |
| `--font-prose`     | Body copy                               |
| `--font-mono`      | Code, inline `<code>`, `<pre>`, `<kbd>` |
| `--font-sans`      | Neutral UI fallback                     |

Today's values are Path A (system fallback) from [`typography.md`](typography.md):

```css
--font-structure: ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', sans-serif;
--font-prose:     Georgia, 'Times New Roman', serif;
--font-mono:      ui-monospace, Menlo, Monaco, 'Courier New', monospace;
--font-sans:      ui-sans-serif, system-ui, -apple-system, sans-serif;
```

Path B (self-hosted woff2) and Path C (Adobe Typekit CDN) both change only this block — every downstream `var(--font-*)` consumer stays identical. That is the token's job: make the font-delivery decision reversible.

Why role-keyed and not identity-keyed? Because "Inter" in a CSS rule locks the design to Inter, and a switch to IBM Plex is a site-wide edit. `--font-structure` says "whatever we are using for structure," and the identity is a detail of the token file. Identity is a parameter of the design; role is the design itself.

## Type scale

Six sizes on a modular ratio (≈1.25):

| Token         | Rem   | Use                                 |
|---------------|-------|-------------------------------------|
| `--size-xs`   | 0.640 | Fine print, captions                |
| `--size-sm`   | 0.800 | Secondary UI text, table headers    |
| `--size-base` | 1.000 | Body prose (the anchor)             |
| `--size-lg`   | 1.250 | Subheads (h3)                       |
| `--size-xl`   | 1.563 | Section heads (h2)                  |
| `--size-2xl`  | 1.953 | Page titles (h1)                    |

Rem, not px, so the visitor's root-size preference carries through. Six sizes, not eight, so the scale stays memorable and the cascade has room to compose (h1 > h2 > h3 > body > small).

The modular ratio is deliberate. The sizes are in geometric progression, so the *perceived* steps between them are equal. A linear scale (12, 14, 16, 20) looks wrong at the top — 20 is barely larger than 16. 1.953 / 1.25 / 1.0 looks right because the ratio is constant.

## Line height and tracking

| Token                 | Value    | Use                                   |
|-----------------------|----------|---------------------------------------|
| `--leading-tight`     | 1.2      | Display and heading type              |
| `--leading-normal`    | 1.5      | UI text, lists, short copy            |
| `--leading-relaxed`   | 1.75     | `<pre>` blocks, dense technical copy  |
| `--leading-prose`     | 2.0      | Long-form body paragraphs             |
| `--tracking-tight`    | -0.025em | Headings (counters optical spread)    |
| `--tracking-normal`   | 0        | Body copy default                     |
| `--tracking-wide`     | 0.025em  | Small caps, uppercase labels          |

Line height is a rhythm decision: tighter for display (where the eye wants density) and looser for long-form prose (where the eye needs a lane to ride down the column). `--leading-prose` at 2.0 is deliberately generous — marketing-page prose is short and invites attention; compressing it saves nothing.

## Spatial grid

Quarter-rem indexed:

| Token         | Rem   | Px (at 16px root) |
|---------------|-------|-------------------|
| `--space-1`   | 0.25  | 4                 |
| `--space-2`   | 0.50  | 8                 |
| `--space-3`   | 0.75  | 12                |
| `--space-4`   | 1.00  | 16                |
| `--space-5`   | 1.25  | 20                |
| `--space-6`   | 1.50  | 24                |
| `--space-8`   | 2.00  | 32                |
| `--space-10`  | 2.50  | 40                |
| `--space-12`  | 3.00  | 48                |
| `--space-16`  | 4.00  | 64                |
| `--space-20`  | 5.00  | 80                |
| `--space-24`  | 6.00  | 96                |

The index number tracks the pixel / 4 ratio (at a 16px root), which makes pixel-to-token translation mechanical. `16px → --space-4`, `32px → --space-8`. `rag-web-token-enforcer` runs exactly this map against component CSS and reports any margin/padding/gap/inset literal.

Values between grid points (5px, 7px, 18px) are reported as "no direct token — use closest or define new." The overwhelmingly correct response is "use closest." A new token gets added to the grid only when a rhythmic reason demands it, and the reason goes in the commit message. Spacing grids that grow by attrition — a token here, a token there, none of them explained — cease to be grids.

## Layout widths

| Token                 | Value   | Use                                           |
|-----------------------|---------|-----------------------------------------------|
| `--width-prose`       | 65ch    | Measure for body paragraphs                   |
| `--width-content`     | 830px   | Main content column for typical pages         |
| `--width-container`   | 1200px  | Outer wrapper for wide layouts                |
| `--width-sidebar`     | 250px   | Future navigation column                      |

`--width-prose` is in `ch`, not `px`, because readable measure is a function of the font, not of the screen. Every other width is in px because the outer layout is about the viewport, not the glyph.

## A worked example: adding an interior-accent color

The scenario: a future page needs a subtle tint for a pull-quote background that is lighter than `--color-surface` but still clearly an inset.

The wrong approach: `background: #f7f8fb;` on the pull-quote rule. The auditor flags it. The enforcer suggests the nearest `--color-surface` match and notes it is not an exact fit.

The right approach: add the token to `site/static/tokens.css`:

```css
--color-surface-subtle: #f7f8fb;
--color-surface-subtle: oklch(0.975 0.004 265);
--color-surface-subtle: light-dark(
  oklch(0.975 0.004 265),
  oklch(0.170 0.030 262)
);
```

Three lines because every semantic color gets three lines — the auditor would flag this new token otherwise. The dark-mode OKLch value is derived, not hand-guessed: take `--color-bg`'s dark value and lift lightness by a small, consistent delta. This is the rule the rest of the dark palette follows; a new token that ignores the rule will look wrong next to its siblings.

Then, in component CSS: `background: var(--color-surface-subtle);`. The addition is a three-line commit in `tokens.css` plus a one-line consumer. No raw values anywhere.

## What is deliberately out of scope

- **No shadow tokens.** The design voice doesn't use shadow-based elevation. If it starts to, the tokens will land next to colors and follow the same three-line pattern.
- **No animation-timing tokens.** No current motion requirements. If motion arrives, `--duration-*` and `--easing-*` tokens land first, consumers second.
- **No breakpoint tokens.** Today's single-page site resolves fluidly. A breakpoint token set becomes useful once a second page with a real navigation column exists.

Adding any of these should be done under the same rule: the token exists first, the consumer second.

## Cross-references

- [`authoring.md`](authoring.md) — the authoring flow that consumes this contract.
- [`typography.md`](typography.md) — the font-delivery paths that change the `--font-*` block.
- [`visual-qa.md`](visual-qa.md) — the Playwright CLI loop that verifies rendered output.
