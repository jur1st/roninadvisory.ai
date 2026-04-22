# Agents — the `rag-web-*` registry

Nine agents live under [`.claude/agents/`](../../.claude/agents/), with Pi mirrors for four of them under [`.pi/agents/`](../../.pi/agents/). They fall into two groups by the work they perform: documentation-layer writers, which author text about the project, and quality-gate agents, which inspect the project's output. The groups are governed differently — writers are dispatched automatically by [`/rag-web-close`](commands.md) based on what changed; gates are invoked explicitly by the operator or by a skill against a named target.

Every agent is prefixed `rag-web-*`. The prefix is not decoration. It scopes the project's primitives so that a global or sibling-project agent with the same role does not shadow them. See the **Namespacing** section of [`conventions.md`](conventions.md).

---

## Documentation-layer writers

These agents transmit the project's theory in prose — Naur's framing applied literally. Each writes to a specific surface (`docs/dev/`, the site itself, `docs/agent/`, `CHANGELOG.md`, or the Obsidian vault). [`/rag-web-close`](commands.md) dispatches them adaptively based on the session's diff.

The four parallel writers (`changelog`, `dev`, `user`, `agent`) are `mirror_status: shipped` on both harnesses. The Pi mirrors live at `.pi/agents/rag-web-docs-{changelog,dev,user,agent}-writer.md` with matching writable-path contracts and tool allowlist `read,grep,find,ls,write,edit` — no `bash`. No `model:` field appears in the Pi agent frontmatter; model routing is handled at launch time by `.pi/profiles/<profile>.json`. The vault-exporter has no Pi mirror yet (`pending`); it waits on vault standup.

### [`rag-web-docs-dev-writer`](../../.claude/agents/rag-web-docs-dev-writer.md)

Writes developer-facing documentation under `docs/dev/` — architecture, authoring conventions, the token contract, Playwright CLI visual QA, the contributing workflow. Model: `sonnet`, background. Invoked by `/rag-web-close` when source or content files change.

### [`rag-web-docs-user-writer`](../../.claude/agents/rag-web-docs-user-writer.md)

Authors visitor-facing site copy — HTML page content, about/services/contact sections, public voice — and content-strategy notes under `docs/user/`. Hand-written HTML/CSS only, no SSG, no client-side JavaScript. Model: `sonnet`, background. Invoked by `/rag-web-close` when the visitor-facing surface changes; typically dispatched alongside `rag-web-docs-dev-writer` because visitor changes usually have developer-visible effects.

### [`rag-web-docs-agent-writer`](../../.claude/agents/rag-web-docs-agent-writer.md)

Writes documentation about the agentic layer under `docs/agent/` — the command contract, the agent registry, harness parity, conventions. Reads `.claude/`, `CLAUDE.md`, `pi-agents.yaml`, `docs/dev/plans/`. Curates `CLAUDE.md` without inflating it. Model: `sonnet`, background. Invoked by `/rag-web-close` when `.claude/` configuration changes. This file is an instance of its output.

### [`rag-web-docs-changelog-writer`](../../.claude/agents/rag-web-docs-changelog-writer.md)

Maintains `CHANGELOG.md` in Keep-a-Changelog format. Reads `git log` and diffs, curates entries — never a dump. Each entry records how the theory of the system shifted, not which files moved. Model: `haiku`, background. Invoked by `/rag-web-close` on any net change to the repo.

### [`rag-web-docs-vault-exporter`](../../.claude/agents/rag-web-docs-vault-exporter.md)

Exports finalized docs to the operator's Obsidian vault via the `obsidian` CLI. No-ops silently when no vault is configured. Model: `sonnet`, background. Invoked by `/rag-web-close` **last**, sequentially after the other four writers, because it consumes their output. The vault is the project's theory-transmission surface with the strongest affordances — MOC, wikilinks, YAML properties — but it is downstream of the doc corpus, not a substitute for it.

---

## Quality-gate agents

These agents do not author documentation. They inspect the project's output against a contract — a design-token catalog, a sophistication rubric, a screenshot plan — and report. They are invoked explicitly by the operator or by a skill working on a named target, never by `/rag-web-close`. The authoring loop runs on human (or primary-agent) initiative; the close command does not impose quality gates at the session boundary because quality gates belong inside the edit loop, not at its end.

### [`rag-web-visual-reviewer`](../../.claude/agents/rag-web-visual-reviewer.md)

Scores the live rag-web UI against the 25-point Darko Labs sophistication rubric. Drives Playwright CLI via `tools/scripts/capture-screenshot.sh`. Model: `opus`, foreground — this agent runs interactively because the rubric's judgment is load-bearing and a background run would bury the verdict. Invoked by the operator after a visual change, or by the `web-frontend` skill as part of an authoring loop.

### [`rag-web-css-auditor`](../../.claude/agents/rag-web-css-auditor.md)

Pattern-matches CSS against the token contract defined in `site/static/tokens.css`. Enforces the three-line semantic-color fallback pattern (static fallback → token → `light-dark()`). Model: `sonnet`, background. Invoked by the operator or by a skill against specific CSS files; not automatically triggered by `/rag-web-close`.

### [`rag-web-token-enforcer`](../../.claude/agents/rag-web-token-enforcer.md)

Catches hardcoded CSS values and suggests the corresponding design token from `site/static/tokens.css`. The companion to `rag-web-css-auditor` — where the auditor checks fallback shape, the enforcer checks value provenance. Model: `sonnet`, background. Invoked by the operator or by a skill against specific CSS files.

### [`rag-web-visual-test-writer`](../../.claude/agents/rag-web-visual-test-writer.md)

Generates bash scripts that capture a systematic set of Playwright CLI screenshots for a rag-web page via `tools/scripts/capture-screenshot.sh`. Writes scripts, not images — the scripts are the reproducible artifact. Model: `sonnet`, background. Invoked by the operator when setting up a new page's visual-test coverage.

---

## Deployment-pipeline agents

These agents own the GitHub Pages deployment lifecycle. They are dispatched by the `/rag-web-pages-*` commands, not by `/rag-web-close`. They are the instruments; the skill [`rag-web-pages-deploy`](../../.claude/skills/rag-web-pages-deploy/SKILL.md) is the durable theory surface above them. See [`commands.md`](commands.md) for the command contracts and `docs/agent/` for the skill layer documented in that file.

The pipeline has two mechanical agents and one advisory agent. The distinction is load-bearing: mechanical agents run gates and report facts; the advisory agent synthesizes a judgment and proposes an operator action. Model and effort reflect this split.

### [`rag-web-pages-preflight`](../../.claude/agents/rag-web-pages-preflight.md)

Pre-deploy gate. Runs the checklist from `reference/preflight-checklist.md` in order — `.nojekyll` presence, `actionlint` lint, token-script validation, `include-hidden-files: true` flag in the workflow, `lychee` offline link check. Each gate is binary: pass or fail. No judgment, no proposed fixes. A missing required binary (`lychee`, `actionlint`) is a hard failure, not a skip. Model: `sonnet`, `effort: medium`. Invoked by `/rag-web-pages-check` and by the CI preflight job; both invocations run the same gates against the same binaries.

### [`rag-web-pages-verify`](../../.claude/agents/rag-web-pages-verify.md)

Post-deploy verification. Fetches the live URL via `gh api`, runs the gates from `reference/postflight-checklist.md` — HTTPS, canonical content, asset resolution, CDN-lag tolerance. Reports divergence between committed state and served state. Retries once after 60 seconds if stale content is detected (CDN lag is common in the first minute). If staleness persists past five minutes, reports a real failure and includes the run SHA for diagnosis. Model: `sonnet`, `effort: medium`. Invoked by `/rag-web-pages-deploy` after the workflow run completes; never invoked standalone by `/rag-web-close`.

### [`rag-web-pages-rollback-advisor`](../../.claude/agents/rag-web-pages-rollback-advisor.md)

Read-only rollback proposer. Lists recent Pages deployments via `gh api`, cross-references session summaries in `.the-grid/sessions/summaries/` to find the last-known-good SHA (the most recent entry with a `rag-web-pages-verify` PASS record), identifies the bad deploy, and produces a proposal with two execution paths — Pages UI re-run, or `gh workflow run` targeting the good SHA. Never executes either path; the proposal is the deliverable. When the data is ambiguous (no clean verify record exists), reports the ambiguity explicitly rather than guessing. Model: `opus`, `effort: high`. The model/effort mismatch with preflight and verify is intentional: rollback happens on the operator's worst day and the quality lift justifies the per-invocation cost.

---

## Dispatch rules — what runs when

The full dispatch contract lives in `/rag-web-close`; this is the registry-level summary. Group writers dispatch in parallel; `rag-web-docs-vault-exporter` runs sequentially after.

| Trigger | Dispatched by | Agents invoked |
|---|---|---|
| Source or content files changed | `/rag-web-close` | `rag-web-docs-dev-writer` |
| Visitor-facing surface changed | `/rag-web-close` | `rag-web-docs-user-writer`, `rag-web-docs-dev-writer` |
| `.claude/` config changed | `/rag-web-close` | `rag-web-docs-agent-writer` |
| Any net change to the repo | `/rag-web-close` | `rag-web-docs-changelog-writer` |
| After the above, vault configured | `/rag-web-close` | `rag-web-docs-vault-exporter` |
| CSS file authored or edited | operator / `web-frontend` skill | `rag-web-css-auditor`, `rag-web-token-enforcer` |
| Visual change landed | operator / `web-frontend` skill | `rag-web-visual-reviewer` |
| New page needs screenshot coverage | operator | `rag-web-visual-test-writer` |
| Pre-deploy gate | `/rag-web-pages-check`, CI preflight job | `rag-web-pages-preflight` |
| Post-deploy verification | `/rag-web-pages-deploy` (after workflow success) | `rag-web-pages-verify` |
| Rollback proposal | `/rag-web-pages-rollback` | `rag-web-pages-rollback-advisor` |

Every agent in this registry has a corresponding entry in [`pi-agents.yaml`](../../pi-agents.yaml). The three deployment-pipeline agents and `rag-web-docs-vault-exporter` are all `mirror_status: pending` — their Pi mirrors are owed. A new agent added under `.claude/agents/` without a matching entry is a cross-harness-drift violation; see [`harness.md`](harness.md).

## Pi orchestration layer

The writers constellation is dispatched in two ways depending on which harness the operator is in:

| Harness | Orchestrator | Fanout mechanism |
|---|---|---|
| Claude Code | [`/rag-web-pi-close`](../../.claude/commands/rag-web-pi-close.md) | CC command writes `/tmp/rag-web-pi-task.prompt`, execs `tools/scripts/rag-web-pi-team.sh` |
| Pi TUI | [`/rag-web-team`](../../.pi/extensions/rag-web-team.ts) | Pi extension registers the command; spawns four `pi --no-extensions` subprocesses with in-TUI grid widget |

Both paths issue a pre-fanout git checkpoint (`git commit --allow-empty -m "pi-checkpoint: ..."`) before spawning writers. Subprocess Pi runs pass `--no-extensions`, bypassing the interactive-session `.pi/extensions/rag-web-checkpoint.ts`; both orchestrators issue their own checkpoint to cover this gap. See [`conventions.md`](conventions.md) for the full three-layer safety contract.

Both orchestrators aggregate per-agent logs under `.the-grid/pi-runs/<ISO-timestamp>/`. The `/rag-web-pi-close` CC command reads those logs and surfaces failures in plain prose; the Pi extension displays agent status in a live 2x2 grid widget during fanout.
