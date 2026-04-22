# Authoring HTML and CSS

Every visual property on this site flows from `site/static/tokens.css`. Two quality-gate agents — `rag-web-css-auditor` and `rag-web-token-enforcer` — exist to make sure that is actually true, not merely intended. A third agent, `rag-web-visual-reviewer`, closes the loop by scoring the rendered result against a sophistication rubric. Authoring on this project means writing HTML and CSS with those three agents in mind, because those three agents are the review.

The invariant is small and load-bearing: **if a value appears hard-coded in component CSS, the design has already drifted.** A hex that lands on one page is one hex. A hex that lands on three pages, each slightly different, is the end of a coherent palette. The token file exists so there is nowhere else for color, typography, or spacing decisions to live.

This document describes how to author against that contract. [`tokens.md`](tokens.md) documents the contract itself. [`typography.md`](typography.md) holds the font-delivery paths (A, B, C) with the decision currently deferred.

## The page shape

`site/index.html` is the working page. It follows the pattern every future page should follow:

1. A single `<link rel="stylesheet" href="static/tokens.css">` at the top of `<head>`.
2. A single inline `<style>` block with the base-element rules (`html`, `body`, `h1`–`h4`, `p`, `a`, `code`, `pre`, `blockquote`, `table`, `hr`, `mark`, `kbd`, and a print block).
3. Page content under `<body>`.

Splitting the base styles out into a separate CSS file is an operator call once a second page exists. Today, inline is correct — the base layer is one page's worth of styles, and a separate file is a second request for zero gain. When there is a second page, the move is to promote the inline block to `site/static/base.css` and link both pages at it.

The token file loads *before* the base block by design. Base styles consume tokens; tokens must be defined first. Reversing the order breaks nothing in a fresh render (the cascade still resolves) but introduces a subtle dependency that the next contributor will not notice until they try to use a token in a CSS file loaded ahead of `tokens.css`.

## The three-line fallback pattern

This is the pattern `rag-web-css-auditor` enforces on every semantic color use:

```css
color: #1a1b22;                          /* static fallback  */
color: oklch(0.169 0.034 265);           /* OKLch token      */
color: light-dark(                       /* semantic variant */
  oklch(0.169 0.034 265),
  oklch(0.913 0.006 265)
);
```

The browser picks the last line it understands. Three tiers of browser, one declaration, no JavaScript, no `@supports` gymnastics, no flash of unstyled content.

In practice, component CSS doesn't write the three lines directly — it references the token, and the three lines live in `tokens.css`:

```css
.panel {
  color: var(--color-text);
  background: var(--color-bg);
}
```

The point of the auditor is that the three-line definition lives *somewhere* for every semantic color. If a new token gets added with only one line, the audit catches it. If a component writes a raw `oklch()` call outside the token block, the audit catches that too. A worked example lives in [`tokens.md`](tokens.md#colors-and-the-three-line-fallback).

**When the three-line pattern does not apply.** Token definitions inside `:root {}` or `@layer base {}` are excluded from the audit — those are the definitions, not consumers. `transparent`, `currentColor`, `inherit` are always allowed. `0`, `auto`, `100%`, and viewport units are allowed for spacing. Everything else should be a token.

## Spacing: pixels map to tokens

The editorial spacing progression is not a uniform quarter-rem grid through its entire range. The first four steps are quarter-rem; beyond that, the steps are editorial — larger jumps for the wide horizontal spacers a cover layout needs. The canonical map:

| Pixel | Token        |
|-------|--------------|
| 4px   | `--space-1`  |
| 8px   | `--space-2`  |
| 12px  | `--space-3`  |
| 16px  | `--space-4`  |
| 24px  | `--space-5`  |
| 32px  | `--space-6`  |
| 48px  | `--space-7`  |
| 72px  | `--space-8`  |
| 104px | `--space-9`  |
| 144px | `--space-10` |

The index numbers 1–10 do not correspond to a pixel/4 ratio. The enforcer maps to the nearest token by rem value, not by index arithmetic. If a value lands between tokens — say `margin: 20px` — the enforcer reports it as "no direct token; use closest or define new." The correct move is almost always to step to the nearest token (16px → `--space-4`; 24px → `--space-5`). A new spacing value should be added to `tokens.css` only when a rhythmic reason demands it, and the reason belongs in the commit message that adds the token.

`rag-web-token-enforcer` runs this map against any `margin`, `padding`, `gap`, `top`, `right`, `bottom`, `left`, or `inset` literal.

Why a fixed scale at all? Because a composition with six distinct spacing values reads as intentional; a composition with seventeen distinct spacing values reads as noisy, and the eye cannot tell you which it is looking at. The token scale forces a decision at token-definition time rather than at every CSS rule.

## Colors: only via `var(--color-*)`

`rag-web-css-auditor` scans for every hex, `rgb()`, `hsl()`, `oklch()`, `color()`, and named color that appears in component CSS. Outside the `:root {}` block, none of them should appear. The one-line rule: if you are writing a color in a component, you are writing the wrong thing. Write the token reference, and if the token you need is not in `tokens.css`, add it first.

This cuts two ways. First, it keeps the palette finite. Second, it keeps the dark-mode transform honest — every color is defined once with its `light-dark()` pair, so switching the browser preference is the whole of the dark-mode implementation. There is no `body.dark` class to remember, no media query to duplicate, no JavaScript to toggle.

## Typography: only via `var(--font-*)`

The font stacks live in four editorial tokens and three Tier-1 aliases. Component CSS always writes the token reference — never the literal font name.

**Editorial tokens (keyed to optical register):**

| Token              | Voice                                          | Use                                   |
|--------------------|------------------------------------------------|---------------------------------------|
| `--font-display`   | Display serif (FreightDisp Pro)                | Cover title, masthead, large headings |
| `--font-text`      | Text serif (FreightText Pro)                   | Body prose, pull quotes               |
| `--font-grotesque` | Grotesque (Acumin Pro)                         | Colophon, metadata, small-caps        |
| `--font-mono`      | Monospace (Berkeley Mono)                      | Email, domain, machine register       |

**Tier-1 aliases (canonical names for agents and validators):**

| Alias             | Routes to           |
|-------------------|---------------------|
| `--font-structure`| `--font-grotesque`  |
| `--font-prose`    | `--font-text`       |
| `--font-sans`     | `--font-grotesque`  |

The four stacks each carry graded fallbacks. Until the Typekit `<link>` is added to `site/index.html`, `--font-display` resolves to Kepler Std Display or Georgia; `--font-text` to Kepler Std or Georgia; `--font-grotesque` to Helvetica Neue or sans-serif. The design reads in the intended register on day zero; the Typekit upgrade is enhancement, not a blocker. See [`typography.md`](typography.md) for the operational setup.

Three voices is the ceiling (one serif family at two optical sizes + one grotesque + one mono). A fourth face in component CSS is a theory shift — stop and read [`design-system.md`](design-system.md) before adding one.

The point of the token is that the font-delivery decision is reversible: a switch from Path C (Typekit) to Path B (self-hosted) is one block's worth of edits in `tokens.css`. Every `var(--font-*)` consumer stays unchanged.

## The review loop: `rag-web-visual-reviewer` and the 25-point rubric

After the audit and enforcer pass on the CSS, the render still needs to be looked at. `rag-web-visual-reviewer` is the opus-model agent that does that: it captures screenshots via `./tools/scripts/capture-screenshot.sh` (light desktop, dark desktop, mobile light), reads the sophistication rubric at `~/.claude/skills/web-frontend/reference/sophistication-rubric.md`, and scores the rendered UI on nine dimensions worth 25 points total:

- Typography hierarchy (4)
- Color & contrast (3)
- Spacing & rhythm (3)
- Dark mode fidelity (3)
- Responsive behavior (3)
- Token compliance (3)
- Interaction affordances (2)
- Accessibility signals (2)
- Performance indicators (2)

A score without evidence is not accepted — each dimension must cite what the reviewer saw in the screenshot. A failure produces a remediation string. The score is a snapshot, not a grade: it answers the question "what is the worst thing on this page?" because that is the thing the next edit should fix.

The review loop closes on itself. A fix proposed by the reviewer is implemented against the token contract. The auditor and enforcer verify the CSS. The reviewer re-captures and re-scores. This is the rhythm; there is no other one.

[`visual-qa.md`](visual-qa.md) documents the Playwright CLI surface the reviewer drives, and the `rag-web-visual-test-writer` agent that generates systematic capture scripts for pages with multiple states.

## The edit rhythm, concretely

A typical change to this site is:

1. Edit `site/index.html` (or a future page) and/or `site/static/tokens.css`.
2. If CSS changed, run `rag-web-css-auditor` and `rag-web-token-enforcer` against the edited files. Fix any reported findings.
3. If the change is visible, dispatch `rag-web-visual-reviewer` for a score.
4. Address failures. Iterate.
5. Let `/rag-web-close` surface the commit at the end of the session.

The gate before step 5 is the auditor and enforcer, not a linter. There is no HTML linter or CSS linter wired up today — the CLAUDE.md bans on build tooling are load-bearing, and the agent reviews are doing the job a linter would do in a framework project. If a linter is ever introduced, it should be for catching the shape of errors the agents cannot catch cheaply (bad URLs, missing alt text, malformed `<meta>` tags), not for replicating the token-contract enforcement.

## Common drift patterns and why they fail

- **"Just this one color."** The moment a component writes `color: #333`, the palette has two versions of near-black and the first reviewer to notice will ask why. Fix: add a token, or use the closest existing one.
- **Literal font names in component CSS.** Shows up when someone copies an example from an external tutorial. The auditor catches it. Fix: replace with `var(--font-grotesque)`, `var(--font-text)`, or the appropriate editorial token.
- **Spacing drift below the token grid.** `padding: 14px` creeps in because it "looks right." It does look right — and five other rules will each look right at their own off-grid value, and the composition will slowly lose rhythm. Fix: snap to the nearest token (`--space-3` at 12px or `--space-4` at 16px).
- **Dark-mode logic in JavaScript.** The `light-dark()` function and `color-scheme: light dark` on `:root` make the dark mode declarative. A JS toggle on `<html>` is both unnecessary and a regression against the agent review model, because the screenshot tool captures preference via `colorScheme: dark` on the Playwright context — there is nothing to click. Fix: trust the cascade.
- **Inline styles on elements.** They bypass the token contract entirely and the auditor cannot see them because they live in HTML. If an inline style is necessary, it should be a hard-won exception with a comment explaining why no token suffices.
- **Small-caps at narrow widths.** `font-variant-caps: small-caps` applied globally synthesizes caps at all viewport widths. On short iPhone lines (two or three words), browsers faux-synthesize caps when the font lacks a proper small-caps face, and the result reads as SHOUTING rather than typographic convention. Fix: gate the rule with `@media (min-width: 768px)`. The editorial convention holds at tablet-and-up where the first line has enough words to declare itself; at narrower widths drop it entirely rather than risk the shouting register.
- **Cross-accent-color drift.** Oxblood (`--color-mark`, aliased as `--color-accent`) is the only non-ink color on the site. Adding a second accent color — for a CTA, a status badge, a new section's heading — shifts the register from editorial to commercial. A second accent is a theory shift. If the design genuinely needs one, it earns a token and a plan record of the register shift; it does not land as a one-off hex in a component rule.

## Cross-references

- [`tokens.md`](tokens.md) — the full token catalog, category by category, with a worked three-line example.
- [`design-system.md`](design-system.md) — the theory behind the editorial direction: what the palette claims and what invariants keep it recoverable.
- [`typography.md`](typography.md) — Path C committed (Adobe Typekit); operational setup for the Typekit Web Project.
- [`visual-qa.md`](visual-qa.md) — the Playwright CLI loop and the capture scripts.
- [`contributing.md`](contributing.md) — the session-management contract and the plan-doc convention.
- [`troubleshooting.md`](troubleshooting.md) — named failure modes from the editorial-masthead iteration history.
