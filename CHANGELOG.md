# Changelog

All notable changes to the Ronin Advisory Group website project.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

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

### Changed

- Project environment moves from "no harness contract" to "read-only prime, adaptive close"; sessions now open and close against the same shape instead of reinventing each time.
- Frontend tooling posture: Playwright is admitted as a dev dependency (explicit carve-out from the CLAUDE.md no-build-tooling rule) on the condition that nothing it produces ships to GitHub Pages.

### Deferred

- Pi-harness implementations for every `rag-web-*` agent and command — tracked as `pending` rows in `pi-agents.yaml`; the decision is "prove the Claude Code shape first," not "Claude Code only."
- Final font stack — documented as a three-path decision in `docs/dev/typography.md` with the operator's choice held open.

---

[Unreleased]: https://github.com/ronin-advisory/website/commits/main
