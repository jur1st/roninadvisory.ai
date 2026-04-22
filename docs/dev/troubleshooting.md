# Troubleshooting

This catalogue records named failure modes encountered while iterating the editorial-masthead design (mockup A, session TUE_22). Each entry is a pattern, not an incident report. The pattern name is the thing to recognize; the fix is concrete; the reasoning is the artifact — the part that lets a future session understand why the fix is correct, not just what it is.

For background on the design these failures were encountered in, see [`design-system.md`](design-system.md). The token contract the fixes operate within is at [`tokens.md`](tokens.md).

---

## 1. Nested-grid overflow at desktop widths

**Symptom.** Colophon list items extend past their enclosing column in the 900–1440px range. Service names and kickers overflow visibly, or force horizontal scroll on the containing block.

**Cause.** The colophon was initially laid out as a two-column inner grid — label on the left, list on the right — while the outer layout held the colophon block in a column narrower than the inner grid needed. The longest service name plus a `white-space: nowrap` kicker requires roughly 275px of minimum content width. The outer column, under its own constraints, offered 135–244px at various breakpoints. The inner grid's cells were starved below their `min-content`; the content overflowed rather than wrapping.

**Fix.** Drop the two-column inner grid. Let the label stack above the list, separated by a hairline rule:

```css
.colophon__entry {
  display: block;        /* stacked, not grid */
  padding-block: var(--space-4);
  border-block-start: var(--rule-hairline) solid var(--color-rule);
}
.colophon__label {
  display: block;
  margin-block-end: var(--space-2);
}
```

**Why this fix is correct.** `overflow: hidden` would paper over the miscalculation — the label would be clipped, not resolved. The real problem is that "label | list" was a layout the outer column could never afford. A stacked colophon also reads more correctly as an actual editorial colophon: the label is a kicker for the block beneath it, not a counterweight column competing for space. The layout that caused the bug was also not the right layout for the form.

---

## 2. Small-caps synthesis at narrow widths

**Symptom.** The lede's first-line small-caps on iPhone widths reads as mixed-case caps shouting on a two-word line. The effect reads as a mistake, not a typographic convention.

**Cause.** `font-variant-caps: small-caps` applied without a viewport guard. When the font lacks a proper small-caps face — which Freight does not deliver on all platforms before the Typekit kit loads — browsers faux-synthesize caps by scaling uppercase glyphs down. On a narrow first line (two to four words), the result is a short block of capital letters that registers as ALL-CAPS emphasis, not as an editorial opening convention.

**Fix.** Gate the rule with a media query:

```css
@media (min-width: 768px) {
  .masthead__lede::first-line {
    font-variant-caps: small-caps;
    letter-spacing: var(--tracking-caps);
  }
}
```

**Why this fix is correct.** The small-caps convention is editorial — it works when the first line has enough words to declare itself as a typographic statement rather than a label. At tablet-and-up, the line is long enough; on narrow viewports it is not. Removing the convention at narrow widths is not a regression; it is the correct editorial judgment for those widths. Faux-synthesized caps that shout are worse than no caps.

See [`authoring.md`](authoring.md) § Common drift patterns for the general rule about small-caps and media-query gating.

---

## 3. Dark-mode serif weight inconsistency

**Symptom.** Serif stems look anemic in dark mode on macOS. The masthead display type appears thinner in dark mode than in light mode, and the body text feels lighter than intended. The effect is most visible in system screenshot comparisons.

**Cause.** When pixels invert (dark background, light text), macOS's default subpixel antialiasing (`-webkit-font-smoothing: auto`) renders stems thinner because the hinting model is calibrated for dark-on-light. The font's designed weight reads correctly in light mode and incorrectly in dark mode at the same CSS `font-weight` value.

**Fix.** Apply grayscale antialiasing in dark mode for both the OS preference and the explicit data-theme pin:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

:root[data-theme="dark"] body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Why this fix is correct.** Grayscale AA keeps stem weight consistent across light and dark modes because it renders each glyph without the subpixel color fringing that thins stems in inverted contexts. The editorial register depends on the serif carrying its weight at display scale; inconsistent weight between modes breaks the register, even if the visitor only reads in one mode. The fix is scoped to dark mode — applying grayscale AA in light mode would soften stems unnecessarily on standard displays.

---

## 4. Theme-toggle aria-pressed lying on first paint

**Symptom.** The day/night toggle's pressed state is incorrect for a brief interval on load in the mode that differs from the HTML-shipped default. A visitor who prefers dark mode may see the toggle in the light-mode state for a flash before JavaScript corrects it.

**Cause.** `aria-pressed="false"` is serialized into the HTML at build time. If the page loads in dark mode (OS preference or prior localStorage pin), the attribute value does not match the visual state during the JS-attachment window. The HTML lies about the toggle state, and assistive technology reading the attribute before JS fires gets the wrong answer.

**Fix.** Decouple the toggle's visual state from `aria-pressed`. Drive the visual state off the same `[data-theme]` / `prefers-color-scheme` signal the palette reads. Use `aria-pressed` only for the post-click truth:

```css
/* Drive the toggle's visual appearance from the data-theme or OS preference */
.theme-toggle[data-active] { /* ... active visual */ }

:root[data-theme="dark"] .theme-toggle { /* dark visual */ }
```

```js
// Set aria-pressed only after the user has interacted — never pre-paint
button.addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  button.setAttribute('aria-pressed', String(isDark));
});
```

The inline `<script>` in `<head>` that pins `data-theme` before paint remains; the key is that it does not touch `aria-pressed`.

**Why this fix is correct.** A visual element driven by the cascade cannot lie before JS, because the cascade applies at parse time. An element driven by a JS-assigned attribute can lie during the parse-to-script-execution window. The fix is to make the visual state declarative (cascade-driven) and the semantic attribute imperative (set only after a user action has made its value knowable). The result is a toggle that never lies to assistive technology on first paint.

---

## 5. Double-rule at high DPR

**Symptom.** The printed-border double-rule around the cover frame renders as a thick single line on retina displays (2x and 3x DPR). What should read as two distinct rules at different weights collapses into a single thick line.

**Cause.** Half-pixel rounding. The technique for producing a CSS double-rule pairs `border: 2px solid` on the outer edge with an `inset outline` trick to simulate the inner rule. At 2x DPR, CSS pixel values are multiplied by 2 before mapping to physical pixels. `border: 2px` becomes 4 physical pixels and `outline: 1px inset` becomes 2 physical pixels placed adjacent to the border — and the rounding causes them to share the same physical pixel positions, merging into a single thick stroke rather than two distinct rules.

**Fix.** Use the named rule-weight tokens at different weights, with explicit `outline-offset` to guarantee physical-pixel separation:

```css
.cover__frame {
  border: var(--rule-thin) solid var(--color-rule);        /* 1px */
  outline: var(--rule-hairline) solid var(--color-rule);   /* 0.5px */
  outline-offset: 4px;   /* forces the outline outside the border's physical pixels */
}
```

**Why this fix is correct.** Two independent rule declarations at different offsets do not compete for the same subpixel position. `outline-offset: 4px` places the outer hairline far enough from the border that at any DPR — 1x, 2x, or 3x — they occupy non-overlapping physical pixel bands. `var(--rule-hairline)` at 0.5px renders as 1 physical pixel at 2x, which is the intended visual weight for the outer hairline. The `outline` trick works correctly once the offset is explicit.

---

## 6. Colophon cell starving under minmax(0, 1fr) with nowrap kickers

**Symptom.** On narrow tablets (520–768px), the kicker text in colophon entries (`Evidentiary`, `Governance`, `Engineering`) wraps awkwardly, breaking mid-word, or forces the colophon column to overflow.

**Cause.** `white-space: nowrap` on kicker elements inside a three-column grid with a flexible middle column. The kicker is set as a `nowrap` span so it reads as a single unit at desktop widths. But in a `minmax(0, 1fr)` column at narrow-tablet widths, the cell's minimum content size exceeds the available track width, and `nowrap` prevents the line from breaking to resolve the overflow.

**Fix.** A media query below 520px that reflows the kicker into the name column with `white-space: normal`:

```css
@media (max-width: 519px) {
  .colophon__kicker {
    display: block;
    margin-block-start: var(--space-1);
    white-space: normal;
  }
}
```

**Why this fix is correct.** At narrow viewports the kicker is supporting metadata — it annotates the service name, it is not a parallel piece of content competing for column width. Dropping its `nowrap` discipline at these widths is the right editorial compromise: the information remains present, the layout no longer overflows, and the visual hierarchy (name primary, kicker secondary) is preserved by the block display and the small top margin. The `nowrap` discipline is a desktop convention; imposing it on a viewport that cannot accommodate it is the wrong generalization.

---

## Cross-references

- [`design-system.md`](design-system.md) — the design theory these failure modes are encountered within.
- [`tokens.md`](tokens.md) — the token names used in the fix examples (`--rule-hairline`, `--rule-thin`, `--color-rule`, `--space-*`).
- [`authoring.md`](authoring.md) — the general authoring rules and common drift patterns, including the small-caps media-query guidance.
- `docs/dev/plans/04-design-system-lock-in.md` — the session record (TUE_22 bundle) where these failure modes were encountered and resolved.
