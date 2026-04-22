# Changelog

All notable changes to the Ronin Advisory Group website project.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Plan 05 — full Pi harness parity.** The dual-harness doctrine is now operational across the entire `rag-web-*` agentic surface, not just the writers. Four quality-gate agents (`rag-web-{css-auditor,token-enforcer,visual-reviewer,visual-test-writer}`) and three deploy-pipeline agents (`rag-web-pages-{preflight,verify,rollback-advisor}`) ship with Pi mirrors at `.pi/agents/`. Seven slash commands (`/rag-web-prime`, `/rag-web-close`, `/rag-web-pages-{init,check,deploy,rollback}`, `/rag-web-preview`) ship as three topic-grouped Pi extensions (`.pi/extensions/rag-web-{session,pages,preview}.ts`) per plan-05 Decision 2. Damage-control extension (`.pi/extensions/rag-web-damage-control.ts`) closes the interactive-TUI safety layer for bash-enabled agents. Gemini profile (`.pi/profiles/gemini.json`) landed alongside Anthropic and OpenRouter once `GEMINI_API_KEY` was configured. Only `rag-web-docs-vault-exporter` remains `mirror_status: pending`, explicitly deferred to Obsidian vault standup.
- Pi harness parity for the four docs-writer agents (`changelog`, `dev`, `user`, `agent`). Dual orchestrators — CC-side `/rag-web-pi-close` and Pi-side `.pi/extensions/rag-web-team.ts` — allow the constellation to run from either harness; the extra-time path (paid Pi credits) now has an escape hatch. Tool allowlists (`read,grep,find,ls,write,edit`) and session-start git checkpoints (`pi-checkpoint` commits) enforce safety. See `docs/dev/plans/04-pi-harness-bringup.md` for the detailed design and acceptance criteria.
- `drive` skill installed globally at `~/.claude/skills/drive/` with end-to-end verification (headless + screenshot smoke tests), making tmux-session orchestration available to all projects. Wrapped in `tools/scripts/rag-web-install-drive.sh` for re-runnable setup.
- Typekit kit integration (kit dwr4eme): Adobe licensed families freight-text-pro, freight-display-pro, and acumin-pro wired as the typographic enhancement to the fallback stack (Path C). Graded substitutes remain; the kit is the first-choice render path for the editorial register.
- `site/CNAME` binding `roninadvisory.ai` to the GitHub Pages artifact — survives the legacy→workflow source flip.
- Archive of the 2025 placeholder site (`docs/dev/mockups/_archive/legacy-placeholder/`): original index.html, logo.png, and provenance README preserve the firm's genesis prose and visual identity as an origin statement, not erased by the rewrite.

### Changed

- Copy refinement on the cover: eyebrow shifted to "A Technical Consulting Practice"; lede trimmed to "The firm publishes its thinking" (removed redundant signposting); principal title now "John Benson, Esq."
- `site/index.html` carries the 2025 placeholder prose as an invisible HTML comment above `<main>`, preserving continuity of the firm's origin statement in the codebase.
- GitHub Actions preflight hardened: replaced hand-rolled curl|tar install with `taiki-e/install-action` for robust cargo-binstall fallback, then switched to purpose-built marketplace actions (`reviewdog/action-actionlint@v1`, `lycheeverse/lychee-action@v2`) to avoid install-action's transient binary-availability edge case. Three CI iterations before stabilization.
- GitHub Pages source flipped from legacy Settings to Actions workflow mode via gh API, completing the operator-gated deploy pipeline.
- Capture-screenshot wrapper: fixed `data-theme` attribute binding for dark-mode captures. Old behavior injected `.dark` class while the site's inline theme script reads the `data-theme` attribute, so `--dark` captures were never actually entering dark mode — they were colorScheme-hinted light shots. Both light and dark now pinned explicitly for determinism. Added `--viewport WxH` and `--scale N` flags (deviceScaleFactor), making the wrapper sufficient for multi-viewport visual review without ad-hoc sibling scripts; `visual-reviewer.md` drops the "author an ad-hoc script if wrapper is insufficient" escape hatch, and `capture-screenshot.sh` is now the single call site for all browser surfaces.
- Token catalog replaced: `site/static/tokens.css` now carries the editorial contract. Semantic color family expanded (ink, paper, ink-muted, rule, mark, surface, ink-soft), state tokens removed, spacing scale and type tokens aligned to editorial proportions. Tier-1 canonical aliases (`--color-text`, `--color-bg`, `--color-accent`) route to editorial tokens via `var()`.
- `docs/dev/` corpus rewritten to match the editorial contract: `tokens.md` (token catalog), `typography.md` (paths committed), `architecture.md` (color pressure count updated), `authoring.md` (new token names and editorial voice), `contributing.md` (plan list extended). Naur-voice preserved across all updates.
- `docs/agent/conventions.md` extended with a "design-system contract" section recording the canonical token catalog and the three quality-gate agents that enforce it.
- Quality-gate and doc-writer agents audited for token-name drift against the new catalog. `rag-web-token-enforcer` carried a stale pixel-to-token map (`--space-12` / `--space-16` / `--space-20` / `--space-24` no longer exist in the editorial catalog, and existing `--space-N` pixel values had shifted) — corrected in place. The other four agents (`rag-web-css-auditor`, `rag-web-visual-reviewer`, `rag-web-docs-dev-writer`, `rag-web-docs-user-writer`) verified clean — token-contract references are path-only, not name-hardcoded.
- Project environment moves from "no harness contract" to "read-only prime, adaptive close"; sessions now open and close against the same shape instead of reinventing each time.
- Frontend tooling posture: Playwright is admitted as a dev dependency (explicit carve-out from the CLAUDE.md no-build-tooling rule) on the condition that nothing it produces ships to GitHub Pages.

### Removed

- State tokens from the canonical catalog (`--color-success`, `--color-warning`, `--color-error`). The editorial palette is disciplined to two inks plus one accent; state colors are YAGNI until a consumer page needs one.

### Deferred

- `rag-web-docs-vault-exporter` Pi mirror — the only remaining `mirror_status: pending` entry in `pi-agents.yaml`, waiting on Obsidian vault standup.

### Added (prior sessions)

- Design-system lock-in: the site's visual direction resolved to the editorial-masthead register (mockup A promoted to `site/`). The token catalog rewritten from the Tier-1 scaffold (blue accent, state colors) to the editorial contract — two-ink palette (deep ink + warm paper) with oxblood accent, no state tokens, optical type scale (xs→5xl), rule weights, and page-margin family. Tokens validated by `tools/scripts/validate-tokens.sh`.
- Archived design alternatives: mockups B (typographic architecture) and C (the seal) moved to `docs/dev/mockups/_archive/` with a README explaining their theory value. Non-canonical alternatives retained for reversibility; the editorial direction is the shipped design.
- Typography path committed to Path C (Adobe Typekit CDN): FreightDisp Pro, FreightText Pro, Acumin Pro. `docs/dev/typography.md` updated with Path C decision and operational setup steps. (Operator action landed via kit dwr4eme provisioning — see Added above.)
- New design-system documentation: `docs/dev/design-system.md` (theory document framing the editorial claim and its three invariants) and `docs/dev/troubleshooting.md` (named failure-mode catalogue from mockup A's iteration).
- Dev-loop-vs-publish separation inside `tools/`: Playwright and preview-server are explicit dev tools that never produce output shipped to Pages. Approvals tracked in commit messages and `pi-agents.yaml`, making the "no build tooling without explicit approval" rule legible in practice.
- `tools/preview/main.go` + `go.mod` — stdlib-only HTTP file server over `site/`. Binds 0.0.0.0:8080 by default; `HOST=127.0.0.1` for laptop-only access. Prints loopback and LAN URLs on startup, enabling rapid local iteration without a separate build step.
- `tools/scripts/preview.sh` — pidfile-backed daemon wrapper (start | stop | status | restart | logs) for the preview server. Operators use `/rag-web-preview` command; script is the mechanical layer.
- `/rag-web-preview` slash command — entry point for preview-server lifecycle. Operator chooses start/stop/status/restart/logs; command maps to the script.
- `/rag-web-prime` reads doctrine from `docs/agent/` — every `.md` file in that directory is now primed into the session, surfacing agent doctrine alongside the project theory. Prime output includes a fifth axis: preview-server status.
- `pi-agents.yaml` — dual-harness tracking rows for `rag-web-preview` and `rag-web-preview-server`; scope for `rag-web-scripts` extended to include `preview.sh`.
- `.gitignore` entries for `.the-grid/preview.pid` and `.the-grid/preview.log`, keeping daemon ephemera out of version control.
- Three-way session contract: `CLAUDE.md` owns the durable theory (role, rules, antipatterns); `/rag-web-prime` reports ground truth; `/rag-web-close` orchestrates and gates commits. No layer carries content that belongs to another.
- `/rag-web-prime` establishes that a session begins by reading the world, not by guessing it — four project-tuned axes (harness parity, content, publishing, work state) replace the generic four.
- `/rag-web-close` formalizes the end-of-session split between read/orchestrate (agent) and write (operator); commit authority is never delegated.
- Named antipatterns (`Inventorial CLAUDE.md`, `Cross-harness drift`, `Auto-commit on close`) give the team a shared vocabulary for the failure modes this project has already survived once.
- `pi-agents.yaml` makes dual-harness drift a tracked artifact rather than a hope — every `.claude/` primitive carries an explicit `mirror_status` row the next close can count.
- Documentation layer expressed as five Naur-informed writer agents (`rag-web-docs-{dev,user,agent,changelog,vault-exporter}-writer`), each owning one audience and recording theory-shifts rather than file diffs.
- Site scaffold commits the project to hand-written HTML with an OKLch design-token contract (`site/index.html`, `site/static/tokens.css`) — the token file is the single source of color, space, and typographic scale.
- Visual QA runs through Playwright CLI via `tools/scripts/capture-screenshot.sh`, which is the only sanctioned browser surface; agents that need a viewport go through that one script or extend it.
- Prose-element base block in `site/static/styles.css`: element selectors (h1-h6, p, ul, ol, dl, blockquote, code, pre, tables, form primitives, etc.) now inherit body typography and set only non-inherited defaults (margins, padding, text-wrap). This prevents subpage prose from hitting user-agent defaults and breaking the editorial register, while a specificity-trap principle emerges: base element selectors should never set inherited properties (font-family, font-size, line-height, color), allowing wrapper-level modulation (`.lede`, future pull-quotes, callouts) to compose freely. Register-shift rules (blockquote, code, pre, table, summary, form field styling) remain explicit type-setting since those are intentional voice changes.
- Four quality-gate agents (`rag-web-visual-reviewer`, `rag-web-css-auditor`, `rag-web-token-enforcer`, `rag-web-visual-test-writer`) encode the design-system invariants the tokens assert, so token drift becomes a reviewable signal instead of a slow accident.
- Typography primer (`docs/dev/typography.md`) frames three delivery paths — system fallback (A), self-hosted woff2 (B), Adobe Typekit CDN (C) — and ships Path A as the launch default with the final choice held open for the operator.
- First project-level skill (`rag-web-pages-deploy`) establishes a new agentic vocabulary layer: skills own *why* (durable theory + staleness-tracked specs), agents own *how* (mechanical instruments), commands own *when* (operator entry points). Moves deployment from a gap to a gated, pre-flight-twice lifecycle.
- Deployment surface admits GitHub Actions with operator-controlled, read-only rollback — the skill scaffolds `.github/workflows/deploy-pages.yml`, three agents (preflight/verify/advisor), and four commands (`/rag-web-pages-{init,check,deploy,rollback}`). Continuation of the "never auto-commit" posture: advisor agent proposes; operator executes.
- Reference documentation pattern — dated spec files (`verified: 2026-04-21`) with explicit re-verify cadences, acknowledging that GitHub action majors drift (`deploy-pages` v4→v5, April 2026). Future sessions pick up the skill cold via this progressively-disclosed knowledge surface.
- `site/.nojekyll` (empty file) disables Jekyll processing on GitHub Pages; required to preserve hand-written HTML. Presence is load-bearing in `actions/upload-pages-artifact@v5` with `include-hidden-files: true`.

---

[Unreleased]: https://github.com/ronin-advisory/website/commits/main
