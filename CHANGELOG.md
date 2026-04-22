# Changelog

All notable changes to the Ronin Advisory Group website project.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Pi harness parity for the four docs-writer agents (`changelog`, `dev`, `user`, `agent`). Dual orchestrators — CC-side `/rag-web-pi-close` and Pi-side `.pi/extensions/rag-web-team.ts` — allow the constellation to run from either harness; the extra-time path (paid Pi credits) now has an escape hatch. Tool allowlists (`read,grep,find,ls,write,edit`) and session-start git checkpoints (`pi-checkpoint` commits) enforce safety. See `docs/dev/plans/04-pi-harness-bringup.md` for the detailed design and acceptance criteria.
- `drive` skill installed globally at `~/.claude/skills/drive/` with end-to-end verification (headless + screenshot smoke tests), making tmux-session orchestration available to all projects. Wrapped in `tools/scripts/rag-web-install-drive.sh` for re-runnable setup.
- Dev-loop-vs-publish separation inside `tools/`: Playwright and preview-server are explicit dev tools that never produce output shipped to Pages. Approvals tracked in commit messages and `pi-agents.yaml`, making the "no build tooling without explicit approval" rule legible in practice.
- `tools/preview/main.go` + `go.mod` — stdlib-only HTTP file server over `site/`. Binds 0.0.0.0:8080 by default; `HOST=127.0.0.1` for laptop-only access. Prints loopback and LAN URLs on startup, enabling rapid local iteration without a separate build step.
- `tools/scripts/preview.sh` — pidfile-backed daemon wrapper (start | stop | status | restart | logs) for the preview server. Operators use `/rag-web-preview` command; script is the mechanical layer.
- `/rag-web-preview` slash command — entry point for preview-server lifecycle. Operator chooses start/stop/status/restart/logs; command maps to the script.
- `/rag-web-prime` reads doctrine from `docs/agent/` — every `.md` file in that directory is now primed into the session, surfacing agent doctrine alongside the project theory. Prime output includes a fifth axis: preview-server status.
- `pi-agents.yaml` — dual-harness tracking row for `rag-web-preview` (pending Pi mirror) and `rag-web-preview-server` (not-applicable, Go binary). Scope for `rag-web-scripts` extended to include `preview.sh`.
- `.gitignore` entries for `.the-grid/preview.pid` and `.the-grid/preview.log`, keeping daemon ephemera out of version control.
- Three-way session contract: `CLAUDE.md` owns the durable theory (role, rules, antipatterns); `/rag-web-prime` reports ground truth; `/rag-web-close` orchestrates and gates commits. No layer carries content that belongs to another.
- `/rag-web-prime` establishes that a session begins by reading the world, not by guessing it — four project-tuned axes (harness parity, content, publishing, work state) replace the generic four.
- `/rag-web-close` formalizes the end-of-session split between read/orchestrate (agent) and write (operator); commit authority is never delegated.
- Named antipatterns (`Inventorial CLAUDE.md`, `Cross-harness drift`, `Auto-commit on close`) give the team a shared vocabulary for the failure modes this project has already survived once.
- `pi-agents.yaml` makes dual-harness drift a tracked artifact rather than a hope — every `.claude/` primitive carries an explicit `mirror_status` row the next close can count.
- Documentation layer expressed as five Naur-informed writer agents (`rag-web-docs-{dev,user,agent,changelog,vault-exporter}-writer`), each owning one audience and recording theory-shifts rather than file diffs.
- Site scaffold commits the project to hand-written HTML with an OKLch design-token contract (`site/index.html`, `site/static/tokens.css`) — the token file is the single source of color, space, and typographic scale.
- Visual QA runs through Playwright CLI via `tools/scripts/capture-screenshot.sh`, which is the only sanctioned browser surface; agents that need a viewport go through that one script or extend it.
- Four quality-gate agents (`rag-web-visual-reviewer`, `rag-web-css-auditor`, `rag-web-token-enforcer`, `rag-web-visual-test-writer`) encode the design-system invariants the tokens assert, so token drift becomes a reviewable signal instead of a slow accident.
- Typography primer (`docs/dev/typography.md`) frames three delivery paths — system fallback (A), self-hosted woff2 (B), Adobe Typekit CDN (C) — and ships Path A as the launch default with the final choice held open for the operator.
- First project-level skill (`rag-web-pages-deploy`) establishes a new agentic vocabulary layer: skills own *why* (durable theory + staleness-tracked specs), agents own *how* (mechanical instruments), commands own *when* (operator entry points). Moves deployment from a gap to a gated, pre-flight-twice lifecycle.
- Deployment surface admits GitHub Actions with operator-controlled, read-only rollback — the skill scaffolds `.github/workflows/deploy-pages.yml`, three agents (preflight/verify/advisor), and four commands (`/rag-web-pages-{init,check,deploy,rollback}`). Continuation of the "never auto-commit" posture: advisor agent proposes; operator executes.
- Reference documentation pattern — dated spec files (`verified: 2026-04-21`) with explicit re-verify cadences, acknowledging that GitHub action majors drift (`deploy-pages` v4→v5, April 2026). Future sessions pick up the skill cold via this progressively-disclosed knowledge surface.
- `site/.nojekyll` (empty file) disables Jekyll processing on GitHub Pages; required to preserve hand-written HTML. Presence is load-bearing in `actions/upload-pages-artifact@v5` with `include-hidden-files: true`.

### Changed

- Project environment moves from "no harness contract" to "read-only prime, adaptive close"; sessions now open and close against the same shape instead of reinventing each time.
- Frontend tooling posture: Playwright is admitted as a dev dependency (explicit carve-out from the CLAUDE.md no-build-tooling rule) on the condition that nothing it produces ships to GitHub Pages.

### Deferred

- Pi-harness implementations for every `rag-web-*` agent and command — tracked as `pending` rows in `pi-agents.yaml`; the decision is "prove the Claude Code shape first," not "Claude Code only."
- Final font stack — documented as a three-path decision in `docs/dev/typography.md` with the operator's choice held open.

---

[Unreleased]: https://github.com/ronin-advisory/website/commits/main
