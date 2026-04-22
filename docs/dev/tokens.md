# Tokens

Tokens are the project's **design vocabulary**. Every color, type size, spacing value, rule weight, page margin, and layout width that appears on a page resolves, eventually, to a name declared in `site/static/tokens.css`. Component CSS consumes those names via `var(--*)`. It does not invent new ones.

The metaphor carries a real constraint: a vocabulary with a fixed set of words can say a limited number of things, and it can say each of them precisely. A vocabulary that grows by one word every time a contributor needs something slightly different ends up being neither precise nor limited. The token file is the enforceable form of "add a word to the vocabulary, then use it."

Two quality-gate agents keep the contract from eroding:

- `rag-web-css-auditor` — requires the three-line fallback pattern on every semantic color, and flags raw color / font / spacing values outside the token block.
- `rag-web-token-enforcer` — maps hard-coded pixel, hex, and `oklch()` values in component CSS back to the nearest token and reports the diff.

[`authoring.md`](authoring.md) documents the authoring flow that rides on top. This file documents the catalog itself. [`design-system.md`](design-system.md) explains why the catalog is shaped the way it is — what editorial claim the palette is making and what invariants keep it recoverable.

## The file and what it contains

`site/static/tokens.css` declares a single `:root {}` block plus a `color-scheme: light dark` root declaration. The categories are:

1. Semantic colors — the two-ink editorial palette, with the three-line fallback pattern.
2. Tier-1 canonical aliases — six names the validation script and quality-gate agents address.
3. Font stacks — four families keyed to role, not identity; four optical voices.
4. Type scale — nine sizes across an editorially-shaped range (xs through 5xl).
5. Line heights and tracking — an editorial leading and tracking catalog.
6. Spatial grid — ten spacing tokens on a stepped editorial progression.
7. Rule weights — three named weights for hairline, thin, and double-rule work.
8. Page margins — four named margins that scale the cover-frame padding with viewport.
9. Layout widths — the five canonical column constraints.

None of these are expected to grow monotonically. When a token becomes load-bearing on the site but ambiguous in its name, the right move is to rename it (with a scheduled sweep of the consumers), not to add a clearer alias and leave the old one behind.

## Colors and the three-line fallback

Every semantic color declares three times. The browser picks the last line it understands; every other line is dead code for that browser, which is the point.

```css
--color-ink: #141210;
--color-ink: oklch(0.180 0.006 60);
--color-ink: light-dark(oklch(0.180 0.006 60), oklch(0.920 0.004 80));
```

Three browsers, one declaration:

- A browser that does not parse `oklch()` (very old mobile Safari, some embedded webviews) resolves to `#141210`.
- A browser that parses `oklch()` but does not yet support `light-dark()` resolves to the middle line — a fixed OKLch value.
- A modern browser resolves to the `light-dark()` call, which honors `prefers-color-scheme` via the `color-scheme: light dark` on `:root`.

The dark-mode half of `light-dark()` is not a hand-tuned parallel palette. OKLch being perceptually uniform, the dark variant is what the light variant looks like when you lift lightness and soften chroma in a rule-bound way. A visitor switching system preferences sees the same design, read under different ambient conditions — not a second theme.

## The editorial palette — seven semantic colors

The palette is two inks on warm off-white paper, with a single second accent. State tokens (success, warning, error) are deliberately absent. They are not used on the current site, and a disciplined palette is the point. If a future page legitimately needs a state color, the token lands in `tokens.css` first and the consumer second — and the commit that adds it records the register shift as a decision, because adding a state color is adding a third ink. See `docs/dev/plans/04-design-system-lock-in.md` Decision 3.

| Token               | Role                                                       |
|---------------------|------------------------------------------------------------|
| `--color-ink`       | Deep ink — warm, not pure black. Primary foreground.       |
| `--color-paper`     | Warm off-white paper. Page background. Load-bearing.       |
| `--color-ink-muted` | Secondary ink — colophon, folios, metadata.                |
| `--color-rule`      | Rule work — hairlines, dividers.                           |
| `--color-mark`      | The second ink. Oxblood — editorial red, not web-red.      |
| `--color-surface`   | Half-step warmer than paper. Colophon strips, insets.      |
| `--color-ink-soft`  | Interior ink-soft — pull quotes, footnote markers.         |

Why seven and not more? Because every additional semantic color is one more place a design decision has to resolve. Seven is enough to carry the full editorial register — structure, hierarchy, rule work, and a single accent — without forcing a contributor to guess which near-ink they need.

The `--color-paper` note is not decorative: the editorial direction collapses the moment the page feels sterile. The warm off-white is load-bearing. Swapping it for a blue-leaning `#fafafa` is a theory shift, not a color preference.

`--color-mark` (oxblood) is the only non-ink color. Oxblood is editorial red — the tone of an archival stamp, not a CTA button. It is used sparingly: the issue mark, the masthead ornament, one keyword, focus rings. A second accent added for any other purpose shifts the register from editorial to commercial.

**What auditor flags:** any `#…`, `rgb()`, `hsl()`, `oklch()`, `color()`, or named-color literal outside the `:root {}` block. `transparent`, `currentColor`, and `inherit` are allowed.

## Tier-1 canonical aliases

The validation script (`tools/scripts/validate-tokens.sh`) and the quality-gate agents address the site by canonical names. Six aliases map the editorial register onto those names:

| Alias                 | Routes to           |
|-----------------------|---------------------|
| `--color-text`        | `--color-ink`       |
| `--color-bg`          | `--color-paper`     |
| `--color-text-muted`  | `--color-ink-muted` |
| `--color-border`      | `--color-rule`      |
| `--color-accent`      | `--color-mark`      |
| `--color-accent-hover`| `--color-ink-soft`  |

Component CSS may address either the editorial names or the canonical aliases. The distinction is meaningful: `--color-mark` says "this is the second ink, used as an ornament," while `--color-accent` says "this is a primary action color." They resolve to the same value but carry different intent signals. The naming convention for a new consumer is a judgment call; the important thing is that no raw value bypasses the token layer entirely.

## Typography

Four font tokens, keyed to role and optical register:

| Token              | Role                                                  |
|--------------------|-------------------------------------------------------|
| `--font-display`   | Display serif — the cover voice (FreightDisp Pro)     |
| `--font-text`      | Text serif — body copy, pull quotes (FreightText Pro) |
| `--font-grotesque` | Grotesque — colophon, metadata, small-caps (Acumin)   |
| `--font-mono`      | Mono — machine-register items (Berkeley Mono)         |

Three voices is the ceiling: one serif family at two optical sizes (display + text), one grotesque for structure, one mono for machine register. A fourth face is a theory shift. See [`design-system.md`](design-system.md) for the reasoning.

Tier-1 canonical aliases route to the editorial tokens:

| Alias             | Routes to           |
|-------------------|---------------------|
| `--font-structure`| `--font-grotesque`  |
| `--font-prose`    | `--font-text`       |
| `--font-sans`     | `--font-grotesque`  |

Component CSS may use either. The editorial names (`--font-display`, `--font-text`, `--font-grotesque`) carry the specific optical-register intent; the canonical aliases are for contexts where the generic role is the right signal. The four fallback stacks each carry graded substitutes so the design holds its register even when the Typekit kit is not loaded. See [`typography.md`](typography.md) for the full fallback logic and the Path C operational setup.

## Type scale

Nine sizes across an editorial range. The scale is not a uniform modular ratio: the display sizes (3xl, 4xl, 5xl) deliberately break the ratio for optical composition at cover scale. A strict modular ratio produces steps that look too close together at large sizes; the editorial scale opens those steps.

| Token         | Rem    | Px   | Use                            |
|---------------|--------|------|--------------------------------|
| `--size-xs`   | 0.750  | 12   | Folios, issue marks            |
| `--size-sm`   | 0.875  | 14   | Colophon, metadata             |
| `--size-base` | 1.000  | 16   | Body prose (the anchor)        |
| `--size-lg`   | 1.250  | 20   | Lede                           |
| `--size-xl`   | 1.875  | 30   | Sub-display                    |
| `--size-2xl`  | 2.750  | 44   | Section lede                   |
| `--size-3xl`  | 4.250  | 68   | Masthead at tablet             |
| `--size-4xl`  | 6.500  | 104  | Masthead at desktop            |
| `--size-5xl`  | 9.500  | 152  | Masthead at widescreen         |

Rem, not px, so the visitor's root-size preference carries through. At cover scale, `clamp()` is the authoring primitive — the masthead title transitions between size steps with `clamp(var(--size-3xl), 8vw, var(--size-5xl))` rather than hard breakpoints.

## Leading and tracking

The editorial leading and tracking catalog is shaped for display-serif composition, not for UI type:

| Token                | Value      | Use                                          |
|----------------------|------------|----------------------------------------------|
| `--leading-display`  | 0.92       | Tight optical — masthead display serif       |
| `--leading-tight`    | 1.10       | Sub-display, section heads                   |
| `--leading-snug`     | 1.22       | Large body, pull quotes                      |
| `--leading-normal`   | 1.48       | Alias for `--leading-prose`                  |
| `--leading-prose`    | 1.48       | Body paragraphs                              |
| `--leading-relaxed`  | 1.70       | Metadata, short colophon lines               |

| Token                  | Value       | Use                                         |
|------------------------|-------------|---------------------------------------------|
| `--tracking-display`   | -0.025em    | Optical tightening at display scale         |
| `--tracking-tight`     | -0.025em    | Alias                                       |
| `--tracking-text`      | 0           | Body default                                |
| `--tracking-normal`    | 0           | Alias                                       |
| `--tracking-wide`      | 0.025em     | Wide labels                                 |
| `--tracking-caps`      | 0.12em      | Small-caps / all-caps                       |
| `--tracking-caps-lg`   | 0.18em      | Hairline caps at small sizes                |

`--leading-display: 0.92` is sub-unit line-height — valid CSS, and correct for multi-line display serif at 4xl–5xl where default line-height would open too much air between descenders and ascenders. Component CSS that sets display type must use this token, not `line-height: 1`.

## Spatial grid

The editorial spacing progression is not a uniform quarter-rem grid through its entire range. The first four steps are quarter-rem (0.25 → 1.00rem); beyond that, the steps are editorial — multiples of a half-rem, a full rem, then larger jumps for the wide horizontal spacers a cover layout needs:

| Token        | Rem  | Px  |
|--------------|------|-----|
| `--space-1`  | 0.25 | 4   |
| `--space-2`  | 0.50 | 8   |
| `--space-3`  | 0.75 | 12  |
| `--space-4`  | 1.00 | 16  |
| `--space-5`  | 1.50 | 24  |
| `--space-6`  | 2.00 | 32  |
| `--space-7`  | 3.00 | 48  |
| `--space-8`  | 4.50 | 72  |
| `--space-9`  | 6.50 | 104 |
| `--space-10` | 9.00 | 144 |

The index numbers 1–10 do not correspond to a pixel/4 ratio, unlike the old scaffold. A token enforcer mapping `18px → --space-4` would be wrong; the enforcer maps to the nearest token value by rem, not by index. Values between grid points are reported as "no direct token — use closest or define new." The correct response is almost always to use the closest. A new token gets added only when a rhythmic reason demands it, and the reason belongs in the commit message.

The validator requires exactly 10 `--space-N` definitions. Removing a rung breaks the gate before it breaks the site. See Decision 9 in `docs/dev/plans/04-design-system-lock-in.md`.

## Rule weights

Three named weights for the rule work the editorial layout relies on:

| Token            | Value  | Use                                                   |
|------------------|--------|-------------------------------------------------------|
| `--rule-hairline`| 0.5px  | Fine hairlines, folio rules                           |
| `--rule-thin`    | 1px    | Standard colophon dividers, masthead rule             |
| `--rule-double`  | 3px    | Outer border, paired with inset outline for double-rule |

The double-rule pattern — `border: var(--rule-thin)` plus `outline: var(--rule-hairline) solid` with explicit `outline-offset` — is a CSS trick for the printed-border convention that frames the cover. See [`troubleshooting.md`](troubleshooting.md) for the high-DPR failure mode this pairing avoids.

## Page margins

The cover-frame padding scales with viewport via four named breakpoint values:

| Token               | Value    | Applies at      |
|---------------------|----------|-----------------|
| `--page-margin-xs`  | 0.625rem | iPhone-class    |
| `--page-margin-sm`  | 1.25rem  | ≥420px          |
| `--page-margin-md`  | 2.25rem  | ≥768px          |
| `--page-margin-lg`  | 4.00rem  | ≥1200px         |

These are not applied automatically; component CSS assigns them via `padding-inline: var(--page-margin-md)` inside the appropriate media query. The family exists so that all pages share the same cover-frame proportions. A future interior page that invents its own margin values is breaking this contract.

## Layout widths

| Token               | Value   | Use                                           |
|---------------------|---------|-----------------------------------------------|
| `--width-prose`     | 62ch    | Measure for body paragraphs                   |
| `--width-content`   | 830px   | Main content column for typical pages         |
| `--width-cover`     | 1280px  | Outer bound of the cover frame                |
| `--width-container` | 1200px  | Outer wrapper for wide layouts                |
| `--width-sidebar`   | 250px   | Future navigation column                      |

`--width-prose` is in `ch`, not `px`, because readable measure is a function of the font, not of the screen. Every other width is in `px` because the outer layout is about the viewport, not the glyph.

## Validator margins

The catalog carries exactly 7 `light-dark()` calls and exactly 10 `--space-N` definitions — the minimums required by `tools/scripts/validate-tokens.sh`. Removing a semantic color or a spacing rung breaks the gate before it breaks the site. The catalog is sized to the vocabulary, not padded for slack; see Decision 9 in `docs/dev/plans/04-design-system-lock-in.md` for why padding would be the real drift.

Run the validator with:

```
./tools/scripts/validate-tokens.sh site/static/tokens.css
```

Expected output: `RESULT: PASS` with 0 FAIL.

## A worked example: adding an interior-accent color

The scenario: a future page needs a subtle tint for a pull-quote background that is lighter than `--color-surface` but still clearly an inset.

The wrong approach: `background: #f0ece0;` on the pull-quote rule. The auditor flags it. The enforcer suggests the nearest `--color-surface` match and notes it is not an exact fit.

The right approach: add the token to `site/static/tokens.css`:

```css
--color-surface-subtle: #f0ece0;
--color-surface-subtle: oklch(0.938 0.016 85);
--color-surface-subtle: light-dark(
  oklch(0.938 0.016 85),
  oklch(0.210 0.008 70)
);
```

Three lines because every semantic color gets three lines — the auditor would flag this new token otherwise. The dark-mode OKLch value is derived, not hand-guessed: take `--color-surface`'s dark value and adjust lightness by a small, consistent delta. This is the rule the rest of the dark palette follows; a new token that ignores the rule will look wrong next to its siblings.

Then, in component CSS: `background: var(--color-surface-subtle);`. The addition is a three-line commit in `tokens.css` plus a one-line consumer. No raw values anywhere.

Note: adding this token increments the `light-dark()` count above the validator minimum. That is correct behavior — the validator floor is a minimum, not a cap.

## What is deliberately out of scope

- **No state tokens (success, warning, error).** The editorial palette is two inks; state colors would add a third and fourth ink, shifting the register toward commercial. A state color lands here when a future surface legitimately needs one, with a plan record of the register shift.
- **No shadow tokens.** The design voice doesn't use shadow-based elevation. If it starts to, the tokens land next to colors and follow the same three-line pattern.
- **No animation-timing tokens.** No current motion requirements. If motion arrives, `--duration-*` and `--easing-*` tokens land first, consumers second.
- **No breakpoint tokens.** Today's single-page site resolves fluidly via `clamp()` and the `--page-margin-*` family. A breakpoint token set becomes useful once a second page with a real navigation column exists.

Adding any of these follows the same rule: the token exists first, the consumer second.

## Cross-references

- [`authoring.md`](authoring.md) — the authoring flow that consumes this contract.
- [`design-system.md`](design-system.md) — the theory behind the editorial palette: what it claims and what invariants keep it recoverable.
- [`typography.md`](typography.md) — the font-delivery path (Path C committed) and the Typekit operational setup.
- [`visual-qa.md`](visual-qa.md) — the Playwright CLI loop that verifies rendered output.
- `docs/dev/plans/04-design-system-lock-in.md` — the decision record for the editorial-catalog rewrite.
