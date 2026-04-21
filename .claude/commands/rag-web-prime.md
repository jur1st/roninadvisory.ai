---
description: |
  Prime a rag-web session with fresh ground truth. Read-only. Reports harness parity, content state, publishing state, and work state.
allowed-tools: Bash Read Glob Grep Skill
---

# /rag-web-prime

## Purpose

Establish current ground truth for this session of the Ronin Advisory Group website. `CLAUDE.md` (auto-loaded) carries durable rules; this reads live state.

READ-ONLY. Never writes. Never modifies memory. Never dispatches agents.

## Run

!`eza --tree -L2 --group-directories-first`
!`eza --tree -L2 --group-directories-first .the-grid 2>/dev/null || echo "no .the-grid yet"`
!`git status --short`
!`git log --oneline -5 2>/dev/null || echo "no commits yet"`
!`test -f pi-agents.yaml && echo "Pi config present" || echo "Pi config absent"`
!`ls /Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent 2>/dev/null | head -5 || echo "Pi tool dir unreachable"`

## Read

- READ `README.md`
- READ `CLAUDE.md`
- READ `.the-grid/config/the-grid-SYSTEM-ENV.md` if it exists
- READ most-recent `.the-grid/sessions/summaries/*.md` if any exist
- READ any file under `docs/dev/plans/` if it exists
- READ `pi-agents.yaml` if it exists
- LIST `.claude/commands/`
- LIST `.claude/agents/` if it exists

## Report

Report in the structured form below — not as free prose. This step is load-bearing; it materializes the session's mental model.

1. **Harness parity** — which `rag-web-*` primitives exist on the Claude Code side; which exist on the Pi side; drift to flag.
2. **Content state** — pages and assets drafted; what is publishable.
3. **Publishing state** — GitHub Pages workflow, last deploy, publish branch.
4. **Work state** — git branch, uncommitted changes, open plans in `docs/dev/plans/`.
