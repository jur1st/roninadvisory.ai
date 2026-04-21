# Commands — `/rag-web-prime` and `/rag-web-close` as a contract

Two slash commands bracket every working session on this project. They are a pair: prime opens the session by establishing ground truth, close reconciles what happened against that ground truth and hands the commit decision back to the operator. Neither is optional for non-trivial work, and neither does the other's job.

The shorthand:

- **`/rag-web-prime` is a snapshot.** It captures, it does not change.
- **`/rag-web-close` is an adaptive dispatcher with a commit gate.** It routes work to writers based on what changed, surfaces parity drift, and stops at the commit gate without crossing it.

Source files: [`.claude/commands/rag-web-prime.md`](../../.claude/commands/rag-web-prime.md) and [`.claude/commands/rag-web-close.md`](../../.claude/commands/rag-web-close.md).

---

## `/rag-web-prime` — the ground-truth snapshot

### What it is

A read-only pass that establishes the session's mental model. `CLAUDE.md` already loaded the durable rules; prime fetches the parts of the world that change between sessions. Its output is a structured report across four axes that together describe the state of the project at the moment work begins.

### Hard invariants

These are not defaults. They are the shape of the command, and violating them breaks the three-layer contract (prime / `CLAUDE.md` / close).

- **Read-only.** Prime never writes a file. Not a log, not a cache, not a session record.
- **No memory mutation.** Prime does not update `~/.claude/projects/.../memory/MEMORY.md`, does not touch `.the-grid/sessions/summaries/`, does not append to any index. Those are close's territory.
- **No dispatch.** Prime does not invoke agents. If work should be done, prime names it in the report and stops. Dispatch is close's responsibility.
- **No regeneration of the environment profile.** `.the-grid/config/<hostname>-SYSTEM-ENV.md` is owned by `/prime-env` (a separate, manual-trigger command). Session prime reads the profile; it does not rebuild it.

A prime that writes anything has become something else — a session-start script, a hook, a bootstrap. Those may have their place, but they are not prime. The invariant is what makes prime safe to run at any time, by any operator, including in an unfamiliar checkout.

### The four axes

Prime's report is structured, not prose. The structure is the contract:

1. **Harness parity** — which `rag-web-*` primitives exist on the Claude Code side, which exist on the Pi side, drift to flag.
2. **Content state** — pages and assets drafted; what is publishable.
3. **Publishing state** — GitHub Pages workflow, last deploy, publish branch.
4. **Work state** — git branch, uncommitted changes, open plans in `docs/dev/plans/`.

These four axes are not arbitrary. They are the dimensions along which an incoming agent's guesses are most likely to be wrong — and therefore the dimensions the snapshot must materialize. The agent has `CLAUDE.md` for durable rules; it has prime for live state.

---

## `/rag-web-close` — the adaptive dispatcher

### What it is

A pass that closes the loops prime opened. It verifies that the files prime read are still accurate, dispatches documentation-layer writers based on what actually changed this session, flags cross-harness drift, and presents commit options to the operator without executing any of them.

The structural rule is: **`/rag-web-close` is read-only on source, dispatch-only on writes.** Close never edits a source file directly; all writes happen inside dispatched agents. Close never commits; the commit gate belongs to the operator.

### Verify prime reads

Close re-examines the files prime canonically reads — `README.md`, `CLAUDE.md`, `.the-grid/config/*-SYSTEM-ENV.md`, `pi-agents.yaml`, and entries in `docs/dev/plans/` — and reports specific failure modes:

- If `CLAUDE.md` grew inventorial content (file layouts, tech-stack inventories, "current state"), close flags it as three-way-contract drift and recommends relocating the content to `docs/` or to a prime read. See the **Inventorial CLAUDE.md** antipattern in [`conventions.md`](conventions.md).
- If `pi-agents.yaml` changed, close flags it as a Pi-harness surface update — the registry is a reviewable artifact, and changes to it deserve explicit attention at the session boundary.
- If `.claude/settings.json` drifted from git HEAD, close flags it as a local settings override — this is usually fine, but the operator should know.

### Adaptive dispatch — the mapping from change type to writer

Close inspects the session's diff and dispatches the documentation-layer agents whose scope intersects what actually changed. This is the "adaptive" part: close does not run every writer every time; it matches writers to change types.

| What changed | Agent(s) dispatched |
|---|---|
| Source or content files (`site/`, `tools/`) | [`rag-web-docs-dev-writer`](../../.claude/agents/rag-web-docs-dev-writer.md) |
| Visitor-facing surface (pages, copy) | [`rag-web-docs-user-writer`](../../.claude/agents/rag-web-docs-user-writer.md) + [`rag-web-docs-dev-writer`](../../.claude/agents/rag-web-docs-dev-writer.md) |
| `.claude/` configuration (commands, agents, settings) | [`rag-web-docs-agent-writer`](../../.claude/agents/rag-web-docs-agent-writer.md) |
| Any net change to the repo | [`rag-web-docs-changelog-writer`](../../.claude/agents/rag-web-docs-changelog-writer.md) |
| After the above, if Obsidian vault is configured | [`rag-web-docs-vault-exporter`](../../.claude/agents/rag-web-docs-vault-exporter.md), sequentially last |

The first four dispatch in parallel; the vault exporter runs sequentially after them because it consumes their output. See [`agents.md`](agents.md) for the full registry.

If the documentation-layer agents do not yet exist in `.claude/agents/` or `~/.claude/agents/`, close reports which dispatch set *would* have run and notes that the `documentation-layer` skill should be invoked to create them. This is the pre-documentation-layer graceful-degradation path.

### Flag Pi drift

After dispatch, close performs the cross-harness-drift check described in [`harness.md`](harness.md):

- If any file under `.claude/` was created or modified, and the corresponding entry in `pi-agents.yaml` is absent or marked `mirror_status: pending`, close flags it per the antipattern in `CLAUDE.md`.
- Entries marked `not-applicable` are deliberately excluded — those exemptions are intentional.
- If any file under `docs/dev/plans/` was created or modified and lacks a `## Pi Mirror` section, close flags it as a parity-convention violation and recommends alignment with [`docs/dev/plans/_template.md`](../../docs/dev/plans/_template.md).

### The commit gate

The last thing close does is present uncommitted changes. It does not commit. It does not pick a subset. It does not compose a commit message. It offers four options:

1. Commit as-is (operator authors the message).
2. Commit selected paths only.
3. Discard specific changes.
4. Leave uncommitted for the next session.

Then it waits.

The reason this gate exists is recorded as an antipattern in [`CLAUDE.md`](../../CLAUDE.md): `/rag-web-close` or a dispatched agent committing without operator review is the failure mode. Close is orchestration; commits are judgment. The two must not be the same actor, and the design keeps them separate by making close incapable of the crossing. See **Auto-commit on close** in [`conventions.md`](conventions.md) for the full antipattern.

---

## Why the split matters

Prime and close are not two halves of one thing; they are two different things that share a session. Prime says *what is true right now*. Close says *what changed, who should write about it, and what the operator wants to do with it.* If prime wrote, it would lie the next time it ran against the state it authored. If close committed, the operator would discover the project's theory had shifted without their consent.

The split is the design. A new command that wants to "prime and dispatch in one pass" is proposing a merge that the three-way contract explicitly forbids. Add a new command; do not collapse these two.

---

## Prime's fifth axis — preview server state

As of the current version of [`.claude/commands/rag-web-prime.md`](../../.claude/commands/rag-web-prime.md), the prime report has five axes, not four:

1. Harness parity
2. Content state
3. Publishing state
4. Work state
5. **Preview server** — running or not per `tools/scripts/preview.sh status`; URL(s) if up.

The fifth axis is deliberate isolation. Preview-server state is neither publishing state (the server never participates in the GitHub Pages pipeline) nor work state (it is not a git artifact). Conflating it with either would blur the report's mental model. The axis exists so the operator knows whether a local server is orphaned from a previous session — a common source of port conflicts at the start of a new session — without having to inspect the process table manually.

The implementation is one line in prime's Run block:

```
!`test -x tools/scripts/preview.sh && tools/scripts/preview.sh status 2>&1 || echo "preview.sh absent"`
```

That line degrades gracefully: if `preview.sh` does not exist (the Go binary and script haven't been built yet), prime reports "preview.sh absent" and moves on. The axis does not block prime's read-only invariant.

### Why prime now reads `docs/agent/`

The same update added this to prime's Read block:

> READ each file under `docs/agent/` — `conventions.md`, `harness.md`, `agents.md`, `commands.md`. These encode the durable doctrine behind the `rag-web-*` primitives; loading them at prime inherits the project's theory instead of rebuilding it from scratch each session.

Before this change, a cold agent had `CLAUDE.md` (durable rules) and the session summary (last session's narrative) but lacked the cross-cutting doctrine layer — the `mirror_status` schema, the dispatch table, the antipattern warrants — unless it happened to read those files during its session. Every new session rebuilt that layer from first principles, which meant the agent's early guesses were drifting from the recorded theory.

Reading `docs/agent/` at prime is the mechanism that makes the doctrine layer sticky. It does not violate prime's read-only invariant — the reads are non-mutating. It does mean the prime report is richer and the agent's starting model is closer to the project's actual theory.

---

## `/rag-web-preview` — the local preview server

Source: [`.claude/commands/rag-web-preview.md`](../../.claude/commands/rag-web-preview.md).

### What it is

A thin wrapper over `tools/scripts/preview.sh` that manages a stdlib-only Go binary (`tools/preview/`) serving `site/` on port 8080. It is a dev-loop tool: start it once, keep it running across many edits, stop it when done. It is never part of the GitHub Pages pipeline — preflight does not check it, deploy does not use it, rollback does not touch it.

The command exists because the preview server is stateful in a way that raw bash is not. The server runs as a background daemon with a pidfile at `.the-grid/preview.pid` and a log at `.the-grid/preview.log`. Without a command to manage that pidfile, the operator has to remember the pid, the signal, and the log path across a session — exactly the friction that drains focus from authoring. The command makes the server's lifecycle a one-word operation.

### Why 0.0.0.0 binding by default

The server binds `0.0.0.0:8080` (LAN-reachable) rather than `127.0.0.1` (laptop-only). The reason is responsive and cross-device testing: a phone or tablet on the same network can reach the site without tunneling, which is the cheapest way to catch layout breakpoints that only appear on smaller viewports. The operator can set `HOST=127.0.0.1` to restrict access; the default errs toward the testing use case that is otherwise most inconvenient.

This is appropriate for trusted local networks (home, office) and not for shared or public networks. The server is static-file-only; there are no write endpoints.

### Subcommands

| Subcommand | Effect |
|---|---|
| `start` | Launch in background; idempotent — reports "already running" on repeat |
| `stop` | Graceful SIGTERM → SIGKILL after 2s |
| `status` | Running/not-running + URL; this is what prime calls |
| `restart` | Stop then start |
| `logs` | Tail `-f` the log file |
| *(none)* | Defaults to `status` |

### Parity status

`pi-agents.yaml` entry: `mirror_status: pending`. The Pi equivalent of the slash-command surface has not been built. The Go binary and `preview.sh` are `not-applicable` (harness-agnostic — both harnesses invoke the same script against the same binary). Only the slash-command wrapper is `pending`. See [`harness.md`](harness.md) for what `pending` means and when the flag clears.

---

## Deployment commands — the `/rag-web-pages-*` group

Four commands bracket the GitHub Pages deployment lifecycle. They are a cluster, not a pair: each targets a distinct moment in the deploy cycle (scaffold, pre-deploy check, deploy + verify, emergency rollback) and none duplicates the others. Source files: [`.claude/commands/rag-web-pages-*.md`](../../.claude/commands/).

The skill that provides theory, reference documentation, and workflow templates for this group is [`rag-web-pages-deploy`](../../.claude/skills/rag-web-pages-deploy/SKILL.md). The skill owns the *why*; these commands own the *when* and *how*. See [`agents.md`](agents.md) for the three agents they dispatch.

All four entries in [`pi-agents.yaml`](../../pi-agents.yaml) are `mirror_status: pending`.

### `/rag-web-pages-init` — one-time scaffold

[Source](../../.claude/commands/rag-web-pages-init.md). One-time setup. Confirms `site/index.html` and `site/static/tokens.css` exist, confirms `.github/workflows/deploy-pages.yml` does not yet exist (idempotency guard — refuses to overwrite), then copies the two skill templates into place (`templates/deploy-pages.yml` → `.github/workflows/deploy-pages.yml`; `templates/nojekyll` → `site/.nojekyll`). Prints the GitHub-UI configuration checklist (Settings → Pages, Environments, Actions permissions) as terminal output. **Writes files. Does not stage, commit, or push.**

The idempotency guard is a hard invariant. A command that could silently overwrite a configured workflow file on a second invocation would be destructive precisely when the operator is most confused. The guard makes re-running safe.

### `/rag-web-pages-check` — preflight gate

[Source](../../.claude/commands/rag-web-pages-check.md). Invokes `rag-web-pages-preflight` and relays its structured report. Read-only. Appends a pointer to `reference/preflight-checklist.md` on hard-gate failure. Safe to run at any point in the authoring loop — before a commit, after a site change, any time the operator wants a deploy-readiness signal. Exit code mirrors the agent.

### `/rag-web-pages-deploy` — deploy, watch, verify

[Source](../../.claude/commands/rag-web-pages-deploy.md). The deploy command has two gates before any push: clean working tree, and `main` branch. A dirty tree is a hard abort. Then it runs `/rag-web-pages-check`; a preflight failure aborts. The push mechanism is context-sensitive: if HEAD equals `origin/main` (nothing to push), it dispatches `gh workflow run`; otherwise it pushes. It then tails the run via `gh run watch` and invokes `rag-web-pages-verify` on success.

The dirty-tree gate reinforces the project-wide posture. If the operator has uncommitted changes, the right response is to commit or stash them — not to deploy an intermediate state that does not match what is in the history.

The command never commits. On workflow failure, it prints the failing job name and points to `reference/troubleshooting.md`.

### `/rag-web-pages-rollback` — operator-gated rollback

[Source](../../.claude/commands/rag-web-pages-rollback.md). Invokes `rag-web-pages-rollback-advisor`, presents the proposal verbatim, presents both execution paths from `reference/rollback-runbook.md` (Pages UI fast-path; `gh workflow run` slow-path), and stops. The command is a conduit to the advisor; it never executes either path.

When the advisor reports ambiguity — no clean verify record in session summaries — the command surfaces that ambiguity rather than guessing. The operator decides.

The rollback command's design mirrors the close command's commit gate: it is a gate that can only be opened by the operator, not by the agent holding the gate.

### Name-collision known issue

The skill is named `rag-web-pages-deploy` and the command is `/rag-web-pages-deploy`. The harness dispatches correctly — the skill is a directory at `.claude/skills/rag-web-pages-deploy/`, the command is a file at `.claude/commands/rag-web-pages-deploy.md` — but the name appears twice in any display that lists both skills and commands together. The collision is cosmetic, not functional. See [`conventions.md`](conventions.md) for the full known-issue entry.
