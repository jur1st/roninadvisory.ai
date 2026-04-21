# Pages deployment

Authoritative reference for GitHub Pages deployment lives inside the skill:

- `.claude/skills/rag-web-pages-deploy/SKILL.md` — entry points and theory of the target.
- `.claude/skills/rag-web-pages-deploy/reference/` — dated spec, workflow commentary, preflight/postflight checklists, rollback runbook, custom-domain setup, troubleshooting.

This doc is a pointer, not a duplicate. The skill's reference library is the single source of truth; anything in `docs/dev/pages/` beyond this pointer would rot the first time the April-2026 spec changes.

## Operator entry points

| Intent | Command |
|---|---|
| One-time setup | `/rag-web-pages-init` |
| Preflight check | `/rag-web-pages-check` |
| Deploy | `/rag-web-pages-deploy` |
| Rollback proposal | `/rag-web-pages-rollback` |

## The implementation plan

`docs/dev/plans/03-pages-deployment.md` captures the decisions that produced this layer — action versions, why Actions instead of deploy-from-branch, why `include-hidden-files: true` is load-bearing, why the rollback advisor is opus and the other two agents are sonnet. Read it when you need to know *why*, not *how*.
