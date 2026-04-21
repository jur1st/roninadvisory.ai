# Typography Delivery for rag-web

Three paths for font delivery on this project. Choose one and wire it into `static/tokens.css`. The default (shipping today) is **Path A**.

The rubric for choosing: license terms, typography weight you actually need, and latency tolerance.

---

## Path A — System fallback only

Zero license, zero latency, zero cache behavior to reason about. Nothing to install, nothing for a visitor to download.

**Stack (already in `static/tokens.css`):**

```css
--font-structure: ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', sans-serif;
--font-prose:     Georgia, 'Times New Roman', serif;
--font-mono:      ui-monospace, Menlo, Monaco, 'Courier New', monospace;
--font-sans:      ui-sans-serif, system-ui, -apple-system, sans-serif;
```

**Trade-off.** The typography voice is whatever the visitor's OS provides — SF Pro on macOS, Segoe UI on Windows, Roboto on Android. Body prose lands in Georgia on every major platform (consistent across Win/Mac/Linux, different on iOS). Reasonable for launch; bland under sustained comparison to Path B / C.

**When to stay on Path A.** If the site never needs more than a single voice, or if you want the launch surface to be indisputably license-clean and deterministic.

---

## Path B — Self-hosted woff2

Open-source fonts you host on your own origin (GitHub Pages serves them fine). Gives you consistent typography across all visitors at the cost of ~50-200 KB of font payload.

**License gate.** Fonts must be under OFL or an equivalent permissive license that allows self-hosting. Inter, IBM Plex, Berkeley Mono Variable (per its license), JetBrains Mono, Source Sans/Serif/Code are all viable. Adobe fonts are **not** self-hostable — see Path C.

**Budget:** 4-5 woff2 files maximum. Comfortable set: Regular + Bold + Italic + one monospace face.

**Pattern (`static/fonts.css` if you split it, or appended to `tokens.css`):**

```css
@font-face {
  font-family: "Inter";
  src: url("/static/fonts/Inter-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Inter";
  src: url("/static/fonts/Inter-Bold.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

**Preload the critical above-the-fold weight:**

```html
<link rel="preload" href="/static/fonts/Inter-Regular.woff2"
      as="font" type="font/woff2" crossorigin>
```

The `crossorigin` attribute is required even for same-origin fonts; omit it and the preload hint is silently discarded.

**Update `static/tokens.css`** to lead with the self-hosted face:

```css
--font-structure: "Inter", ui-sans-serif, system-ui, sans-serif;
```

**Subsetting with pyftsubset** (`uv tool install fonttools[woff]`) can trim a 200 KB Latin file to ~40 KB by dropping scripts the site doesn't use.

---

## Path C — Adobe Typekit CDN

Unlocks the Adobe CC font library (Futura Std, LT Neue Helvetica, Minion Pro, Kepler Std, Acumin Pro, Freight, Adobe Caslon Pro, etc.) for web delivery. The license binds these faces to the Typekit CDN exclusively — you cannot self-host, cannot convert to woff2, cannot mirror.

**Prerequisite.** The operator's Adobe Creative Cloud subscription grants web-project rights. At fonts.adobe.com, create a Web Project, select the faces, and note the 7-character kit ID it issues (e.g. `abc1def`). Kit IDs are long-lived and tied to specific domain allowlists.

**Embed in `index.html` `<head>`:**

```html
<link rel="stylesheet" href="https://use.typekit.net/XXXXXXX.css">
```

**CSS name mapping.** Adobe web-project names are lowercase-hyphenated slugs, not display names:

| Display name        | CSS font-family       |
|---------------------|-----------------------|
| Futura Std          | `"futura-std"`        |
| LT Neue Helvetica   | `"neue-helvetica"`    |
| Minion Pro          | `"minion-pro"`        |
| Kepler Std          | `"kepler-std"`        |
| Acumin Pro          | `"acumin-pro"`        |
| Adobe Caslon Pro    | `"adobe-caslon-pro"`  |
| Freight Text        | `"freight-text-pro"`  |

**Update `static/tokens.css`:**

```css
--font-structure: "neue-helvetica", ui-sans-serif, system-ui, sans-serif;
--font-prose:     "minion-pro", Georgia, serif;
```

Always retain a system fallback after the Adobe face for the interval between DNS resolution and Typekit CSS arrival. `font-display` behavior is controlled by Adobe's kit config — choose it in the Typekit Web Project settings, not in your CSS.

**Trade-offs.** External origin means one extra DNS + TLS handshake before font CSS is usable. The payoff is access to a typography library that would otherwise cost thousands of dollars in per-font web licenses.

---

## Decision framework

```
Is this a short-lived or low-stakes surface?
  [y] Path A. Ship it.

Do you need more than one typographic voice, and are open-source faces sufficient?
  [y] Path B. Pick from Inter / IBM Plex / JetBrains Mono / Source family.
  [n] -> go on

Do you need Adobe fonts specifically?
  [y] Path C. Create a Typekit Web Project at fonts.adobe.com.
  [n] Path A or B.
```

---

## References

- `~/.claude/skills/web-frontend/reference/typography-delivery.md` — full source of this guidance plus Marked/Platypus contexts
- `~/.claude/skills/macos-typography/workflows/adobe-fonts.md` — Adobe CC sync mechanics and name mismatches
- `~/.claude/skills/macos-typography/workflows/web-fonts.md` — @font-face patterns and performance notes
