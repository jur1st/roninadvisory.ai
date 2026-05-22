# GunnerBench Subdirectory — `/gb/` as a sibling property

**Scope:** Publish the self-contained GunnerBench About page at `https://roninadvisory.ai/gb/` as a sibling property under the existing rag-web domain. The page is a single hand-authored HTML file with its own visual language and evolves on its own cadence. This plan does NOT extend the rag-web design-system contract to `/gb/`, does NOT add a build step, does NOT introduce new agentic primitives, and does NOT touch the editorial main site at `/`.

**Out of scope (deferred):**

- Adding wayfinder links from the main site (`/`) to `/gb/` — the user-facing discovery surface is a separate decision.
- Bringing `/gb/` under the design-system gates (`rag-web-css-auditor`, `rag-web-token-enforcer`, `rag-web-visual-reviewer`) — see Decision 2.
- Future GunnerBench sub-pages (`/gb/findings/`, `/gb/v1/`, etc.) — `/gb/` ships as `index.html` only. The path is reserved; the expansion is not.
- A 1200×630 OG preview image for `/gb/` — the page ships with no `og:image` meta and a `twitter:card: summary` fallback; the asset gets added later.
- Pi-side primitives for `/gb/` — see `## Pi Mirror`.

---

## Current ground truth

**The artifact.** A single self-contained HTML file at `site/gb/index.html` (974 lines, ~38 KB after the pre-publication comment cleanup). Committed at `bf234eb` (2026-05-22). No external stylesheets, scripts, images, or fonts; the favicon is a `data:image/svg+xml` URI. Three outbound links exist in the page:

- `https://roninadvisory.ai/` — back to the main site (self-domain).
- `https://john-benson.com/ai/gunnerbench/` — the 2024 public-announcement page (historical artifact).
- `https://field-fall-b93.notion.site/GunnerBench-3e0fe64fb8714eb383b03f620f9dd6e6` — the v1 Notion workspace (historical corpus, still hosted).

**The design system.** `site/gb/index.html` inlines its own design tokens (BL-023: three font roles, calibrated-teal accent at hue 215, light/dark surfaces via `light-dark()`). These tokens are NOT the rag-web tokens defined at `site/static/tokens.css`. The two catalogs share the `light-dark()` pattern and OKLch values shape, but their semantic vocabularies are disjoint by design — see Decision 2.

**The publishing surface.** `.github/workflows/deploy-pages.yml` already uploads everything under `site/` to GitHub Pages. The CNAME at `site/CNAME` already routes `roninadvisory.ai` to the bucket. `site/.nojekyll` is already in place. No workflow change is needed — `site/gb/` is picked up by the existing upload step.

**Preflight state.** `/rag-web-pages-check` against the current tree reports PASS on every hard gate (`.nojekyll`, actionlint, css tokens, include-hidden-files, lychee offline, no localhost). `html-validate` skipped (binary absent locally; CI's lychee step runs the live link check at deploy time, including the three new outbound links). No deploy-blocking issues.

**The harness layer.** No primitive under `.claude/` was added or modified. No new agent, no new command, no new skill, no new extension. The page is content-only.

---

## Step 1 — File placement and idempotency

Already done at commit `bf234eb`. The file lives at `site/gb/index.html`. No siblings in `site/gb/` (the directory contains the one file). The Pages workflow's upload step picks it up automatically.

## Step 2 — Pre-publication cleanup pass

Already done before commit. The file as authored carried internal-development context — local filesystem paths, internal build commands (`gunnerbench portal build`), five iterations of operator-facing design rationale, SQL queries against an internal database, raw commit-count timestamps, and a 228-line header comment. All of that was stripped in a frontend-agent dispatch before commit. The post-cleanup file contains only structural comments (CSS authoring notes, section markers, SEO scaffolding) — nothing that exposes the build process to a public reader who views source.

## Step 3 — Layout fix for the negative-margin breakouts

Already done before commit. The original CSS for `.breakout-wide` and `.breakout-svg` contained a width/margin contradiction: `width: 100%` combined with negative margin-left was shifting the figures left rather than letting them grow symmetrically. The fix overrides `width: auto` and `max-width: <target>px` inside each breakout media query, so the figures now span from `body_left − overhang` to `body_right + overhang` centered around body axis. See commit `bf234eb` for the exact CSS diff.

## Step 4 — Deploy via `/rag-web-pages-deploy`

`/rag-web-pages-deploy` performs the gates (clean tree, `main` branch, preflight re-run), pushes (or `workflow_dispatch`-es if HEAD equals `origin/main`), watches the run via `gh run watch`, and dispatches `rag-web-pages-verify` against `https://roninadvisory.ai/gb/` on workflow success. The operator invokes the command.

## Step 5 — Post-deploy verification

`rag-web-pages-verify` fetches the live URL and runs the postflight gates: HTTPS, canonical content (the page's hero text exists in the served HTML), asset resolution, CDN-lag tolerance. Reports divergence between committed and served state. Retries once on stale-content detection.

---

## Pi Mirror

*N/A — this plan modifies no primitive under `.claude/`.*

The plan introduces a public content artifact (`site/gb/index.html`) and uses the existing deploy pipeline. No new command, agent, skill, or extension is added on the Claude Code side, so there is no parity obligation on the Pi side. `pi-agents.yaml` is unchanged by this plan. The `assets:` bucket in `pi-agents.yaml` already covers `site/index.html + tokens.css` with `mirror_status: not-applicable` ("Publishable web artifacts consumed by GitHub Pages. No harness coupling"); `site/gb/index.html` falls under the same exemption and does not require its own registry entry.

---

## Acceptance criteria

- [x] `site/gb/index.html` exists, is self-contained, and is committed (`bf234eb`).
- [x] Pre-publication cleanup pass removed internal-context comments; no filesystem paths, internal build commands, or iteration archaeology remain in the file.
- [x] CSS breakout layout fix applied; figures (`.breakout-wide`, `.breakout-svg`) center symmetrically around the body axis at all viewports.
- [x] Local preflight (`/rag-web-pages-check`) passes all hard gates against the committed tree.
- [ ] `/rag-web-pages-deploy` succeeds and the live URL `https://roninadvisory.ai/gb/` renders the page (post-deploy verification via `rag-web-pages-verify`).
- [x] `## Pi Mirror` section present and accurate (`N/A`, this plan touches no `.claude/` primitive).

---

## Decisions (resolved 2026-05-22)

1. **`/gb/` is a sibling property, not a sub-section of the editorial main site.** The page evolves on its own cadence, in its own visual language, with its own design tokens. Alternative considered and rejected: bringing `/gb/` under the rag-web editorial direction (token catalog at `site/static/tokens.css`, type scale, ink palette). Reason for rejection: the GunnerBench page already had a finished, internally-coherent visual identity (BL-023 design tokens, calibrated-teal accent at hue 215) authored before this project saw the file. Re-skinning it to match the editorial direction would (a) require redesign work that wasn't asked for, (b) destroy the visual coherence with the rest of the GunnerBench operator-facing surface that lives in a separate codebase, and (c) collapse the structural fact that GunnerBench is a distinct project with its own published voice. The `/gb/` path expresses that distinction; the design-system independence enforces it.

2. **`/gb/` is exempt from the rag-web design-system gates.** The three quality-gate agents (`rag-web-css-auditor`, `rag-web-token-enforcer`, `rag-web-visual-reviewer`) are anchored to `site/static/tokens.css` and score against the editorial 25-point rubric. Pointing them at `/gb/` would produce category-error findings — the page intentionally uses a different vocabulary, and scoring it against the wrong rubric would generate noise that obscures real quality signal. The exemption is structural, not a gap. If a future quality-gate agent specific to GunnerBench's visual language is wanted, it would be a new agent (`rag-web-gb-*` or `gb-*`), not a re-pointing of the existing ones.

3. **Outbound link policy: existing live URLs only; no future-dated promises.** The three outbound links (roninadvisory.ai apex, john-benson.com/ai/gunnerbench/, the v1 Notion workspace) are all currently-live resources. Alternative considered: adding placeholder links to "findings", "v1 corpus", or other planned-but-not-built surfaces. Rejected because broken or 404-after-launch links erode the page's "findings, not product" claim more than a quiet absence does. The page ships with three links that work.

4. **No plan-doc retrofit for pre-commit work; this plan documents the decisions, not the keystrokes.** The cleanup pass, the layout fix, and the SVG-internal centering edits were all performed before this plan was written. The plan documents the *decisions* that shaped them (sibling-property posture, design-system exemption, outbound-link policy) and the publishable-artifact handoff to the deploy pipeline — not a play-by-play of the editing session. The session-summary system at `.the-grid/sessions/summaries/` captures the keystroke arc; the plan captures the theory that survives the session.
