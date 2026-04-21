---
description: |
  Close a rag-web session. Verify prime reads, dispatch doc writers adaptively, gate commit. Never auto-commits.
allowed-tools: Bash Read Glob Grep Agent Skill
---

# /rag-web-close

## Purpose

Close the loops opened by `/rag-web-prime`:
1. Round-trip prime reads — verify still accurate.
2. Dispatch documentation-layer agents adaptively (when they exist).
3. Gate the commit/discard decision.

READ-ONLY on source. DISPATCH-ONLY on writes.

## Session change discovery

!`git status --short`
!`git diff --stat HEAD 2>/dev/null || echo "no commits yet — diff against empty tree"`

## Verify prime reads

Check whether each file `/rag-web-prime` typically reads changed this session: `README.md`, `CLAUDE.md`, `.the-grid/config/*-SYSTEM-ENV.md`, `pi-agents.yaml`, entries in `docs/plans/`.

- If `CLAUDE.md` grew inventorial content (file layouts, tech-stack inventories, "current state"), REPORT as three-way-contract drift and recommend relocating.
- If `pi-agents.yaml` changed, FLAG as Pi-harness surface update.
- If `.claude/settings.json` drifted from git HEAD, REPORT as local settings override.

## Dispatch documentation-layer agents (adaptive)

Check whether any of `docs-dev-writer`, `docs-user-writer`, `docs-agent-writer`, `docs-changelog-writer`, `docs-vault-exporter` exist in `.claude/agents/` or `~/.claude/agents/`.

IF they exist — dispatch adaptively:
- Source or content files changed → `docs-dev-writer`
- Visitor-facing surface changed → `docs-user-writer` + `docs-dev-writer`
- `.claude/` config changed → `docs-agent-writer`
- Any net change → `docs-changelog-writer`
- AFTER: `docs-vault-exporter` if Obsidian vault is configured
- Dispatch the first four in parallel; `docs-vault-exporter` sequentially after.

IF they do NOT exist yet (pre-documentation-layer): REPORT the dispatch set that WOULD run, and note the documentation-layer skill should be invoked to create them.

## Loop-state report

Detectable state for: linter, unit tests, UI/front-end, integration, build, logs/monitoring, error tracking, model evals, browser click-through, review, document. Flag UNKNOWN for loops not detectable.

Project-specific loops: `html-lint`, `link-check`, `gh-pages-build` — all UNKNOWN until configured.

## Pi-harness follow-up

IF any file under `.claude/` was created or modified and no corresponding Pi entry exists in `pi-agents.yaml`, FLAG a cross-harness-drift follow-up per the antipattern in `CLAUDE.md`.

## Commit gate

Present uncommitted changes. Options:
1. Commit as-is (operator authors message)
2. Commit selected paths only
3. Discard specific changes
4. Leave uncommitted for next session

**NEVER auto-commit.** Wait for operator decision.
