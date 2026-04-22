# Typography Delivery for rag-web

> **Path C chosen (2026-04-21).** Adobe Typekit CDN delivering FreightText Pro, FreightDisp Pro, Acumin Pro. The Typekit Web Project has not yet been stood up; the operational steps below describe what the operator must do. Until the `<link>` is added to `site/index.html`, the site reads in the correct register via the graded fallback stacks.

Three paths for font delivery on this project are documented below. Path C is the committed path. Paths A and B are retained as alternatives — not chosen, retained for reversibility. If the Typekit relationship becomes unavailable, Path B (open-source faces) is the nearest viable substitute.

---

## Path C — Adobe Typekit CDN (chosen)

Unlocks the Adobe CC font library for web delivery. FreightText Pro, FreightDisp Pro, and Acumin Pro are licensed through this path and cannot be self-hosted or converted to woff2.

**Why this path.** The editorial-masthead direction (mockup A) is built around Freight as the sole serif family at two optical sizes — FreightDisp for the cover voice, FreightText for body — with Acumin Pro carrying every piece of structural matter. These faces are Adobe-exclusive for web delivery. The design claim requires them; the token fallback stacks are graded substitutes for the interval before the kit loads, not permanent replacements.

### Operational setup

The Typekit Web Project has not been created as of the lock-in (plan 04). The operator must complete these steps before the production site loads the correct faces:

1. Sign in to [fonts.adobe.com](https://fonts.adobe.com) with the Creative Cloud account.
2. Create a new **Web Project**. Select the three faces:
   - Freight Text Pro (weights: Regular, Italic, SemiBold, SemiBold Italic — or the subset the site uses; start with Regular + Italic)
   - Freight Display Pro (Regular, Italic)
   - Acumin Pro (Regular, SemiBold — the grotesque structural weights)
3. Add the following domains to the kit's **domain allowlist**:
   - `roninadvisory.ai`
   - The GitHub Pages preview host (typically `<username>.github.io`)
4. Note the **7-character kit ID** Adobe issues (e.g. `abc1def`).
5. In `site/index.html`, add the Typekit `<link>` element **above** the `static/styles.css` link in `<head>`:

```html
<link rel="stylesheet" href="https://use.typekit.net/XXXXXXX.css">
<link rel="stylesheet" href="static/styles.css">
```

Replace `XXXXXXX` with the actual kit ID.

### Fallback chain while the kit is not loaded

Until the Typekit `<link>` is added, the `var(--font-display)`, `var(--font-text)`, and `var(--font-grotesque)` chains resolve to the graded substitutes declared in `site/static/tokens.css`:

- `--font-display`: Kepler Std Display → Canela → Minion Pro Display → Georgia → serif
- `--font-text`: Kepler Std → Minion Pro → Georgia → serif
- `--font-grotesque`: Neue Haas Grotesk → Söhne → Inter → Helvetica Neue → sans-serif

The fallback stacks are graded by design affinity — each substitute is chosen for its optical kinship with the primary face, not just as a generic category fallback. A visitor without the kit loaded sees a legible editorial page in a plausible serif voice. The Typekit upgrade is an enhancement, not a blocker. Day-zero readable; full typographic voice after the kit is stood up.

### CSS name mapping

Adobe web-project names are lowercase-hyphenated slugs. The token file uses them as leading entries in the stacks:

| Display name        | CSS font-family slug    |
|---------------------|-------------------------|
| Freight Text Pro    | `'freight-text-pro'`    |
| Freight Display Pro | `'freight-display-pro'` |
| Acumin Pro          | `'acumin-pro'`          |

**`font-display` behavior** is controlled by the Typekit Web Project settings, not by your CSS. Adobe does not expose `font-display: swap` as a stylesheet-level override. Choose the swap behavior in the kit configuration at fonts.adobe.com.

---

## Path A — System fallback only (not chosen — retained for reversibility)

Zero license, zero latency, zero cache behavior to reason about. Nothing to install, nothing for a visitor to download.

**Stack (Path A pattern):**

```css
--font-structure: ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', sans-serif;
--font-prose:     Georgia, 'Times New Roman', serif;
--font-mono:      ui-monospace, Menlo, Monaco, 'Courier New', monospace;
--font-sans:      ui-sans-serif, system-ui, -apple-system, sans-serif;
```

**Trade-off.** The typography voice is whatever the visitor's OS provides. Reasonable for launch or for a surface where typographic identity is not load-bearing. Not chosen here because the editorial-masthead direction is specifically built around Freight; system fonts do not carry the same cover voice.

**When to return to Path A.** If the Typekit relationship fails and Path B faces are unavailable, Path A is the fallback of last resort. The site remains readable; it loses the editorial typographic register.

---

## Path B — Self-hosted woff2 (not chosen — retained for reversibility)

Open-source fonts you host on your own origin (GitHub Pages serves them fine). Gives you consistent typography across all visitors at the cost of ~50–200 KB of font payload.

**License gate.** Fonts must be under OFL or an equivalent permissive license that allows self-hosting. Adobe fonts are **not** self-hostable — see Path C. Viable open-source substitutes for the Freight/Acumin combination: Spectral (text serif), Cormorant Garamond (display serif), Inter or IBM Plex Sans (grotesque).

**Pattern:**

```css
@font-face {
  font-family: "Spectral";
  src: url("/static/fonts/Spectral-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

**Preload the critical above-the-fold weight:**

```html
<link rel="preload" href="/static/fonts/Spectral-Regular.woff2"
      as="font" type="font/woff2" crossorigin>
```

The `crossorigin` attribute is required even for same-origin fonts; omit it and the preload hint is silently discarded.

**When to switch to Path B.** If the Typekit relationship becomes unavailable and Path A's system fallback is deemed insufficient for the editorial register, Path B is the correct pivot. Subsetting with `pyftsubset` (`uv tool install fonttools[woff]`) can trim a 200 KB Latin file to ~40 KB.

---

## Decision framework

For future surface decisions on this or related projects:

```
Is this a short-lived or low-stakes surface?
  [y] Path A. Ship it.

Do you need more than one typographic voice, and are open-source faces sufficient?
  [y] Path B. Pick from Spectral / Cormorant / IBM Plex / JetBrains Mono / Source family.
  [n] -> go on

Do you need Adobe fonts specifically?
  [y] Path C. Create a Typekit Web Project at fonts.adobe.com.
  [n] Path A or B.
```

The current project has committed to Path C. A revision of that decision requires a plan document — the typographic register is a theory-level choice, not a configuration preference.

---

## References

- `site/static/tokens.css` — the active font-stack declarations; the canonical source of truth.
- [`tokens.md`](tokens.md) — the token catalog, including the `--font-*` entries.
- [`design-system.md`](design-system.md) — why three voices is the ceiling; why FreightDisp + FreightText count as one serif family at two optical sizes.
- `~/.claude/skills/web-frontend/reference/typography-delivery.md` — full source of this guidance plus additional contexts.
- `~/.claude/skills/macos-typography/workflows/adobe-fonts.md` — Adobe CC sync mechanics and CSS name mismatches.
- `~/.claude/skills/macos-typography/workflows/web-fonts.md` — `@font-face` patterns and performance notes.
