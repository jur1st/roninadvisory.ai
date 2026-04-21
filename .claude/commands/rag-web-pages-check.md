---
description: Run the rag-web GitHub Pages preflight checklist locally via the rag-web-pages-preflight agent. Read-only. Safe to run any time.
allowed-tools: Read, Bash
effort: medium
---

# /rag-web-pages-check

Invoke the `rag-web-pages-preflight` agent and present its structured report.

## Procedure

1. Dispatch the `rag-web-pages-preflight` agent.
2. Relay its structured output to the operator verbatim.
3. On hard-gate failure, append a one-line pointer to the remediation block in `.claude/skills/rag-web-pages-deploy/reference/preflight-checklist.md`.
4. Exit code mirrors the agent's exit code.

## When to run

- Before `/rag-web-pages-deploy` (deploy refuses on preflight fail, but checking earlier saves a cycle).
- After any change to `site/`, `.github/workflows/deploy-pages.yml`, or `tools/scripts/`.
- Any time the operator wants a local sanity check on the deploy-readiness of the current working tree.

## Constraints

- Read-only. No commits, no pushes, no workflow dispatch.
- Does not propose fixes; the agent's report is authoritative.
