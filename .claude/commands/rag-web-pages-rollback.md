---
description: Propose a rollback via the rag-web-pages-rollback-advisor agent. Presents two execution paths with the exact commands. Operator executes. Never rolls back automatically.
allowed-tools: Read, Bash
effort: medium
---

# /rag-web-pages-rollback

Invoke the rollback advisor and present its proposal. The advisor is read-only; the operator executes the chosen path.

## Procedure

1. Dispatch `rag-web-pages-rollback-advisor`.
2. Present its proposal verbatim to the operator.
3. Present both execution paths from `.claude/skills/rag-web-pages-deploy/reference/rollback-runbook.md`:
   - **Path A** — Pages UI. Fastest; recommended for speed.
   - **Path B** — `gh workflow run deploy-pages.yml --ref <good-SHA>`. Slower (full preflight + deploy) but works when the Pages UI is unavailable.
4. Stop. Wait for the operator's decision. Do not execute either path.

## Constraints

- **Never executes a rollback.** The advisor proposes; the operator chooses.
- Never runs `gh workflow run`, `gh api --method POST`, or any other mutating command.
- If the advisor reports ambiguity (no clean last-known-good verify record in session summaries), present the ambiguity to the operator. Do not paper over it with a best guess.
- Read the runbook before presenting — paraphrasing from memory rots as the spec evolves.
