# GitHub Pages deployment skill

**Scope:** build a project-level skill (`rag-web-pages-deploy`) that owns the full GitHub Pages lifecycle — init, preflight, deploy, verify, rollback — grounded in the April 2026 spec. Ships three agents, four commands, a dated reference library, and a CI workflow. Carries explicit dev-tooling approval for `lychee` and `actionlint` per `CLAUDE.md` (no build step is added to the published site).

**Out of scope (deferred):**
- PR preview deployments (GH Pages has no first-party support as of 2026-04; branch-based workarounds deferred)
- Custom domain + DNS setup (separable workstream; reference doc authored but setup not executed)
- Lighthouse CI, `htmltest`, `html-validate` and other optional validation tooling (operator explicitly skipped)
- Pi-harness implementations (pending per `pi-agents.yaml`)
- Any change to `site/index.html` content or typography decisions (owned by plan 02 and later plans)

---

## Current ground truth

- Publishable artifacts exist at `site/index.html` and `site/static/tokens.css` (landed in plan 02).
- No `.github/workflows/` directory, no `.nojekyll` file, no GitHub Pages configuration yet.
- `.claude/` holds 2 commands and 9 agents, all `rag-web-*` prefixed.
- `pi-agents.yaml` tracks drift for all existing CC primitives as `pending`.
- `gh` CLI 2.89.0, `bun` 1.3.1, `jq` 1.8.1 present per `.the-grid/config/the-grid-SYSTEM-ENV.md`.
- `lychee` and `actionlint` are absent; installation happens in Step 1.
- Knowledge cutoff drift: cache said `actions/deploy-pages@v4` / `actions/upload-pages-artifact@v3`; live check (2026-04-21) returns `@v5.0.0` for both. Versions baked at time of writing; re-verify at APPLY.
- `actions/upload-pages-artifact@v5` ships with `include-hidden-files: false` as default — load-bearing for us because `.nojekyll` is a dotfile.

---

## Design overview

The skill is the durable theory layer. Agents are the instruments. Commands are the operator entry points. Reference docs are the dated, progressively-disclosed knowledge surface.

```
.claude/skills/rag-web-pages-deploy/   ← theory + entry points
.claude/agents/rag-web-pages-*         ← three mechanical / advisory agents
.claude/commands/rag-web-pages-*       ← four user-invocable /commands
docs/dev/pages/                        ← thin pointer + operator runbook location
.github/workflows/deploy-pages.yml     ← instantiated from skill template
site/.nojekyll                         ← required; inside site/ because site/ is the artifact root
```

The skill owns the *why*; the agents and commands own the *how*; the workflow owns the *when*.

---

## Step 1 — Pre-requisites

Install via Homebrew on `the-grid`:

```bash
brew install lychee actionlint
```

- `lychee` — link checker; used by preflight agent and by the CI preflight job. Local and CI runs invoke the same binary with the same flags.
- `actionlint` — GitHub Actions workflow linter; used by preflight to catch YAML or expression errors before a push triggers a failing run.

No Node dev deps added. No change to `tools/package.json`. No build step. CLAUDE.md build-tooling ban honored.

Operator skipped: `htmltest`, `html-validate`, Lighthouse CI. Preflight degrades silently if those are absent — the agent checks each binary before invoking it.

---

## Step 2 — Skill scaffold

Create `.claude/skills/rag-web-pages-deploy/` with this tree:

```
rag-web-pages-deploy/
├── SKILL.md
├── reference/
│   ├── github-pages-spec-apr2026.md
│   ├── workflow-authoring.md
│   ├── preflight-checklist.md
│   ├── postflight-checklist.md
│   ├── rollback-runbook.md
│   ├── custom-domain-setup.md
│   └── troubleshooting.md
└── templates/
    ├── deploy-pages.yml
    └── nojekyll        # empty file; operator copies to site/.nojekyll
```

`SKILL.md` frontmatter:

```yaml
---
name: rag-web-pages-deploy
description: GitHub Pages lifecycle for rag-web — init, preflight, deploy, verify, rollback. April 2026 spec.
effort: medium
allowed-tools: Read, Grep, Glob, Bash, WebFetch
---
```

`SKILL.md` body, ≤200 lines, Naur-voice:

1. **Theory of the deployment target** — GH Pages is a static-file hosting surface served from a git-native artifact. Two publishing modes exist; we use Actions because our artifact root is `site/` (branch-mode supports only root or `/docs`). The skill exists because the April-2026 spec has a staleness clock and a rag-web session that needs it cold should be able to pick it up in one read.
2. **When to invoke** — auto-load when the operator touches `site/`, `.github/workflows/`, or `site/.nojekyll`; user-invoke via the four `/rag-web-pages-*` commands.
3. **Entry points** — a table mapping operator intent → command → agent → reference doc.
4. **Pointers** into `reference/` with one-line descriptions and staleness markers.

No step-by-step workflows in SKILL.md itself — those live in the reference docs so they rot on a schedule we control.

---

## Step 3 — Reference documentation

Seven files under `reference/`. Each opens with a `verified:` line and a re-verification cadence.

| File | Owns |
|---|---|
| `github-pages-spec-apr2026.md` | Current major versions of `actions/deploy-pages`, `actions/upload-pages-artifact`, `actions/configure-pages`, `actions/checkout`. Permissions shape. Environment name. Concurrency group doctrine. Deploy-from-branch vs Actions trade-off. PR-preview posture. Re-verify every 90 days. |
| `workflow-authoring.md` | Line-by-line commentary on `templates/deploy-pages.yml`: why each job exists, why each step exists, what each permission buys, why `cancel-in-progress: false`, why `include-hidden-files: true` is load-bearing. |
| `preflight-checklist.md` | The checks the preflight agent runs, in order, with pass/fail criteria and remediation hints for each. Matches the CI preflight job exactly — same tool invocations, same flags. |
| `postflight-checklist.md` | The checks the verify agent runs against the live URL. Content-hash spot-check, HTTPS assertion, 404 probes on known assets, serving-version identification via `x-served-by` / commit-SHA header (if exposed). |
| `rollback-runbook.md` | Operator-facing procedure: list recent deployments via `gh api /repos/{owner}/{repo}/pages/deployments`, identify last-known-good candidate, execute rollback via the Pages UI or `gh` call. The advisor agent produces a proposal; operator executes. |
| `custom-domain-setup.md` | DNS + `CNAME` file + HTTPS-enforcement steps for when the operator decides to attach a custom domain. Out-of-scope for v1 execution but documented so the path exists when needed. |
| `troubleshooting.md` | Failure-mode catalogue: Jekyll processing kicked in despite `.nojekyll` (missing dotfile flag), artifact empty (wrong `path:` value), 404 on published URL (Pages environment not configured), HTTPS cert pending (24-hour propagation), concurrency collision. |

---

## Step 4 — Workflow template

`.claude/skills/rag-web-pages-deploy/templates/deploy-pages.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'site/**'
      - '.github/workflows/deploy-pages.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  preflight:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install preflight tools
        run: |
          set -euo pipefail
          curl -sSL https://github.com/lycheeverse/lychee/releases/latest/download/lychee-x86_64-unknown-linux-gnu.tar.gz | sudo tar -xz -C /usr/local/bin lychee
          curl -sSL https://github.com/rhysd/actionlint/releases/latest/download/actionlint_linux_amd64.tar.gz | sudo tar -xz -C /usr/local/bin actionlint
      - name: Lint workflow
        run: actionlint .github/workflows/deploy-pages.yml
      - name: Validate tokens
        run: ./tools/scripts/validate-tokens.sh site/static/tokens.css
      - name: Verify .nojekyll
        run: test -f site/.nojekyll
      - name: Check links (offline)
        run: lychee --offline --no-progress --verbose site/

  deploy:
    needs: preflight
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v5
        with:
          path: site/
          include-hidden-files: true
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

Action majors (`actions/configure-pages@v5`, `actions/checkout@v4`) are cross-referenced to `reference/github-pages-spec-apr2026.md`; that file is the single source of truth and gets re-verified before every quarterly rollover.

`templates/nojekyll` is an empty file.

---

## Step 5 — Agents

Three agents in `.claude/agents/`, `rag-web-*` prefixed.

**`rag-web-pages-preflight.md`**

```yaml
---
name: rag-web-pages-preflight
description: Pre-deploy gate for rag-web GitHub Pages. Runs the checklist, reports pass/fail by gate, exits non-zero on any hard failure. Invoked by /rag-web-pages-check and by the CI preflight job.
model: sonnet
effort: medium
tools: Read, Bash, Grep, Glob
---
```

Body: follows `reference/preflight-checklist.md` exactly. Each gate has a binary pass/fail; the agent reports structured output. No judgment calls — mechanical.

**`rag-web-pages-verify.md`**

```yaml
---
name: rag-web-pages-verify
description: Post-deploy verification for rag-web GitHub Pages. Fetches live URL, checks canonical content, HTTPS, expected assets. Reports divergence between committed state and served state.
model: sonnet
effort: medium
tools: Read, Bash, WebFetch, Grep
---
```

Body: follows `reference/postflight-checklist.md`. Invoked by `/rag-web-pages-deploy` after workflow completion.

**`rag-web-pages-rollback-advisor.md`**

```yaml
---
name: rag-web-pages-rollback-advisor
description: Read-only rollback advisor for rag-web GitHub Pages. Lists recent deployments, cross-references session summaries for last-known-good, proposes a rollback target. Never executes — operator runs the gh command.
model: opus
effort: high
tools: Read, Bash, Grep, Glob
---
```

Body: follows `reference/rollback-runbook.md`. Opus + `effort: high` because rollback decisions are judgment-heavy, infrequent, and happen on the operator's worst day. Per-invocation cost is trivial against the quality lift.

---

## Step 6 — Commands

Four commands in `.claude/commands/`, `rag-web-*` prefixed. Each is a thin wrapper with explicit contracts.

**`/rag-web-pages-init`** — one-time setup. Scaffolds `.github/workflows/deploy-pages.yml` from the skill template, creates `site/.nojekyll`, prints the GitHub-UI checklist the operator completes manually (enable Pages, set source = GitHub Actions, configure environment protection). **Writes files; does not push.**

**`/rag-web-pages-check`** — invokes `rag-web-pages-preflight` agent. Read-only. Safe to run any time.

**`/rag-web-pages-deploy`** — confirms clean git working tree, confirms preflight passes locally, pushes to `main` (or invokes `gh workflow run`), tails the workflow run via `gh run watch`, invokes `rag-web-pages-verify` on completion. **Refuses to proceed on dirty tree.** Never auto-commits.

**`/rag-web-pages-rollback`** — invokes `rag-web-pages-rollback-advisor`, presents the rollback proposal with the exact `gh` command, waits for operator. **Never executes.**

Each command's frontmatter:

```yaml
---
description: <one-line purpose>
allowed-tools: Read, Bash, Grep, Glob
effort: medium
---
```

---

## Step 7 — Project integration

- `site/.nojekyll` — empty file committed alongside `site/index.html`.
- `.github/workflows/deploy-pages.yml` — instantiated from the skill template.
- `docs/dev/pages/README.md` — thin pointer doc:
  - "Authoritative reference lives at `.claude/skills/rag-web-pages-deploy/reference/`. Start there."
  - Operator runbook quick links for rollback and troubleshooting.
- `pi-agents.yaml` additions:
  - `commands:` — four new rows, `mirror_status: pending`.
  - `agents:` — three new rows, `mirror_status: pending`.
  - `skills:` — new section (first skill entry); one row for `rag-web-pages-deploy`, `mirror_status: pending`.
  - `assets:` — one row for `.github/workflows/deploy-pages.yml`, `mirror_status: not-applicable` (GitHub infrastructure, harness-agnostic).
  - `assets:` — one row for `site/.nojekyll`, `mirror_status: not-applicable`.
- `.gitignore` additions: none — no new ignorable artifacts introduced.

---

## Step 8 — GitHub repository configuration (operator)

Not automated; surfaced by `/rag-web-pages-init` as a checklist printed to terminal.

1. Repository Settings → Pages → Source: **GitHub Actions**.
2. Repository Settings → Environments → `github-pages` → Deployment protection rules:
   - Required reviewers: *(operator choice; default: self)*
   - Deployment branches: `main` only.
3. Repository Settings → Actions → General → Workflow permissions: **Read and write** (needed for `pages: write`).
4. First successful run establishes the `github-pages` environment record and enables rollback surface.

---

## Pi Mirror

For each CC primitive introduced:

- **Name:** `rag-web-pages-deploy` (skill)
  - **Pi shape:** Pi supports skills natively; same directory + SKILL.md + reference/ structure. Reference content is harness-agnostic.
  - **Expected `mirror_status`:** `pending`

- **Name:** `/rag-web-pages-init`, `/rag-web-pages-check`, `/rag-web-pages-deploy`, `/rag-web-pages-rollback`
  - **Pi shape:** Same command-body logic; invocation path differs by harness.
  - **Expected `mirror_status`:** `pending` (×4)

- **Name:** `rag-web-pages-preflight`, `rag-web-pages-verify`, `rag-web-pages-rollback-advisor`
  - **Pi shape:** Same agent definitions; pure shell + `gh` + `lychee` / `WebFetch` / filesystem — runtime-portable.
  - **Expected `mirror_status`:** `pending` (×3)

- **Name:** `.github/workflows/deploy-pages.yml`
  - **Pi shape:** n/a
  - **Expected `mirror_status`:** `not-applicable`
  - **Justification:** GitHub Actions workflow; executes on GitHub's runners regardless of which agent harness authored it.

- **Name:** `site/.nojekyll`
  - **Pi shape:** n/a
  - **Expected `mirror_status`:** `not-applicable`
  - **Justification:** Static marker file consumed by GitHub's Pages builder.

---

## Acceptance criteria

- [ ] `lychee` and `actionlint` installed via `brew`; both resolve on `PATH`.
- [ ] `.claude/skills/rag-web-pages-deploy/` exists with `SKILL.md`, 7 reference files, and 2 template files.
- [ ] `SKILL.md` is ≤200 lines and opens with a Naur-voice theory-of-the-target paragraph.
- [ ] Every `reference/*.md` opens with a `verified: 2026-04-21` line and a re-verify cadence.
- [ ] 3 agents exist under `.claude/agents/rag-web-pages-*.md` with spec-correct frontmatter (`model`, `effort`, `tools`, `description`).
- [ ] 4 commands exist under `.claude/commands/rag-web-pages-*.md` with spec-correct frontmatter.
- [ ] `.github/workflows/deploy-pages.yml` exists, passes `actionlint`, uses `actions/upload-pages-artifact@v5` with `include-hidden-files: true` and `actions/deploy-pages@v5`.
- [ ] `site/.nojekyll` exists and is empty.
- [ ] `docs/dev/pages/README.md` exists and points at the skill's reference library.
- [ ] `pi-agents.yaml` carries 1 skill row, 4 command rows, 3 agent rows (all `pending`) and 2 asset rows (`not-applicable`).
- [ ] First end-to-end dry run: `/rag-web-pages-check` passes locally; pushing a trivial change triggers the workflow; `/rag-web-pages-deploy` invokes `verify` and reports pass.
- [ ] `## Pi Mirror` section above is accurate (enforced by `/rag-web-close`).
- [ ] No `@playwright-bowser` or other dead-reference strings appear anywhere under `.claude/skills/rag-web-pages-deploy/`.

---

## Decisions (resolved 2026-04-21)

1. **Publishing surface** — GitHub Actions workflow, not deploy-from-branch. Branch mode supports only root or `/docs`; our artifact root is `site/`.
2. **Custom domain** — deferred. Reference doc written; DNS/CNAME/HTTPS setup not executed in v1.
3. **PR preview deployments** — out of scope for v1. GitHub Pages has no first-party support as of 2026-04; branch-based workarounds add environment complexity disproportionate to current content volume.
4. **Rollback autonomy** — operator-gated only. The advisor agent proposes; the operator executes. Consistent with the project-wide "never auto-commit" posture.
5. **Skill structure vs agent-only** — skill structure adopted. Progressive disclosure for the dated spec, durable theory surface for future sessions, locality for the runbook cluster.
6. **Optional validation tooling** — operator skipped. No `htmltest`, no `html-validate`, no Lighthouse CI in v1. Preflight degrades silently when optional binaries are absent.
7. **Pre-requisites** — `lychee` and `actionlint` approved as system-level dev tools (brew install); no npm/bun dev deps added; no site-build step introduced.
8. **Action versions** — `actions/deploy-pages@v5` and `actions/upload-pages-artifact@v5` per 2026-04-21 live check. Documented in `reference/github-pages-spec-apr2026.md`; re-verify cadence 90 days.
9. **`include-hidden-files: true`** — load-bearing. Required by `upload-pages-artifact@v5` to include `site/.nojekyll` in the artifact. Without it, Jekyll processing kicks in and mangles the hand-written HTML.
10. **Commands at `.claude/commands/`, not `.claude/skills/`** — project convention (prime, close) retained. Claude-code-guide's "commands deprecated" framing not adopted; user-invocable `/` entry points stay in `commands/` for consistency.
11. **Agent model + effort tuning** — preflight and verify: sonnet + `effort: medium` (mechanical gates). Rollback advisor: opus + `effort: high` (judgment-heavy, infrequent, high-stakes).
