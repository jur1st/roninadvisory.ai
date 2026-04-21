# Ronin Advisory Group Website

The public website for Ronin Advisory Group, LLC. Hand-written HTML and CSS, published to GitHub Pages. The repository carries three layers at once — the publishable site, an agentic layer that maintains and ships it, and a documentation layer that records the theory behind both — because a site that can be re-authored by either of two harnesses needs its own operating model written down.

## Operating model

Work here runs on a three-way contract between three layers, each owning a different cadence:

- **Prime** — `.claude/commands/rag-web-prime.md`. Read-only. Runs at session start. Establishes live ground truth (git state, session summaries, open plans, harness parity) by reading files — not by recalling from memory.
- **CLAUDE.md** — the durable layer. Holds the role/scope doctrine, the rules, and the named antipatterns. Auto-loaded before prime runs; reinterprets everything read after.
- **Close** — `.claude/commands/rag-web-close.md`. Adaptive dispatch. Verifies prime reads, routes documentation-layer agents to whichever audiences were touched, and gates the commit. Never auto-commits.

Both harnesses — Claude Code and Pi Agent — are first-class. When a primitive ships on one side, its counterpart on the other side is tracked in `pi-agents.yaml` until it lands. Silent single-harness lock-in is a named antipattern in CLAUDE.md.

## Where to go

| Question | Authoritative surface |
|---|---|
| What rules and antipatterns apply? | `CLAUDE.md` |
| How do I open a session? | `.claude/commands/rag-web-prime.md` |
| How do I close a session? | `.claude/commands/rag-web-close.md` |
| I'm new — where do I start? | `docs/dev/contributing.md` |
| How is the project laid out and why? | `docs/dev/architecture.md` |
| How does the agentic layer work? | `docs/agent/` |
| How do I deploy to GitHub Pages? | `.claude/skills/rag-web-pages-deploy/SKILL.md` |
| What's the visual-QA loop? | `docs/dev/visual-qa.md` |
| Which primitives have Pi mirrors pending? | `pi-agents.yaml` |
| What changed session-over-session? | `CHANGELOG.md` |
| Where does visitor-facing copy live? | `docs/user/` (reserved — populated by `rag-web-docs-user-writer`) |

## Ground rules

- **Hand-written HTML and CSS only.** No static-site generator, no framework, no build step without explicit approval. The published artifact is the authored artifact.
- **Dual-harness.** Every project-specific slash command, agent, and skill is prefixed `rag-web-*` and is designed to run from either Claude Code or Pi Agent. Parity is tracked, not assumed.
- **GitHub Pages is the publish target.** `.github/workflows/deploy-pages.yml` uploads `site/` via the official Pages actions. No server runtime, no dynamic rendering.

## Update cadence

This file changes rarely — it orients, it doesn't inventory. Per-session state belongs in prime reads (live) and session summaries (archived). Feature-level prose belongs in `docs/`. When something here starts needing edits every few sessions, that's a signal it belongs in one of the refreshing layers instead.
