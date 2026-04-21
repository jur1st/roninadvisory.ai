# Localize web-frontend into rag-web

**Scope:** port the `web-frontend` skill's Tier 1 surface into this project as versioned repo artifacts, rename the four quality-gate agents under the `rag-web-*` prefix, configure Playwright CLI for local visual QA, and record Pi-mirror follow-ups.

**Out of scope (deferred):**
- Tier 2 and Tier 3 templates (banned by `CLAUDE.md`)
- Project-local `/rag-web-web-scaffold` command (one-shot invocation of the global command is enough)
- Final font stack (typography primer lands with the decision deferred)
- Any actual site content or pages beyond the scaffold output
- Pi-side implementations (CC-only in this plan; `pi-agents.yaml` updates record the deferral)
- Chrome DevTools MCP integration (explicitly set aside in favor of Playwright CLI)

---

## Current ground truth

- Skill library at `~/.claude/skills/web-frontend/` ships four agents, four scripts, ten reference docs, three tier templates, and an OKLch token CSS.
- Project has zero frontend assets today: no `site/index.html`, no `site/static/`, no `tools/package.json`.
- `.claude/agents/` already holds five `rag-web-docs-*` writer agents (committed in TUE_17).
- `pi-agents.yaml` tracks drift; this plan adds four agent entries plus several `not-applicable` entries.
- Global `/web-scaffold <tier>` command exists and runs Tier 1 on request.
- `.the-grid/config/the-grid-SYSTEM-ENV.md` confirms bun 1.3.1, node 25.9.0, npm 11.12.1 are all present.
- No `playwright-bowser` skill exists locally; the four library agents reference it. The rename-on-copy step strips that reference and re-points at `tools/scripts/capture-screenshot.sh`.
- `CLAUDE.md` bans "build tooling without explicit approval." This plan carries that approval for Playwright as a dev/test dependency — no Playwright output ships to GitHub Pages.

---

## Step 1 — One-shot Tier 1 scaffold

Invoke the global `/web-scaffold 1 ronin-advisory-site` from the project root. The Tier 1 `standalone.html` template produces a single HTML file with the OKLch token block inlined.

Adapt the scaffold output:

- Move the embedded `<style>` token block (`:root { --color-* / --font-* / --space-* / --width-* }`) into `site/static/tokens.css`.
- Replace the inline block with `<link rel="stylesheet" href="static/tokens.css">`.
- Leave the base-element styles (`*`, `html`, `body`, `h1-h4`, `p`, `a`, `code`, `pre`, etc.) inline for now. Splitting them is an operator call once real pages exist.

Resulting tree:

```
site/index.html
site/static/
  tokens.css
```

---

## Step 2 — Localize scripts

Copy three scripts from `~/.claude/skills/web-frontend/scripts/` into `./tools/scripts/`:

| Script | Role |
|---|---|
| `validate-tokens.sh` | Gates token edits; runs before `site/static/tokens.css` changes are committed |
| `capture-screenshot.sh` | Playwright CLI wrapper; the single call site for visual-capture work |
| `font-check.sh` | `atsutil`-based local font availability check |

Skip `audit-deps.sh` — it targets Tier 3 npm transitive depth and is irrelevant here.

`chmod +x tools/scripts/*.sh`. After localization these files diverge from upstream; improvements live in-repo, not back-propagated to the skill.

---

## Step 3 — Configure Playwright CLI

Install Playwright as a dev dependency via bun (node toolchain confirmed in SYSTEM-ENV):

```bash
bun init -y                           # creates tools/package.json, tools/bun.lockb
bun add -d playwright                 # devDependencies only
bunx playwright install chromium      # browser binary — user cache, not repo
```

`tools/package.json` ships with `devDependencies` only. Remove the default `main`, `module`, and `scripts` fields that `bun init` writes — they are not needed and invite drift.

Commit: `tools/package.json`, `tools/bun.lockb`. Git-ignore: `tools/node_modules/`.

Verify:

```bash
bunx playwright --version
./tools/scripts/capture-screenshot.sh "file://$PWD/site/index.html" /tmp/rag-web-smoke.png
```

The smoke shot should land in `/tmp/` as a valid PNG. Delete after verification.

---

## Step 4 — Rename-on-copy the four quality-gate agents

Copy from `~/.claude/skills/web-frontend/agents/` into `.claude/agents/` with the `rag-web-*` prefix. For each agent:

- rewrite the `@playwright-bowser` reference to explicit `tools/scripts/capture-screenshot.sh` invocations;
- update reference-doc paths to absolute `~/.claude/skills/web-frontend/reference/...`;
- point token catalog references at `site/static/tokens.css` instead of the library template path.

Copy map:

```
visual-reviewer.md       → rag-web-visual-reviewer.md      (opus, foreground)
css-auditor.md           → rag-web-css-auditor.md          (sonnet, background)
token-enforcer.md        → rag-web-token-enforcer.md       (sonnet, background)
visual-test-writer.md    → rag-web-visual-test-writer.md   (sonnet, background)
```

Per-agent adjustments:

**rag-web-visual-reviewer.** Strip `skills: [playwright-bowser]` from frontmatter. Replace Workflow step 3 ("Use @playwright-bowser to navigate") with three explicit `tools/scripts/capture-screenshot.sh` invocations — 1440x900 light, 1440x900 dark, 390x844 light. Add a Constraints line: "All browser interaction runs through `tools/scripts/capture-screenshot.sh`; do not assume Chrome MCP, external browser contexts, or manual navigation."

**rag-web-css-auditor.** Pure text analysis. Only frontmatter rename and a description tweak pointing at `site/static/tokens.css` and `~/.claude/skills/web-frontend/reference/design-tokens.md`.

**rag-web-token-enforcer.** Same shape as css-auditor. The token catalog reference moves from `templates/tokens/darko-labs-tokens.css` to the in-repo `site/static/tokens.css`.

**rag-web-visual-test-writer.** Strip `skills: [playwright-bowser]`. Update the generated script template in step 4 to call `./tools/scripts/capture-screenshot.sh` (the in-repo copy). Preserve the `<page>-<state>-<viewport>-<theme>.png` naming convention and the `BASE_URL` / `OUT_DIR` env-var parameterization.

---

## Step 5 — Playwright CLI surface brief (embedded in visual agents)

`rag-web-visual-reviewer` and `rag-web-visual-test-writer` each get an appended `## Playwright CLI Surface` block. The brief lives verbatim inside both agents so it survives context compaction:

```
## Playwright CLI Surface

All browser interaction runs through tools/scripts/capture-screenshot.sh which wraps
`bunx playwright` via an inline node script it emits. The authoritative
surface available to this agent:

  bunx playwright --version                  # confirm install
  bunx playwright install chromium           # idempotent browser install
  bunx playwright codegen <url>              # interactive script generation
  bunx playwright open <url>                 # launch inspector
  node <custom.js>                           # run ad-hoc Playwright scripts

  tools/scripts/capture-screenshot.sh <url> <out.png> [--full-page] [--dark]
    - Default viewport 1280x720 (override by editing the inline script)
    - --dark sets context colorScheme=dark AND injects .dark on <html>
    - --full-page captures scrollable height, not just viewport
    - Exits non-zero if the output file was not created

Never assume Chrome MCP, remote browser connections, or manual navigation
are available. If the wrapper is insufficient, extend it via a new
./tools/scripts/*.sh rather than bypassing it.
```

This surface is the complete Playwright entry point for agents in this project. No Chrome DevTools MCP integration.

---

## Step 6 — Typography delivery primer

Create `docs/dev/typography.md` with three delivery paths documented and no decision committed:

- **Path A — System fallback only.** Stack: `ui-sans-serif, system-ui, -apple-system, sans-serif` / `Georgia, serif` / `ui-monospace, Menlo, monospace`. Zero license, zero latency, no visitor-side download. This is the default until the operator chooses B or C.
- **Path B — Self-hosted woff2.** Open-source fonts only (Inter, IBM Plex, Berkeley Mono Variable per its license, etc.). Budget: 4-5 font files. `@font-face` with `font-display: swap` and `<link rel="preload" crossorigin>` for above-the-fold weights. `pyftsubset` via `uv tool install fonttools[woff]` to trim files.
- **Path C — Adobe Typekit CDN.** Unlocks Adobe CC licensed fonts: Futura Std, LT Neue Helvetica, Minion Pro, Kepler Std, Acumin Pro, Freight, Adobe Caslon Pro. License binds the fonts to the Typekit CDN — no self-hosting, no woff2 conversion. Embed via `<link rel="stylesheet" href="https://use.typekit.net/XXXXXXX.css">`. CSS uses lowercase-hyphenated slugs (`"futura-std"`), not display names. Kit ID comes from a Web Project at fonts.adobe.com.

`site/static/tokens.css` ships with Path A fallbacks applied to `--font-structure`, `--font-prose`, and `--font-mono` — overriding the library template's licensed-first defaults until the operator picks a path.

---

## Step 7 — Pi mirror entries and .gitignore

Extend `pi-agents.yaml`:

- `agents:` — four `pending` rows for `rag-web-visual-reviewer`, `rag-web-css-auditor`, `rag-web-token-enforcer`, `rag-web-visual-test-writer`.
- `settings:` — `not-applicable` row for `tools/package.json` + `tools/bun.lockb` (Node runtime is CC-workflow plumbing; Pi Agent has its own test harness).
- A new `scripts:` or `assets:` section, or an inline note — `not-applicable` for `tools/scripts/*.sh`, `site/index.html`, and `site/static/tokens.css` (harness-agnostic).

`.gitignore` additions:

```
tools/node_modules/
playwright-report/
test-results/
screenshots/
```

---

## Pi Mirror

For each CC primitive introduced or modified:

- **Name:** rag-web-visual-reviewer
  - **Pi shape:** same agent definition; Pi-runtime invocation path TBD
  - **Expected `mirror_status`:** `pending`

- **Name:** rag-web-css-auditor
  - **Pi shape:** same — pure text analysis, maximally portable
  - **Expected `mirror_status`:** `pending`

- **Name:** rag-web-token-enforcer
  - **Pi shape:** same — pure text analysis
  - **Expected `mirror_status`:** `pending`

- **Name:** rag-web-visual-test-writer
  - **Pi shape:** same generator; Pi agent emits the same bash scripts
  - **Expected `mirror_status`:** `pending`

- **Name:** tools/scripts/ (validate-tokens.sh, capture-screenshot.sh, font-check.sh)
  - **Pi shape:** shell scripts, harness-agnostic
  - **Expected `mirror_status`:** `not-applicable`
  - **Justification:** Runtime-neutral; Pi agent invokes them the same way.

- **Name:** site/index.html + site/static/tokens.css
  - **Pi shape:** publishable artifacts, no harness coupling
  - **Expected `mirror_status`:** `not-applicable`
  - **Justification:** Static content consumed by GH Pages, not by an agent harness.

- **Name:** tools/package.json + tools/bun.lockb (Playwright dev dep)
  - **Pi shape:** n/a
  - **Expected `mirror_status`:** `not-applicable`
  - **Justification:** Node runtime is CC-workflow plumbing; Pi has its own test-harness story.

---

## Acceptance criteria

- [ ] `site/index.html` and `site/static/tokens.css` land under `site/`; `./tools/scripts/validate-tokens.sh site/static/tokens.css` exits 0
- [ ] `tools/scripts/{validate-tokens.sh,capture-screenshot.sh,font-check.sh}` copied and executable
- [ ] `tools/package.json` + `tools/bun.lockb` committed with Playwright in `devDependencies` only; no `scripts` field
- [ ] `bunx playwright --version` succeeds and `./tools/scripts/capture-screenshot.sh "file://$PWD/site/index.html" /tmp/rag-web-smoke.png` produces a valid PNG
- [ ] Four `rag-web-*` agents in `.claude/agents/` with frontmatter renamed, `@playwright-bowser` references removed, and the Playwright CLI Surface block present in `rag-web-visual-reviewer` and `rag-web-visual-test-writer`
- [ ] `docs/dev/typography.md` exists with Paths A/B/C documented; no decision committed
- [ ] `pi-agents.yaml` carries four new `pending` agent rows and `not-applicable` rows for scripts, HTML/CSS, and the Playwright dev dep
- [ ] `.gitignore` excludes `tools/node_modules/` and screenshot output directories
- [ ] No `@playwright-bowser` reference remains anywhere under `.claude/agents/`
- [ ] `## Pi Mirror` section present and accurate (enforced by `/rag-web-close`)

---

## Decisions (resolved 2026-04-21)

1. **Tier** — Tier 1 only. CLAUDE.md bans SSG / framework / build tooling; Tiers 2 and 3 are ineligible.
2. **Scaffold posture** — one-shot global `/web-scaffold 1` invocation; no project-local `rag-web-web-scaffold`. Scaffold output is edited in-place (token extraction into `site/static/tokens.css`).
3. **Script handling** — copy into `./tools/scripts/`, not symlink. Local evolution is expected and intended.
4. **Browser surface** — Playwright CLI only, via `tools/scripts/capture-screenshot.sh`. No Chrome DevTools MCP. Dev-tooling approval for Playwright is carried explicitly in this plan per `CLAUDE.md`.
5. **Agent naming** — `rag-web-<library-name>`. No wrapping layer, no indirection.
6. **Font stack** — deferred. `site/static/tokens.css` ships with system-fallback defaults until the operator commits to Path B or Path C per `docs/dev/typography.md`.
