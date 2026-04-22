# Design System Lock-In — Editorial Masthead as Foundation

**Scope:** promote mockup A (editorial masthead) from `docs/dev/mockups/a/` to the publishable `site/`; archive the non-canonical B and C directions; expand `site/static/tokens.css` to carry the editorial token contract; propagate the new contract through the developer-facing docs (`docs/dev/`) and the agent-facing docs (`docs/agent/`) via the documentation-layer writer agents. Copy edits to the page body are explicitly deferred.

**Out of scope (deferred):**
- Subtle copy tweaks to the masthead, lede, colophon, or Gunnerbench card — operator handles later.
- Typography path-C execution (Typekit kit ID creation, DNS allowlist). `docs/dev/typography.md` records Path C as the committed path; the Typekit kit is not stood up in this plan.
- A second page. Today the site is one page; splitting `site/static/base.css` out of inline styles is premature until a second page exists.
- Any change to `.claude/commands/`, `.claude/agents/`, or `.claude/skills/` primitive behavior. This plan modifies *docs* about them and may touch agent prompts only if a token-catalog pointer has drifted — see Step 6.
- Pi-harness implementations. Standing backlog.
- Re-verification of GitHub Pages workflow versions. Plan 03 owns that cadence.

---

## Current ground truth

- Mockup A locked in at end of session TUE_23 (2026-04-21). Bundle: `.the-grid/sessions/context_bundles/TUE_22_f8e16a61-*.jsonl`. Summary: `TUE_23_f8e16a61.md`. A has been iterated through: theme-toggle addition, imprint-strip integration, colophon-overflow fix (2-col grid dropped in favor of stacked label+list), small-caps narrow-width guard, dark-mode font smoothing pivot.
- `site/index.html` is a near-empty scaffold (`<h1>Ronin Advisory Group</h1>`). `site/static/tokens.css` is the Tier-1 Darko-Labs scaffold from plan 02 — blue-leaning `--color-accent`, system-fallback fonts, generic `--color-success/warning/error` states. The scaffold is orthogonal to the editorial direction A carries; it must be rebuilt around A's token shape.
- Mockup A carries its own `tokens.css` at `docs/dev/mockups/a/tokens.css` — the reference implementation for the editorial palette (warm paper, oxblood, deep ink, no-state tokens) and typography (`--font-display` / `--font-text` / `--font-grotesque` / `--font-mono` with Tier-1 aliases `--font-structure`→grotesque, `--font-prose`→text). Spacing scale is editorial (`--space-1`..`--space-10`, max = 9rem) rather than the scaffold's quarter-rem-to-6rem.
- `docs/dev/mockups/{a,b,c,index.html}` is entirely untracked. B is the typographic-architecture direction; C was cut mid-session (the cross-form mark didn't land). Both retain theory value as recorded alternatives per `docs/agent/conventions.md:65` ("Decisions blocks are load-bearing source material for a future contributor trying to rebuild the theory"). Archive, do not delete.
- Symlinks under `site/_mockups/` (gitignored) point into `docs/dev/mockups/`. The review landing `docs/dev/mockups/index.html` currently shows A as leading + B, with a note that C was cut.
- Quality-gate agents already point at the canonical `site/static/tokens.css`:
  - `.claude/agents/rag-web-css-auditor.md:10,15,40`
  - `.claude/agents/rag-web-token-enforcer.md:10,15,19,42,69`
  - `.claude/agents/rag-web-docs-dev-writer.md:27,54-55`
  - `.claude/agents/rag-web-docs-user-writer.md:28,54` (line 31 holds an HTML-relative `static/tokens.css`, not the canonical path; the audit in Step 8 does not need to touch it)
  These pointers remain valid after this plan. No agent-body edit is required unless a pointer drifts during the token-file rewrite — see Step 8.
- Token validation gate: `tools/scripts/validate-tokens.sh site/static/tokens.css` requires the following to exist in the token file: `color-scheme` declaration; `--font-structure`, `--font-prose`, `--font-mono`; `--space-1`; `--width-prose`; ≥ 7 `light-dark()` calls; ≥ 10 `--space-N` definitions. The expanded editorial `tokens.css` must satisfy all of these — the merge below does.
- Preview server running on `:18080` (per prime). The preview surface is the feedback loop for every visual step in this plan.

---

## Step 1 — Archive B and C under `docs/dev/mockups/_archive/`

Move the non-canonical directions into a sibling archive folder. The files are preserved, not deleted — a future contributor reading the mockup slate should find them under a clearly-marked archive path rather than in the live slate.

**Actions:**

```bash
mkdir -p docs/dev/mockups/_archive
git mv docs/dev/mockups/b docs/dev/mockups/_archive/b 2>/dev/null || mv docs/dev/mockups/b docs/dev/mockups/_archive/b
git mv docs/dev/mockups/c docs/dev/mockups/_archive/c 2>/dev/null || mv docs/dev/mockups/c docs/dev/mockups/_archive/c
rm site/_mockups/b site/_mockups/c
```

(The `git mv || mv` fallback is because `docs/dev/mockups/` is untracked at the moment — `git mv` will fail without an index entry; plain `mv` lands the archive; a subsequent `git add` at commit time captures the final tree.)

Write an archive-level README so the archived directions keep their theory context:

**Create `docs/dev/mockups/_archive/README.md`:**

```markdown
# Archived mockup directions

These directions informed the site's visual voice without becoming it. They
are retained as theory-preservation artifacts, not as live design surfaces.
The site's canonical implementation lives under `site/`; the canonical
review landing is `docs/dev/mockups/index.html`.

- `b/` — Typographic architecture. Helvetica Neue Condensed + Berkeley Mono,
  near-monochrome palette, `§ Mode` stratum toggle. Cut because the
  editorial direction (A) carried the publishing posture more directly
  and because A and B converged independently on warm paper + oxidized
  red (signal, not coincidence).
- `c/` — The Seal. Cross-form SVG mark, seal-centered composition. Cut
  mid-iteration: the cross-form mark did not read as intended and adding
  a second accent color drifted the palette toward commercial rather
  than editorial register.

See `docs/dev/plans/04-design-system-lock-in.md` for the decision record.
```

**Verification:**

```bash
test -d docs/dev/mockups/_archive/b && test -d docs/dev/mockups/_archive/c && echo "[v] archive landed"
test ! -e docs/dev/mockups/b && test ! -e docs/dev/mockups/c && echo "[v] live slate cleared"
test ! -L site/_mockups/b && test ! -L site/_mockups/c && echo "[v] symlinks removed"
```

---

## Step 2 — Rewrite `docs/dev/mockups/index.html` as the archive-aware review landing

The current index shows A as leading, B as alternate, C as cut-with-pointer. After this plan, A is no longer "under review" — it is the canonical direction. The review landing becomes a small record of the slate's arc plus a pointer to the archive.

**Rewrite `docs/dev/mockups/index.html`** — keep the existing token import and stylesheet block, replace the body to carry this structure:

- Eyebrow: "Internal — design-system record"
- H1: "Design slate (resolved)"
- Lede: one paragraph — A chosen, B and C archived, convergence signal noted, pointer to the live site at `/`.
- Single card linking to `/` (the canonical site) with slug "A — Editorial Masthead · shipped".
- Archive strip with two text links: "Archived: B (typographic architecture)" → `/_mockups/_archive/b/`, "Archived: C (the seal)" → `/_mockups/_archive/c/`. Note that archived items are read-only reference; edits land on `site/`.
- Footer: pointer to `docs/dev/plans/04-design-system-lock-in.md` as the decision record.

Keep the existing stylesheet block; only the `<body>` content and the eyebrow/copy change. Tokens consumed stay the same (`--color-bg`, `--color-text`, `--color-accent`, the mono/structure/prose font stacks) — these tokens will continue to exist in the rewritten `site/static/tokens.css` under Step 3.

**Add the archive symlink so the archive is reachable from the preview server:**

```bash
ln -s ../../docs/dev/mockups/_archive site/_mockups/_archive
```

`site/_mockups/` is gitignored. The archive symlink is a preview-only affordance — it is never uploaded to GitHub Pages, never part of the deploy artifact, and carries no harness coupling. The relative depth (`../..` from `site/_mockups/<name>` reaches project root) matches the existing `a`, `b`, `c`, `index.html` symlinks; earlier drafts of this plan used `../../../`, which resolves to one level above the project root and leaves a broken link.

**Verification:**

```bash
curl -s http://127.0.0.1:18080/_mockups/ | grep -q "Design slate" && echo "[v] review landing updated"
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18080/_mockups/_archive/b/ | grep -q 200 && echo "[v] archive reachable"
```

---

## Step 3 — Promote A → `site/` and rewrite `site/static/tokens.css`

This is the core file move. After this step, `site/` carries the editorial implementation and the token catalog matches it.

**3a. Copy A's authored files into place:**

```bash
cp docs/dev/mockups/a/index.html site/index.html
cp docs/dev/mockups/a/styles.css site/static/styles.css
mkdir -p site/static/assets
cp docs/dev/mockups/a/assets/rule-mark.svg site/static/assets/rule-mark.svg
```

Only `rule-mark.svg` is referenced by `a/index.html:162`. `colophon-mark.svg` exists in the mockup source tree but is not consumed by the shipped composition; it stays at `docs/dev/mockups/a/assets/colophon-mark.svg` as future-composition material and is not promoted to `site/`. Moving a file we do not consume would be dead weight in the publishable tree.

**3b. Retarget the stylesheet and asset references in `site/index.html`:**

A's `index.html` imports `./styles.css` (which itself `@import`s `./tokens.css`) and references `./assets/rule-mark.svg`. After the copy, those relative paths still resolve if we keep the assets under `site/static/`. Edit `site/index.html`:

- Replace `<link rel="stylesheet" href="./styles.css" />` with `<link rel="stylesheet" href="static/styles.css">`.
- Replace `src="./assets/rule-mark.svg"` with `src="static/assets/rule-mark.svg"`.
- Title stays `Ronin Advisory Group — Vol. 01, No. 01`.

Edit `site/static/styles.css`:

- No change to the `@import url('./tokens.css');` line. The import is relative to the importing file; both `styles.css` and `tokens.css` sit in `site/static/` after the copy, so the path resolves as-is. Noted here only because the copy step could invite a reflexive rewrite.

**3c. Rewrite `site/static/tokens.css`** as the editorial token contract. Replace the entire file contents with the following. Every semantic color carries the three-line fallback pattern. Required names (`--font-structure`, `--font-prose`, `--font-mono`, `--space-1`, `--width-prose`) are present. `light-dark()` count = 7. `--space-N` count = 10. `validate-tokens.sh` passes.

```css
/* === Ronin Advisory Group — Design Token Contract === */
/*
 * Canonical token catalog for the live site. The editorial-masthead
 * direction (plan 04) is the shipped design; these tokens are the
 * vocabulary that direction speaks in.
 *
 * Three-line semantic-color fallback preserved on every color:
 *   static hex → OKLch token → light-dark() semantic pair.
 * Older browsers resolve to the hex; OKLch-capable browsers stop at
 * the middle line; modern browsers honor color-scheme via light-dark().
 *
 * The palette is two-ink (deep ink + warm off-white paper) with a
 * single second accent (oxblood). State tokens (success/warning/error)
 * are deliberately absent — they are not used on the current site and
 * a disciplined palette is the point. If a future page needs a state
 * color, the token lands here first, then the consumer.
 */

:root { color-scheme: light dark; }

:root {
  /* ── Ink register ────────────────────────────────────────────── */

  /* Deep ink — warm, not pure black. Carries at display scale. */
  --color-ink: #141210;
  --color-ink: oklch(0.180 0.006 60);
  --color-ink: light-dark(oklch(0.180 0.006 60), oklch(0.920 0.004 80));

  /* Paper — warm off-white. Not sterile. Load-bearing: the editorial
     direction collapses the moment the page feels clinical. */
  --color-paper: #f5f0e6;
  --color-paper: oklch(0.950 0.014 85);
  --color-paper: light-dark(oklch(0.950 0.014 85), oklch(0.155 0.008 60));

  /* Secondary ink — colophon, folios, metadata. */
  --color-ink-muted: #6b645b;
  --color-ink-muted: oklch(0.480 0.012 70);
  --color-ink-muted: light-dark(oklch(0.480 0.012 70), oklch(0.660 0.010 75));

  /* Rule work — hairlines, dividers. */
  --color-rule: #2a2620;
  --color-rule: oklch(0.280 0.008 65);
  --color-rule: light-dark(oklch(0.280 0.008 65), oklch(0.520 0.010 70));

  /* The second ink. Oxblood — editorial red, not web-red. Used
     sparingly: issue mark, masthead ornament, one keyword, focus. */
  --color-mark: #7a1a1a;
  --color-mark: oklch(0.382 0.142 25);
  --color-mark: light-dark(oklch(0.382 0.142 25), oklch(0.620 0.165 28));

  /* Surface — half-step warmer than paper. Colophon strips, insets. */
  --color-surface: #ebe4d5;
  --color-surface: oklch(0.915 0.020 85);
  --color-surface: light-dark(oklch(0.915 0.020 85), oklch(0.195 0.008 70));

  /* Interior ink-soft — pull quotes, footnote markers. Reserved for
     supporting pages; shipped now so the catalog is whole. */
  --color-ink-soft: #3a342c;
  --color-ink-soft: oklch(0.330 0.010 65);
  --color-ink-soft: light-dark(oklch(0.330 0.010 65), oklch(0.780 0.008 75));

  /* ── Tier-1 canonical aliases ────────────────────────────────── */
  /* Validation script and quality-gate agents address the site by
     canonical names. These route to the editorial-register tokens. */
  --color-text:         var(--color-ink);
  --color-bg:           var(--color-paper);
  --color-text-muted:   var(--color-ink-muted);
  --color-border:       var(--color-rule);
  --color-accent:       var(--color-mark);
  --color-accent-hover: var(--color-ink-soft);

  /* ── Typography ──────────────────────────────────────────────── */
  /* Display serif — the cover voice. FreightDisp primary; graded
     substitutes preserve stress when the primary is unavailable. */
  --font-display:
    'freight-display-pro',
    'FreightDisp Pro',
    'Freight Display Pro',
    'Kepler Std Display',
    'Canela',
    'Minion Pro Display',
    Georgia,
    'Times New Roman',
    serif;

  /* Text serif — body copy, pull quotes. Same family, lower contrast. */
  --font-text:
    'freight-text-pro',
    'FreightText Pro',
    'Freight Text Pro',
    'Kepler Std',
    'Minion Pro',
    Georgia,
    'Times New Roman',
    serif;

  /* Grotesque — colophon, metadata, small-caps, numbering. */
  --font-grotesque:
    'acumin-pro',
    'Acumin Pro',
    'Neue Haas Grotesk',
    'Söhne',
    'Inter',
    'Helvetica Neue',
    Helvetica,
    'Arial',
    sans-serif;

  /* Mono — machine-register items (email, domain, ledger metadata). */
  --font-mono:
    'Berkeley Mono',
    ui-monospace,
    'SF Mono',
    Menlo,
    Monaco,
    'Courier New',
    monospace;

  /* Tier-1 canonical aliases. Component CSS addressing these names
     still works; the identity is chosen here. */
  --font-structure: var(--font-grotesque);
  --font-prose:     var(--font-text);
  --font-sans:      var(--font-grotesque);

  /* ── Type scale — editorial voice, clamp()-driven at display ─── */
  --size-xs:   0.750rem;   /* 12px  folios, issue marks                 */
  --size-sm:   0.875rem;   /* 14px  colophon, metadata                  */
  --size-base: 1.000rem;   /* 16px  body                                */
  --size-lg:   1.250rem;   /* 20px  lede                                */
  --size-xl:   1.875rem;   /* 30px  sub-display                         */
  --size-2xl:  2.750rem;   /* 44px  section lede                        */
  --size-3xl:  4.250rem;   /* 68px  masthead tablet                     */
  --size-4xl:  6.500rem;   /* 104px masthead desktop                    */
  --size-5xl:  9.500rem;   /* 152px masthead widescreen                 */

  /* ── Leading ─────────────────────────────────────────────────── */
  --leading-display: 0.92;    /* tight, optical for display serif      */
  --leading-tight:   1.10;
  --leading-snug:    1.22;
  --leading-normal:  1.48;    /* alias for --leading-prose             */
  --leading-prose:   1.48;
  --leading-relaxed: 1.70;

  /* ── Tracking ────────────────────────────────────────────────── */
  --tracking-display: -0.025em; /* optical tightening at display       */
  --tracking-tight:   -0.025em; /* alias                               */
  --tracking-text:     0;
  --tracking-normal:   0;       /* alias                               */
  --tracking-wide:     0.025em;
  --tracking-caps:     0.12em;  /* small-caps / all-caps               */
  --tracking-caps-lg:  0.18em;  /* hairline caps at small sizes        */

  /* ── Spatial grid — editorial proportions ────────────────────── */
  --space-1:  0.25rem;   /*  4px */
  --space-2:  0.50rem;   /*  8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1.00rem;   /* 16px */
  --space-5:  1.50rem;   /* 24px */
  --space-6:  2.00rem;   /* 32px */
  --space-7:  3.00rem;   /* 48px */
  --space-8:  4.50rem;   /* 72px */
  --space-9:  6.50rem;   /* 104px */
  --space-10: 9.00rem;   /* 144px */

  /* ── Rule weights ────────────────────────────────────────────── */
  --rule-hairline: 0.5px;
  --rule-thin:     1px;
  --rule-double:   3px;   /* paired with inset outline for double-rule */

  /* ── Page margins — cover-frame padding scales with viewport ─── */
  --page-margin-xs: 0.625rem;   /* iPhone-class — reduces chrome      */
  --page-margin-sm: 1.25rem;    /* ≥420px                             */
  --page-margin-md: 2.25rem;    /* ≥768px                             */
  --page-margin-lg: 4.00rem;    /* ≥1200px                            */

  /* ── Layout widths ───────────────────────────────────────────── */
  --width-prose:     62ch;
  --width-content:   830px;
  --width-cover:     1280px;
  --width-container: 1200px;
  --width-sidebar:   250px;
}
```

**3d. Verification:**

```bash
./tools/scripts/validate-tokens.sh site/static/tokens.css
# Expected: RESULT: PASS with 0 FAIL

# Preview render — A's composition, served from site/ rather than /_mockups/a/
curl -s http://127.0.0.1:18080/ | grep -q "Ronin Advisory Group — Vol. 01, No. 01" && echo "[v] site serves A"
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18080/static/tokens.css | grep -q 200 && echo "[v] tokens.css served"
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18080/static/styles.css | grep -q 200 && echo "[v] styles.css served"
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18080/static/assets/rule-mark.svg | grep -q 200 && echo "[v] rule-mark served"
```

Open `http://127.0.0.1:18080/` in a browser. The editorial masthead should render — folio, display-scale RONIN / ADVISORY Group, lede, services colophon, foot with Principal / Correspondence / Gunnerbench, rule-mark, imprint strip with the day/night edition affordance. Light and dark should pivot via the toggle and via OS preference.

---

## Step 4 — Update `docs/dev/typography.md` to commit Path C

Today's typography doc documents Paths A/B/C with no decision. A is shipping faces — FreightText Pro, FreightDisp Pro, Acumin Pro — that are Adobe-licensed and non-self-hostable. This is Path C. The doc should make the decision explicit, preserve A and B as historical alternatives (reversibility), and say what has to happen operationally to stand up the Typekit kit.

Dispatch this edit to `rag-web-docs-dev-writer` — Step 7 bundles it with the other `docs/dev/` updates.

The writer's brief for this file:

- Open with a resolved-decision banner: "Path C chosen (2026-04-21). Adobe Typekit CDN delivering FreightText Pro, FreightDisp Pro, Acumin Pro."
- Retain A and B as alternatives with a clear "not chosen — retained for reversibility" framing.
- Add an "Operational setup" section listing what the operator must do before the production site loads the correct fonts: (1) create a Typekit Web Project at fonts.adobe.com with the three faces, (2) add domains `roninadvisory.ai` and the GitHub Pages preview host to the kit's domain allowlist, (3) obtain the 7-character kit ID, (4) add `<link rel="stylesheet" href="https://use.typekit.net/XXXXXXX.css">` to `site/index.html` above the `static/tokens.css` link.
- Note the token fallback chain: until the Typekit `<link>` lands, the `var(--font-display)` / `var(--font-text)` / `var(--font-grotesque)` chains resolve to display-name substitutes (Kepler / Canela / Minion / Helvetica / Georgia / system serif). The site reads in the intended register on day-zero; the Typekit upgrade is an enhancement, not a blocker.

---

## Step 5 — New `docs/dev/design-system.md` — the theory document

This is the capstone dev-facing doc. It records the *why* behind the editorial direction so a future contributor can rebuild its theory rather than just observing its output. Dispatch to `rag-web-docs-dev-writer` (bundled with Step 7).

The writer's brief:

**Goal.** Author `docs/dev/design-system.md` as a Naur-voice theory document that answers three questions in order:

1. **What is the design claiming?** The front page is the cover of a quarterly the firm publishes; the services are its colophon. This is a category claim against the professional-services-site default shape (hero + three-column benefits + testimonial strip) — evidentiary consulting reads as editorial practice, not as SaaS product. Draw from `docs/dev/mockups/a/README.md` (the thesis document) but adapt for a dev-facing audience. Record the shape explicitly: no hero, no CTA button, no KPI tiles, no stock imagery, no phone number, no logo-mark — the wordmark is the logotype.

2. **How is the claim made visible?** Three axes carry it:
   - **Palette** — two inks (deep warm ink + warm off-white paper) with a single second accent (oxblood). Cross-direction convergence signal (A and B landed on warm paper + oxidized red independently) recorded as a brand-color decision.
   - **Typography** — one serif family at two optical sizes (FreightDisp for cover voice, FreightText for body) plus one grotesque (Acumin Pro) carrying every structural item, plus one mono (Berkeley Mono) for machine-register. Three voices is the ceiling; a fourth face is a theory shift.
   - **Structure** — printed-matter conventions: folio strip, masthead, colophon, imprint line, rule-mark between foot and imprint. Services render as a numbered colophon because a colophon asserts "this is the record of engagements," not "these are the pitches."

3. **What invariants keep it recoverable?** Three rules; violating any is a theory-level change that deserves a plan doc:
   - The company name IS the logotype. Adding a mark reads as costume.
   - The colophon structure is the site's spine. Interior pages render as typeset matter (numbered, ruled, grotesque for structure + serif for prose), not as cards or tiles.
   - Oxblood is the only non-ink color. A second accent shifts the register from editorial to commercial.

**References the doc must link to** (not replicate):
- `docs/dev/tokens.md` for the token catalog.
- `docs/dev/typography.md` for font-delivery paths (Path C committed).
- `docs/dev/authoring.md` for the enforcement contract.
- `docs/dev/mockups/_archive/README.md` for the directions that didn't ship.
- `docs/dev/plans/04-design-system-lock-in.md` (this file) for the decision record.

**Voice.** Naur: help the next reader rebuild the theory of the design, not inventory its surface. A future contributor who reads only this file plus `tokens.md` should be able to make correct edits without re-deriving the brand.

---

## Step 6 — New `docs/dev/troubleshooting.md` — failure modes catalogue

Dispatch to `rag-web-docs-dev-writer` (bundled with Step 7). This file records the design-system failure modes encountered while iterating A, so a future session recognizes them rather than re-discovers them.

**Goal.** Author `docs/dev/troubleshooting.md` as a named-failure-mode catalogue. Each entry: symptom, cause, fix, and why the fix is correct.

Entries to include (drawn from A's iteration history in the TUE_22 bundle):

1. **Nested-grid overflow at desktop widths.** Symptom: colophon list items extend past their enclosing column in the range 900–1440px. Cause: promoting an inner block to a 2-col grid while the outer layout holds it in a narrow column starves the inner grid below its min-content. The longest service name + `nowrap` kicker require ~275px; the starved cell offered 135–244px. Fix: drop the 2-col inner grid; let the label stack above the list with a hairline rule beneath. Why correct: `overflow: hidden` would paper over the miscalculation; the real issue is that "label | list" was a layout the outer column could never afford. A single-column colophon also reads more like an actual editorial colophon (label as kicker for the block, not counterweight column).
2. **Small-caps synthesis at narrow widths.** Symptom: the lede's first-line small-caps on iPhone widths reads as mixed-case caps on a two-word line. Cause: browsers faux-synthesize `font-variant-caps: small-caps` when the font lacks a proper small-caps face; on a short first line the result reads as SHOUTING rather than as typographic opening. Fix: gate the rule with `@media (min-width: 768px)`. Why correct: the convention is editorial; at tablet+ the first line has enough words to declare itself.
3. **Dark-mode serif weight inconsistency.** Symptom: serif stems look anemic in dark mode on macOS with default font-smoothing. Cause: when pixels invert, subpixel AA renders stems too thin. Fix: under `prefers-color-scheme: dark` and `[data-theme="dark"]`, set `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`. Why correct: grayscale AA keeps stem weight consistent across modes; the serif is what carries the cover, and inconsistent weight breaks the register.
4. **Theme-toggle aria-pressed lying on first paint.** Symptom: the day/night toggle's pressed state is incorrect in the millisecond between HTML parse and JS attachment. Cause: `aria-pressed="false"` ships in the HTML; if the page loads in dark mode via OS preference, the attribute lies. Fix: decouple visual state from `aria-pressed` — drive the toggle's visual state off the same `[data-theme]` / `prefers-color-scheme` signal the palette reads; use `aria-pressed` only for the post-click truth. Why correct: a visual element driven by the cascade cannot lie before JS; an element driven by a JS-assigned attribute can.
5. **Double-rule at high DPR.** Symptom: CSS `border: 2px solid` with an `inset outline` trick sometimes renders as a thick single line on retina displays. Cause: half-pixel rounding. Fix: use `border: var(--rule-thin)` plus `outline: var(--rule-hairline) solid` with explicit `outline-offset`. Why correct: two independent rule declarations at different offsets do not compete for the same subpixel position.
6. **Colophon cell starving under `minmax(0, 1fr)` with `nowrap` kickers.** Symptom: on narrow tablets, the kicker text (`Evidentiary`, `Governance`) wraps awkwardly or forces column overflow. Cause: `white-space: nowrap` on an item inside a 3-column grid with a flexible middle column. Fix: media query below 520px that reflows the kicker into the name column with `margin-top: 2px; white-space: normal`. Why correct: on narrow viewports the kicker is supporting metadata, not a parallel column; dropping its `nowrap` discipline is the right editorial compromise.

**Voice.** Each entry is a pattern, not an incident report. Name the pattern so a future session recognizes it; give the fix concretely; explain *why* the fix is correct (the Naur move — the reasoning is the artifact).

---

## Step 7 — Dispatch `rag-web-docs-dev-writer` for all `docs/dev/` updates

**Parallelization.** Steps 7, 7.5, 8, and 9 dispatch to four different agents working on non-overlapping file surfaces (`docs/dev/` / `CHANGELOG.md` / `docs/agent/` + `.claude/agents/` / `site/index.html` read-only). They have no data dependency on each other. The executor SHOULD invoke all four in a single orchestrator call — one message containing four parallel Agent invocations — and await completion before proceeding to Step 10. Sequential dispatch loses nothing but time.

Operator preference: use the documentation-layer writer agents for the prose work. This step dispatches `rag-web-docs-dev-writer` (sonnet, background) with a self-contained brief that covers:

- **Rewrite `docs/dev/tokens.md`** against the new editorial token catalog (Step 3). The file currently documents the blue-accent scaffold with state colors; rewrite to document the editorial two-ink palette (ink / paper / ink-muted / rule / mark / surface / ink-soft), the Tier-1 canonical aliases (`--color-text`, `--color-bg`, `--color-text-muted`, `--color-border`, `--color-accent`, `--color-accent-hover`), the editorial type scale (xs through 5xl, not the modular 1.25 scale), the editorial leading/tracking (`--leading-display`, `--tracking-caps-lg`, etc.), the editorial spacing (quarter-rem-then-rem progression, not quarter-rem grid), the new `--page-margin-*` family, and the new `--rule-*` weights. Preserve the worked three-line-fallback example and the "design vocabulary" metaphor. Explicitly document why state tokens are absent (YAGNI + palette discipline — a state color lands when the design needs one).
- **Update `docs/dev/typography.md`** per Step 4's brief — Path C committed, Paths A/B retained as reversibility, operational setup section added.
- **Update `docs/dev/architecture.md:§ Why the token contract is shaped the way it is`** to reflect the editorial palette specifically — the "three design pressures" framing stays, but the "10 semantic colors" number is now 7 editorial tokens plus 6 canonical aliases. Remove references to blue/`#fafafa` / state colors.
- **Update `docs/dev/authoring.md`** to reflect the new token names and the editorial voice. The pixel-to-token table changes (the spacing scale is different). The "font-family via `var(--font-*)`" guidance expands to mention `--font-display`, `--font-text`, `--font-grotesque` in addition to the Tier-1 aliases. The "common drift patterns" section gains the small-caps-at-narrow-widths and cross-accent-color entries from Step 6.
- **Author `docs/dev/design-system.md`** per Step 5's brief.
- **Author `docs/dev/troubleshooting.md`** per Step 6's brief.
- **Update `docs/dev/contributing.md`** — two specific edits. (1) The plan list at lines 34–38 currently reads "Three exist today" and enumerates plans 01–03; extend to name plan 04 and update the count. (2) Add the new design-system.md and troubleshooting.md to the file's cross-reference strip, if it carries one. Minimal touch beyond those two.

**Dispatch brief to hand to the agent:**

```
Update docs/dev/ to reflect the design-system lock-in landed in plan 04.

Context: mockup A (editorial masthead) was promoted to site/ in this
session. site/static/tokens.css was rewritten around an editorial
two-ink palette (ink/paper/oxblood) with Freight + Acumin typography.
The file now contains 7 semantic colors (not 10), no state tokens,
an editorial type scale (xs-5xl), rule weights, and page-margin
tokens. See docs/dev/plans/04-design-system-lock-in.md for the
decision record and the token-catalog source.

Files to rewrite: docs/dev/tokens.md, docs/dev/typography.md.
Files to update in place: docs/dev/architecture.md, docs/dev/authoring.md,
docs/dev/contributing.md (minimal).
Files to author: docs/dev/design-system.md, docs/dev/troubleshooting.md.

Authoritative source for all content: read these first.
  - site/static/tokens.css                       (the new contract)
  - site/index.html, site/static/styles.css      (the new shipped design)
  - docs/dev/mockups/a/README.md                 (thesis document)
  - docs/dev/plans/04-design-system-lock-in.md   (this plan — Steps 4, 5, 6 carry per-file briefs)

Voice: Naur's "Programming as Theory Building." Help the next reader
rebuild the theory; don't inventory the surface.

Constraints:
  - Preserve the three-line fallback teaching in tokens.md.
  - Preserve the "design vocabulary" metaphor in tokens.md.
  - Keep cross-reference strips current.
  - Do not touch files outside docs/dev/.
  - Do not commit.
```

**Verification after the agent completes:**

```bash
test -f docs/dev/design-system.md && echo "[v] design-system.md authored"
test -f docs/dev/troubleshooting.md && echo "[v] troubleshooting.md authored"
grep -q "Path C chosen" docs/dev/typography.md && echo "[v] typography.md records decision"
grep -q "color-ink" docs/dev/tokens.md && echo "[v] tokens.md uses editorial names"
! grep -q "color-success\|color-warning\|color-error" docs/dev/tokens.md && echo "[v] state tokens not referenced"
```

---

## Step 7.5 — Dispatch `rag-web-docs-changelog-writer`

Per `docs/agent/agents.md` the changelog writer runs on "any net change to the repo," and plan 04 is the largest net change since the site scaffold landed. `/rag-web-close` will auto-dispatch it at session end, but this step gives the agent an explicit scoped brief so the resulting entry records the theory shift rather than degenerating into a file-move log.

Dispatch `rag-web-docs-changelog-writer` (haiku, background).

**Dispatch brief:**

```
Append an entry to CHANGELOG.md for the design-system lock-in landed
in plan 04.

The entry records a theory shift, not a file list. Lead with the
claim: the site's visual direction resolved to the editorial-masthead
register (mockup A), and the token catalog was rewritten from the
Tier-1 scaffold (blue + state colors) to the editorial contract
(two-ink palette + oxblood accent, no state tokens). B and C are
archived as recorded alternatives, not deleted.

Keep Keep-a-Changelog format. Group under Added / Changed / Removed
sections as applicable. One or two lines per bullet — readers go to
the plan doc (docs/dev/plans/04-design-system-lock-in.md) for depth.

Do not commit. Do not touch files outside CHANGELOG.md.
```

**Verification:**

```bash
grep -q "editorial" CHANGELOG.md && echo "[v] changelog records lock-in"
```

Note: `/rag-web-close` will also auto-invoke `rag-web-docs-vault-exporter` after the writer agents complete, if an Obsidian vault is configured. That runs sequentially last and requires no brief from this plan — the exporter consumes the writers' output as-is.

---

## Step 8 — Dispatch `rag-web-docs-agent-writer` for `docs/agent/` updates

The agent-facing doctrine also needs the design-system lock-in reflected. Dispatch `rag-web-docs-agent-writer` (sonnet, background).

**Scope of change for the agent:**

- **Update `docs/agent/conventions.md`** — add a new section after the `rag-web-*` namespace section: "The design-system contract." The section records that the canonical token catalog is `site/static/tokens.css`, that the editorial-direction lock-in is the shipped design, that the three quality-gate agents (`rag-web-css-auditor`, `rag-web-token-enforcer`, `rag-web-visual-reviewer`) enforce compliance, and that a change to the token catalog is a theory-level change that deserves a plan doc. Voice consistent with the rest of `conventions.md` — rule + failure mode + warrant.
- **Update `docs/agent/agents.md`** — no structural change, but the quality-gate-agent entries reference "the token contract" abstractly; confirm they still describe the agents correctly against the new catalog. If a pointer has drifted, fix it.
- **Audit `.claude/agents/rag-web-css-auditor.md`, `.claude/agents/rag-web-token-enforcer.md`, `.claude/agents/rag-web-visual-reviewer.md`, `.claude/agents/rag-web-docs-dev-writer.md`, `.claude/agents/rag-web-docs-user-writer.md`** — all five already point at `site/static/tokens.css` (confirmed at plan-authoring time). Verify the pointers still match after Step 3's rewrite. If a body references specific token names that have changed (e.g., if any agent hardcoded a reference to `--color-accent: blue` or `--color-success`), update the agent body to reflect the new catalog. If no such reference exists, leave the agent body alone — this plan's scope is *not* to edit agent prompts if no drift exists.

**Dispatch brief:**

```
Update docs/agent/ and audit .claude/agents/ for the design-system
lock-in landed in plan 04.

Context: site/static/tokens.css has been rewritten from the Tier-1
scaffold catalog (blue accent, state colors) to the editorial catalog
(ink/paper/oxblood, no state colors, editorial type scale). The
three quality-gate agents point at site/static/tokens.css by path;
their pointers remain valid. This task confirms that remains true
and records the lock-in as doctrine.

Tasks:
1. Add to docs/agent/conventions.md: a new section "The
   design-system contract" recording the canonical token catalog,
   the three quality-gate agents that enforce it, and the rule that
   token-catalog changes deserve a plan doc.
2. Read each of the five agents listed below. For each, confirm the
   file references site/static/tokens.css by path only (no
   hard-coded token names that would stale-drift):
     .claude/agents/rag-web-css-auditor.md
     .claude/agents/rag-web-token-enforcer.md
     .claude/agents/rag-web-visual-reviewer.md
     .claude/agents/rag-web-docs-dev-writer.md
     .claude/agents/rag-web-docs-user-writer.md
3. The principle: agents should reference site/static/tokens.css by
   file path only. Hardcoding a specific token name (e.g.
   --color-success, --color-accent-blue) in an agent body creates a
   hidden dependency that breaks silently when the catalog is
   rewritten — exactly the drift this plan is closing. If any agent
   body hardcodes a specific token name, update the reference to
   match the current catalog. If no such reference exists, leave
   the agent body unchanged.
4. Report which agents (if any) were modified.

Authoritative source: read site/static/tokens.css first.
Voice: Naur; same as the rest of docs/agent/.
Constraints: do not edit files outside docs/agent/ and .claude/agents/.
Do not commit.
```

**Verification after the agent completes:**

```bash
grep -q "design-system contract" docs/agent/conventions.md && echo "[v] conventions.md records design-system contract"
grep -l "site/static/tokens.css" .claude/agents/rag-web-css-auditor.md .claude/agents/rag-web-token-enforcer.md .claude/agents/rag-web-visual-reviewer.md | wc -l | grep -q 3 && echo "[v] quality-gate agents still point at canonical catalog"
```

---

## Step 9 — Dispatch `rag-web-docs-user-writer` on the visitor-facing surface (light touch)

The visitor-facing copy is the operator's deferred scope ("copy tweaks later"). This step explicitly does *not* author new copy; it asks the user-writer agent to sanity-check that the copy currently in `site/index.html` is plausible visitor-facing prose (not a lorem-ipsum artifact, not contradictory with the services listed, not out of register with the editorial voice).

Dispatch `rag-web-docs-user-writer` (sonnet, background).

**Dispatch brief:**

```
Sanity-check visitor-facing copy in site/index.html.

Context: site/index.html is the newly-promoted editorial-masthead
page from plan 04. The copy in it was written in the mockup round
and has NOT been operator-reviewed for final voice. Copy edits are
explicitly deferred to a later session — the operator is handling
those personally.

Your task is NOT to edit the copy. Your task is to:
1. Read site/index.html end-to-end.
2. Produce a structured copy inventory with four sections — (a)
   services listed in the colophon, verbatim; (b) the lede (two
   paragraphs), verbatim; (c) the masthead tagline, verbatim;
   (d) the Gunnerbench card copy, verbatim.
3. Flag anything that looks like placeholder text, lorem ipsum,
   internal TODOs, or a contradiction with the firm's stated
   services (digital forensics, AI risk, AI engineering, technical
   consulting).
4. Do not edit any file. Report only.

Authoritative source: site/index.html.
```

**Verification:** agent produces a copy inventory and flags no placeholders.

---

## Step 10 — Visual verification via `rag-web-visual-reviewer`

With the promoted site rendering and the token catalog validated, close the quality loop. Dispatch `rag-web-visual-reviewer` (opus, foreground) against `http://127.0.0.1:18080/` for a score on the 25-point sophistication rubric across three viewports:

- 1440×900 light
- 1440×900 dark
- 390×844 light (iPhone 14 Pro portrait)

The capture script `tools/scripts/capture-screenshot.sh` is the single call site. The reviewer is foreground because the rubric's judgment is load-bearing and background bury would lose the verdict.

**Dispatch (operator runs this inline, not via /rag-web-close — quality gates are not close's territory):**

```
Review the newly-promoted Ronin Advisory Group front page against the
25-point sophistication rubric. The page is the editorial-masthead
direction (mockup A) promoted to site/ in plan 04. Capture screenshots
at three viewports via tools/scripts/capture-screenshot.sh. Score each
of the nine dimensions with evidence drawn from the screenshots. Cap
findings at what is fixable without new copy (copy tweaks are deferred).

URL: http://127.0.0.1:18080/
Viewports: 1440x900 light, 1440x900 dark, 390x844 light
Rubric: ~/.claude/skills/web-frontend/reference/sophistication-rubric.md
```

**Verification:** the reviewer produces a scored report. The operator reviews and either opens follow-up tasks for any sub-threshold dimensions or accepts the score.

---

## Pi Mirror

*N/A — this plan modifies no primitive under `.claude/`.*

The plan reshapes `site/` (publishable artifact; `mirror_status: not-applicable`), `docs/dev/`, `docs/agent/`, and `docs/dev/mockups/`. It dispatches documentation-writer agents but does not edit the agents' source files unless Step 8 surfaces a stale token-name reference in a quality-gate agent body — in which case the edit is a token-catalog sync, not a behavioral change, and the existing `pi-agents.yaml` entry (status `pending`) continues to reflect reality. No new primitive is introduced; no `mirror_status` transition is expected.

If Step 8 does end up editing an agent body, the change is reported explicitly in the session summary and the operator can decide whether the edit constitutes a primitive modification worth tracking. Default expectation: no edit, no transition.

---

## Acceptance criteria

- [ ] `docs/dev/mockups/_archive/{b,c}/` exist with all their original files; `docs/dev/mockups/{b,c}/` no longer exist; `docs/dev/mockups/_archive/README.md` explains the archive.
- [ ] `site/_mockups/{b,c}` symlinks removed; `site/_mockups/_archive` symlink added and resolves.
- [ ] `docs/dev/mockups/index.html` rewritten as the archive-aware review landing (slate resolved, A shipped, B and C archived).
- [ ] `site/index.html` is the editorial-masthead composition (from A). `site/static/styles.css` is A's stylesheet. `site/static/assets/{rule-mark,colophon-mark}.svg` are present.
- [ ] `site/static/tokens.css` is the editorial token catalog per Step 3.
- [ ] `./tools/scripts/validate-tokens.sh site/static/tokens.css` exits 0 with RESULT: PASS.
- [ ] Preview server renders the editorial masthead at `http://127.0.0.1:18080/` with light/dark pivot via toggle and OS preference.
- [ ] `docs/dev/tokens.md` rewritten against the editorial catalog.
- [ ] `docs/dev/typography.md` records Path C as committed; Paths A and B retained as alternatives.
- [ ] `docs/dev/design-system.md` authored (theory document).
- [ ] `docs/dev/troubleshooting.md` authored (failure-mode catalogue).
- [ ] `docs/dev/architecture.md` and `docs/dev/authoring.md` updated to reflect the editorial catalog; no references remain to the blue-accent scaffold or to state tokens.
- [ ] `docs/agent/conventions.md` carries a new "design-system contract" section.
- [ ] Quality-gate agents (`rag-web-css-auditor`, `rag-web-token-enforcer`, `rag-web-visual-reviewer`) and doc-writer agents (`rag-web-docs-dev-writer`, `rag-web-docs-user-writer`) still point at `site/static/tokens.css`; no stale token-name references remain in their bodies.
- [ ] `CHANGELOG.md` carries a theory-shift entry authored by `rag-web-docs-changelog-writer`; the entry names the editorial-register lock-in, not just the file moves.
- [ ] `rag-web-visual-reviewer` produces a scored report across the three viewports; the operator has seen it.
- [ ] `## Pi Mirror` section present (enforced by `/rag-web-close`).
- [ ] `pi-agents.yaml` unchanged (no new primitives; no `mirror_status` transitions).

---

## Decisions (resolved 2026-04-21)

1. **Archive, don't delete.** B and C retain theory value as recorded alternatives (`docs/agent/conventions.md:65`: "Decisions blocks are load-bearing source material for a future contributor trying to rebuild the theory"). A future contributor who wonders why the editorial direction was chosen can read the archived thesis docs. Delete is cheap; re-deriving why a direction was rejected is not.
2. **Token names preserve editorial register, add canonical aliases on top.** The catalog's primary names are editorial (`--color-ink`, `--color-paper`, `--color-mark`). The Tier-1 canonical aliases (`--color-text`, `--color-bg`, `--color-accent`, etc.) resolve via `var()` to the editorial tokens. Component CSS can address either; the validate-tokens.sh script and downstream agents can address the canonical names without fighting the design. Alternative considered: rename everything to canonical names and retire the editorial names. Rejected because the editorial names carry meaning the canonical names don't (`--color-mark` says "this is the second ink," `--color-accent` says "this is a CTA color" — not the same claim).
3. **No state tokens in the shipped catalog.** The editorial palette is two-ink; state colors would add a third and fourth ink, shifting the register toward commercial. If a future surface legitimately needs a state color, the token lands first, the consumer second, and the plan doc introducing it records the register shift as a decision. YAGNI applied at the design-vocabulary layer, not just the code layer.
4. **Path C (Typekit) committed, not executed.** Committing to Path C changes only the `docs/dev/typography.md` narrative and leaves the `<link>` addition to an operator action (a Typekit Web Project has to be created; the kit ID is an Adobe-side artifact). The site's fallback chain resolves readably without the kit loaded; shipping the `<link>` is an enhancement, not a blocker. Keeping the execution separate from the decision lets this plan close without waiting on an external account.
5. **Quality-gate agents not edited unless drift surfaces.** Step 8's audit is read-then-report-then-maybe-edit. If the existing pointers are fine (expected), the agents are untouched — editing them "for consistency" would be surface churn. The Pi Mirror section is N/A by the same logic: no primitive modification, no parity obligation.
6. **Documentation-layer writer agents do the prose work.** Operator directive. The plan dispatches `rag-web-docs-dev-writer` for the `docs/dev/` corpus (Step 7), `rag-web-docs-agent-writer` for `docs/agent/` + agent-body audit (Step 8), and `rag-web-docs-user-writer` for a read-only sanity check on visitor-facing copy (Step 9). The in-line authoring is restricted to Steps 1–3 (file moves and `site/static/tokens.css`), which are mechanical rather than prose-judgment work.
7. **Visual review sits outside `/rag-web-close`.** Per `docs/agent/agents.md:35`, quality gates belong inside the edit loop, not at its end. `rag-web-visual-reviewer` is dispatched inline after the design-system lock-in lands (Step 10), not via close. Close's territory is commit gating and documentation dispatch; it does not impose quality gates.
8. **No `CLAUDE.md` pointer to `design-system.md`.** `CLAUDE.md` holds durable rules, antipatterns, and role doctrine — not references to every dev-facing document, no matter how load-bearing. The "Inventorial CLAUDE.md" antipattern argues against adding a pointer that will invite future additions of the same kind. Design-system doctrine is discoverable through `README.md`'s "Where to go" table (which already routes "How is the project laid out and why?" to `docs/dev/architecture.md`, and after Step 5 `design-system.md` joins that corpus) and through `docs/dev/contributing.md`'s cross-reference strip (Step 7). The absence is deliberate; a future contributor who wonders whether to add one should read this decision first.
9. **Validator margins recorded, not expanded.** The Step 3 catalog carries exactly 7 `light-dark()` calls and exactly 10 `--space-N` definitions — the minimums `tools/scripts/validate-tokens.sh` requires. A future edit that removes a semantic color or a spacing rung breaks the gate before it breaks the site. Raising the minimums or padding the catalog to carry slack would be cargo-culted safety: the validator's numbers were chosen to match the editorial vocabulary's actual size, and pretending the vocabulary is larger than it is would be the real drift. The fragility is recorded as a known property of the contract; the validator is the early warning.
