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

The spatial grid is quarter-rem indexed: `--space-1` = 0.25rem, `--space-2` = 0.5rem, up to `--space-24` = 6rem. Most common pixel values map directly:

| Pixel | Token        |
|-------|--------------|
| 4px   | `--space-1`  |
| 8px   | `--space-2`  |
| 12px  | `--space-3`  |
| 16px  | `--space-4`  |
| 20px  | `--space-5`  |
| 24px  | `--space-6`  |
| 32px  | `--space-8`  |
| 40px  | `--space-10` |
| 48px  | `--space-12` |
| 64px  | `--space-16` |
| 80px  | `--space-20` |
| 96px  | `--space-24` |

`rag-web-token-enforcer` runs this table against any `margin`, `padding`, `gap`, `top`, `right`, `bottom`, `left`, or `inset` literal. If a value lands between tokens — say `margin: 18px` — the enforcer reports it as "no direct token; use closest or define new." The correct move is almost always to step to the nearest token. A new spacing value should be added to `tokens.css` only when a rhythmic reason demands it, and the reason belongs in the commit message that adds the token.

Why a fixed scale at all? Because a composition with six distinct spacing values reads as intentional; a composition with seventeen distinct spacing values reads as noisy, and the eye cannot tell you which it is looking at. The token scale forces a decision at token-definition time rather than at every CSS rule.

## Colors: only via `var(--color-*)`

`rag-web-css-auditor` scans for every hex, `rgb()`, `hsl()`, `oklch()`, `color()`, and named color that appears in component CSS. Outside the `:root {}` block, none of them should appear. The one-line rule: if you are writing a color in a component, you are writing the wrong thing. Write the token reference, and if the token you need is not in `tokens.css`, add it first.

This cuts two ways. First, it keeps the palette finite. Second, it keeps the dark-mode transform honest — every color is defined once with its `light-dark()` pair, so switching the browser preference is the whole of the dark-mode implementation. There is no `body.dark` class to remember, no media query to duplicate, no JavaScript to toggle.

## Typography: only via `var(--font-*)`

The font stacks live in four tokens: `--font-structure` (headings, UI chrome), `--font-prose` (body copy), `--font-mono` (code), `--font-sans` (neutral UI fallback). Component CSS writes `font-family: var(--font-structure)` and never the literal font name.

Today, the stacks resolve to system fonts — `ui-sans-serif`, `Georgia`, `ui-monospace` — under Path A of [`typography.md`](typography.md). Under Path B (self-hosted woff2) or Path C (Adobe Typekit), the stacks gain a leading face while every `var(--font-*)` consumer stays unchanged. This is the point of the token: the switch from system fallback to custom typography is one file's worth of edits, not a site-wide sweep.

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
- **Literal font names in component CSS.** Shows up when someone copies an example from an external tutorial. The auditor catches it. Fix: replace with `var(--font-structure)` or similar.
- **Spacing drift below the token grid.** `padding: 14px` creeps in because it "looks right." It does look right — and five other rules will each look right at their own off-grid value, and the composition will slowly lose rhythm. Fix: snap to the nearest token.
- **Dark-mode logic in JavaScript.** The `light-dark()` function and `color-scheme: light dark` on `:root` make the dark mode declarative. A JS toggle on `<html>` is both unnecessary and a regression against the agent review model, because the screenshot tool captures preference via `colorScheme: dark` on the Playwright context — there is nothing to click. Fix: trust the cascade.
- **Inline styles on elements.** They bypass the token contract entirely and the auditor cannot see them because they live in HTML. If an inline style is necessary, it should be a hard-won exception with a comment explaining why no token suffices.

## Cross-references

- [`tokens.md`](tokens.md) — the full token catalog, category by category, with a worked three-line example.
- [`typography.md`](typography.md) — font delivery paths (system, self-hosted woff2, Adobe Typekit).
- [`visual-qa.md`](visual-qa.md) — the Playwright CLI loop and the capture scripts.
- [`contributing.md`](contributing.md) — the session-management contract and the plan-doc convention.
