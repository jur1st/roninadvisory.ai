---
description: |
  Run the four rag-web docs-writers via the Pi harness (parallel subprocess fanout). Mirror of /rag-web-close for extra-time use — delegates writers to Pi subprocesses, same outputs, different harness.
allowed-tools: Bash Read Glob Grep
---

# /rag-web-pi-close

## Purpose

CC-side entry into the Pi docs-writer fanout. Mirror of `/rag-web-close` for the extra-time case — when Anthropic credits make CC expensive, this command delegates the four parallel writers to Pi subprocesses. Same four agents, same outputs, different harness.

The Pi-side equivalent is `/rag-web-team` registered by `.pi/extensions/rag-web-team.ts`. Operator chooses harness by invocation.

## Session change discovery

!`git status --short`
!`git log --oneline -8`

## Compose the task prompt

Write the prompt to `/tmp/rag-web-pi-task.prompt`. Shape matches what `/rag-web-close` uses internally: recent commits, affected paths, and a short statement of the session's theory-shift. Each writer will infer from that which of its writable files need updating.

Draft the prompt body as:

```
Recent commits:
<git log --oneline -8 output>

Touched paths this session:
<git status --short output>

Session theory-shift:
<one paragraph: what changed in the project's theory during this session>
```

Write it to disk with the CC Bash tool:

```
cat > /tmp/rag-web-pi-task.prompt <<'EOF'
<composed prompt>
EOF
```

## Run the launcher

```bash
bash tools/scripts/rag-web-pi-team.sh --profile=${ARG:-anthropic}
```

`$ARG` is the first argument passed to `/rag-web-pi-close` (e.g., `/rag-web-pi-close gemini` resolves to `--profile=gemini`). Defaults to `anthropic`.

The launcher:
- Issues a `pi-checkpoint: rag-web-team <timestamp>` commit before fanout.
- Spawns four Pi subprocesses in parallel (one per writer), each with `--no-extensions` and its tool allowlist.
- Aggregates per-agent logs under `.the-grid/pi-runs/<timestamp>/`.
- Prints a summary table with per-agent exit codes.
- Exits non-zero if any agent failed.

## Report

Relay the launcher's summary table verbatim. For any non-zero exit, read `.the-grid/pi-runs/<timestamp>/<agent>.log` and surface the failure in plain prose.

Then:

!`git status --short`

Enumerate uncommitted writes produced by the fanout.

## Commit gate

NEVER auto-commit. Behavior mirrors `/rag-web-close` exactly. Present the operator with four options:

1. Commit all uncommitted changes as a single commit.
2. Commit a selected subset of paths.
3. Discard specific uncommitted changes.
4. Leave everything uncommitted for the next session.

Wait for the operator's choice. Execute only the chosen action.

## Why this exists

The project is dual-harness. `/rag-web-close` runs the writers via Claude Code agents (operator's CC credit). `/rag-web-pi-close` runs the same writers via Pi subprocesses (operator's Pi API key, resolved from the `--profile` argument). The operator picks the harness at invocation time; the output contract is identical.

The checkpoint commit the launcher issues is the recovery contract — `git reset --hard HEAD^` undoes the fanout.
