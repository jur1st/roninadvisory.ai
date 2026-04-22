# Mockup B — Typographic Architecture

**Thesis.** The page is a specimen sheet, not a marketing surface — the firm's competence is *demonstrated* by the discipline of the typography itself, because the work the firm takes on (forensic examination, AI risk) is the kind of work where methodological restraint is the proof of craft.

A reader who arrives here is not being persuaded with imagery or KPI tiles; they are being shown a document whose every element is justified by the grid it sits on. The wordmark is monolithic because the firm is a single operator and the mark is the operator's stamp. The services are numbered strata — 01 through 04 — because this is how a technical monograph introduces its sections, and because a forensics report reads the same way. The single accent spike (oxidized red, on the Gunnerbench rule) does the work a pull-quote does in a journal: it marks the one place where the firm speaks publicly in its own voice, rather than in the voice of an engagement. Every other element is ink on paper. A visitor should close the page with the impression that if this is the level of care spent on the homepage, the level of care spent on their matter will be commensurate.

**What this direction deliberately rejects.** It rejects the SaaS hero section, the cards-in-a-grid pattern, the gradient-as-design flourish, the stock photograph of a hooded figure at a laptop, and — importantly — it rejects importing the Gunnerbench zine aesthetic into the parent brand. Gunnerbench is brutalist-zine; Ronin Advisory is the typesetter's shop that produces the zine. Surfacing Gunnerbench as a rule-bracketed strip (rather than as a card with a thumbnail) is the architectural move that keeps the parent brand professional while still crediting the periodical. The direction also rejects any decorative SVG or illustration. The one glyph that appears — the en-rule between service number and service name — is doing typographic work (binding the two) and is not ornament.

**What a future editor needs to know to extend this without breaking its premise.** The load-bearing decisions are three, in order: (1) **one display face, committed** — Helvetica Neue LT Com Black Condensed in this draft, but the token is `--font-display` and the operator may substitute a different disciplined condensed grotesque (DIN Condensed Bold, Inter Tight Black, a proper specimen like Druk Condensed) without breaking the system, provided the replacement has a true 900-weight condensed cut; (2) **the accent is used exactly once, as a spike** — the 3px top rule on the Gunnerbench strip is the entire accent budget for the page, and adding a second accent (a button, a link color, a hover state elsewhere) collapses the design back into ordinary-web and should be refused; (3) **letter-spacing is the grid** — the small-caps labels at `--tracking-widest` (0.16em) and the mega-type at `--tracking-tightest` (-0.035em) are what make the composition read as a system without a visible grid being drawn, so any new element must adopt one of the existing tracking values rather than inventing a new one. If a future section needs a component that doesn't fit (a form, a dated post list, a case-study card), the correct move is to add it as another typeset stratum with its own `§` label, numbered header, and rule bracket — not to import a new component pattern from elsewhere.

---

## Files

- `index.html` — standalone page, no JavaScript
- `styles.css` — layout and composition
- `tokens.css` — shadow copy of `site/static/tokens.css` with direction-B extensions

## Responsive breakpoints

- **390px** — wordmark at ~72px cap height; masthead wraps; services collapse to 2-column
- **768px** — statement and services adopt 3-column grid; Gunnerbench strip becomes 3-column
- **1440px** — tabloid margins; wordmark reaches architectural scale (~220px cap height)

## Font dependency

The page calls `local('BerkeleyMono-Regular')` and expects Helvetica Neue LT Com Black Condensed via `@font-face` resolution. Both are confirmed installed on the operator's machine by `tools/scripts/font-check.sh`. For a viewer without these fonts installed, the token fallback chain degrades to `Inter Tight` / `Barlow Condensed` / `Arial Narrow` for display and `JetBrains Mono` / `ui-monospace` for body — the composition survives, with tonal drift.

If the site ships, the operator should decide between Path B (self-hosted woff2 — requires licensed web rights for Helvetica Neue, or substitution with an OFL condensed grotesque) and Path C (Adobe Typekit — `neue-helvetica` is in the library and includes the needed weights). See `docs/dev/typography.md`.
</content>
</invoke>