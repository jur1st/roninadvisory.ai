# Pi Harness Bring-up — Docs-Writers Pilot

**Scope:** Stand up the Pi side of the four parallel `/rag-web-close` docs-writers (`changelog`, `dev`, `user`, `agent`) plus a dual orchestrator (CC-side `/rag-web-pi-close` + Pi-side `.pi/extensions/rag-web-team.ts`), model-profile infrastructure, tmux visibility via a globally-installed `drive` skill, and a safety posture of tool allowlists + session-start git checkpoints. This plan does NOT mirror the quality-gate agents, the deploy-pipeline agents, the slash commands, or the vault-exporter — those are named on the roadmap and get their own plans.

**Out of scope (deferred):**

- Quality-gate agents: `rag-web-{css-auditor,token-enforcer,visual-reviewer,visual-test-writer}`
- Deploy-pipeline agents: `rag-web-pages-{preflight,verify,rollback-advisor}`
- Slash-command mirrors: `/rag-web-prime`, full `/rag-web-close`, `/rag-web-pages-*`
- `rag-web-docs-vault-exporter` Pi mirror (waits on rag-web vault standing up)
- Gemini profile (authored when Gemini keys are configured in Pi)
- Damage-control extension (triggered when first `bash`-enabled Pi agent enters the picture)
- Model-switcher utility (queued as the first post-pilot item)

---

## Current ground truth

**What exists on the CC side today.** Four documentation-layer writer agents at `.claude/agents/rag-web-docs-{changelog,dev,user,agent,vault-exporter}-writer.md`. All are dispatched in parallel by `.claude/commands/rag-web-close.md` on net repo change (per the dispatch table in `docs/agent/agents.md`). The vault-exporter runs sequentially last; the other four are parallel-safe. Session summaries through `TUE_21` confirm the CC-side dispatch pipeline is live; the preview server and Pages deployment primitives have already shipped on recent plans (01–03).

**What exists on the Pi side today.** Nothing. Every entry under `commands:` and `agents:` in `pi-agents.yaml` is `mirror_status: pending`. No `.pi/` directory exists in the repo. The Pi CLI itself is installed globally and authenticated against the operator's Anthropic API key (per operator note, 2026-04-21). The `drive` skill — a tmux-orchestration CLI we intend to adopt — exists only inside a reference project at `/Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/examples/ceo-agents/.claude/skills/drive/`; it is not yet installed globally.

**Supporting reference material.** The Pi Agent workshop at `/Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/` carries the `pi-agent` skill, a mirror of the official Pi docs at `ai_docs/pi_official/`, and two sample projects: `pi-vs-claude-code` (whose `extensions/agent-team.ts` is the direct crib for our Pi-side orchestrator) and `ceo-agents` (whose `drive` skill we install globally). The cross-CC-vs-Pi transition guide at `skill/reference/cc-vs-pi.md` is the authoritative source for the semantic differences the pilot must respect — lowercase tool names, YOLO default permissions, `AGENTS.md` as Pi's equivalent of `CLAUDE.md`, and the `~200`-token default system prompt.

**Current branch.** `pi-agent-parity`, off `main`, clean tree. Branch name signals the work; no Pi files are checked in yet. This plan is the first body of work on the branch.

---

## Step 1 — Install and verify `drive` globally

**Goal.** Make `drive` available as a user-level CLI invoked from any project, with an installation that is verified end-to-end rather than trusted to exit-0 on a copy command.

1. Copy `~/.claude/skills/drive/` from the ceo-agents reference tree (`cp -R /Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/examples/ceo-agents/.claude/skills/drive ~/.claude/skills/drive`).
2. Run `uv sync` inside `~/.claude/skills/drive/app/` to install Python deps.
3. Smoke-test that `uv run python main.py --help` prints usage and `... session list --json` emits JSON (even if empty).
4. Add a `drive` alias to the operator's shell (write into `~/.config/zsh/aliases.zsh` or equivalent): `alias drive='cd ~/.claude/skills/drive/app && uv run python main.py'`. Verify with `zsh -ic 'drive --help'` so a fresh shell resolves it.
5. Headless smoke test: `drive session create drive-smoke --detach --json` → `drive run drive-smoke "echo hello-drive" --json` (expect `exit_code: 0`, output contains `hello-drive`) → `drive session kill drive-smoke --json`.
6. Screenshot smoke test: `drive session create drive-vis-smoke --json` (headed, opens Terminal.app window) → `drive screenshot drive-vis-smoke -o /tmp/drive-smoke.png --json` → `file /tmp/drive-smoke.png` must confirm `PNG image data` → `drive session kill drive-vis-smoke --json`. A failure here usually means Terminal.app lacks Screen Recording permission in macOS System Settings — surface that and stop.
7. Wrap steps 1–6 in `tools/scripts/rag-web-install-drive.sh` so the install is re-runnable against a fresh machine (or a fresh contributor) with one command.

---

## Step 2 — Scaffold `.pi/` and author the first agent

**Goal.** Establish the Pi-side project layout and walk through one writer thoughtfully, ground-up, before copying the pattern to the rest.

1. Create `.pi/` with subdirs: `agents/`, `profiles/`, `extensions/`, plus a `.gitignore` that excludes `.pi/agent-sessions/` (Pi's per-agent session cache).
2. Create `.pi/AGENTS.md` as a symlink to `CLAUDE.md` at the repo root. Pi discovers `AGENTS.md` the same way CC discovers `CLAUDE.md` — walking up from cwd to the git root — so the symlink keeps the durable rules layer single-source.
3. Create `.pi/settings.json` with defaults:
   ```json
   {
     "theme": "dark",
     "defaultProvider": "anthropic",
     "defaultModel": "claude-sonnet-4-6",
     "defaultThinkingLevel": "medium",
     "skills": ["~/.claude/skills", ".claude/skills"],
     "compaction": { "enabled": true, "reserveTokens": 16384, "keepRecentTokens": 20000 }
   }
   ```
4. Create `.pi/profiles/anthropic.json` mapping agent name to model string:
   ```json
   {
     "default": "anthropic/claude-sonnet-4-6",
     "per_agent": {
       "rag-web-docs-changelog-writer": "anthropic/claude-haiku-4-5",
       "rag-web-docs-dev-writer": "anthropic/claude-sonnet-4-6",
       "rag-web-docs-user-writer": "anthropic/claude-sonnet-4-6",
       "rag-web-docs-agent-writer": "anthropic/claude-sonnet-4-6"
     }
   }
   ```
   `.pi/profiles/gemini.json` is explicitly NOT created — committing an empty Gemini profile would be a lie. The file is authored when Gemini keys are configured.
5. Author `.pi/agents/rag-web-docs-changelog-writer.md` end-to-end with YAML frontmatter (`name`, `description`, `tools: read,grep,find,ls,write,edit`) and a body that declares its writable path as `CHANGELOG.md` only, names the Naur voice, and describes the input/output contract. No `model:` in frontmatter — profiles supply that at launch.
6. Invoke manually against a realistic prompt: `pi -p --no-extensions --model anthropic/claude-haiku-4-5 --system-prompt .pi/agents/rag-web-docs-changelog-writer.md "$(git log --oneline -10)"`. Verify the agent produces a CHANGELOG entry in the correct voice and does not touch any other path. Correct any deviation in the system prompt before proceeding.

---

## Step 3 — Author the remaining three writers

**Goal.** Copy the pattern from Step 2 to the other three writers, with each writer's scope adjusted.

1. `.pi/agents/rag-web-docs-dev-writer.md` — writable paths: `docs/dev/`. Body mirrors the CC agent's scope (architecture, authoring conventions, token contract, Playwright visual QA, contributing workflow) translated to Pi conventions.
2. `.pi/agents/rag-web-docs-user-writer.md` — writable paths: `docs/user/` plus visitor-facing HTML/CSS under `site/` (mirrors the CC agent's explicit site-authoring scope).
3. `.pi/agents/rag-web-docs-agent-writer.md` — writable paths: `docs/agent/`. Reads `.claude/`, `CLAUDE.md`, `pi-agents.yaml`, `docs/dev/plans/` per the CC equivalent.
4. For each writer, invoke manually with its intended prompt shape against the repo to confirm output lands in the right place before wiring them into the orchestrator.

---

## Step 4 — Install the `rag-web-checkpoint.ts` safety extension

**Goal.** Guarantee that every Pi subprocess begins from a clean git checkpoint, so a misplaced write is recoverable with `git reset --hard HEAD^`.

1. Copy `/Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/ai_docs/pi_official/examples-extensions/git-checkpoint.ts` to `.pi/extensions/rag-web-checkpoint.ts`.
2. Adapt the checkpoint commit message to include the agent name and ISO timestamp: `git commit --allow-empty -m "pi-checkpoint: <agent-name> <ISO-timestamp>"`.
3. Register the extension to fire on the `session_start` event for all rag-web agents.
4. Verify with one manual Pi invocation: run an agent, confirm `git log --oneline -1` shows a `pi-checkpoint:` commit authored immediately before the agent's work.

---

## Step 5 — Build the shared launcher

**Goal.** `tools/scripts/rag-web-pi-team.sh` fans out the four agents in parallel via `drive`, aggregates output, and degrades gracefully when `drive` is missing.

1. Launcher shape: parse `--profile` flag (default `anthropic`), resolve `.pi/profiles/<profile>.json`, detect `drive` on PATH (falling back to `rag-web-pi-team-fallback.sh` when absent), create one tmux session per agent named `rag-web-<agent>`, spawn `pi -p --no-extensions --model <per-agent-from-profile> --system-prompt .pi/agents/<agent>.md "$(cat /tmp/rag-web-pi-task.prompt)"` in each, poll until all four exit, dump per-agent stdout/stderr to `.the-grid/pi-runs/<ISO-timestamp>/<agent>.log`, print a summary table with per-agent exit codes and log paths, exit non-zero if any agent failed.
2. Author the fallback script `rag-web-pi-team-fallback.sh` that uses raw `tmux new-session -d` + `tmux send-keys` + a polling loop. Same observable behavior, no `drive` features (no screenshots, no JSON polish).
3. Both scripts read the task prompt from a single file (`/tmp/rag-web-pi-task.prompt`) produced by the caller. Keeps the launcher agnostic to how the prompt was composed.

---

## Step 6 — Add the CC-side orchestrator command

**Goal.** `/rag-web-pi-close` becomes the CC-surface path into the Pi fanout.

1. Author `.claude/commands/rag-web-pi-close.md` as a thin wrapper: compose the task prompt (git log + diff summary, same shape `/rag-web-close` uses internally), write to `/tmp/rag-web-pi-task.prompt`, exec `bash tools/scripts/rag-web-pi-team.sh --profile ${ARG:-anthropic}`.
2. Report block relays the launcher's per-agent results and flags non-zero exits. Commit gate behavior mirrors `/rag-web-close` exactly — never auto-commits; presents options and waits.
3. Register the command in `pi-agents.yaml` under `commands:` with `mirror_status: shipped` — the Pi-side mirror ships in Step 7 as `.pi/extensions/rag-web-team.ts`. The scope line names the asymmetry explicitly: the Pi analog is an extension + TUI command, not a prompt-template file.

---

## Step 7 — Author the Pi-side orchestrator extension

**Goal.** The extra-time path — when Pi is the harness you're in, you still get parallel fanout with in-TUI visibility, no `drive` required.

1. Copy `examples/pi-vs-claude-code/extensions/agent-team.ts` from the reference tree as the starting scaffold.
2. Adapt it to: read `.pi/profiles/${PROFILE}.json` (env var or command flag), spawn the four rag-web agents in parallel via `child_process.spawn` with `pi --mode json -p --no-extensions`, render each agent's streaming output to a grid widget card, aggregate results on completion, report per-agent summaries.
3. Register a `/rag-web-team` command in the Pi TUI that dispatches the above.
4. Save as `.pi/extensions/rag-web-team.ts`. Tested via `pi -e .pi/extensions/rag-web-team.ts` followed by `/rag-web-team` in the TUI.

---

## Step 8 — Update `pi-agents.yaml` and close the parity loop

**Goal.** Registry reflects reality; `/rag-web-close` no longer flags these four writers as `pending`.

1. Flip `mirror_status` for `rag-web-docs-{changelog,dev,user,agent}-writer` from `pending` to `shipped`. Update the `scope` lines to reference both sides.
2. Add registry entries for the new primitives: `.claude/commands/rag-web-pi-close.md` (CC command, `mirror_status: shipped` — Pi analog is the `rag-web-team` extension), `.pi/extensions/rag-web-team.ts` (Pi orchestrator, new `extensions:` bucket if absent, `mirror_status: shipped`), `.pi/extensions/rag-web-checkpoint.ts` (Pi safety, `mirror_status: not-applicable` with scope naming "Pi-only YOLO-mitigation; CC uses harness-native permission modes"), `tools/scripts/rag-web-pi-team.sh` and `tools/scripts/rag-web-pi-team-fallback.sh` and `tools/scripts/rag-web-install-drive.sh` (assets, `mirror_status: not-applicable`, harness-agnostic shell tooling).
3. Verify `/rag-web-close` no longer flags the four writers in its Pi-drift check.

---

## Pi Mirror

Every primitive this plan introduces or modifies:

- **Name:** `.claude/agents/rag-web-docs-changelog-writer.md`
  - **Pi shape:** `.pi/agents/rag-web-docs-changelog-writer.md` (same role, Pi-tool-surface vocabulary, no `model:` field)
  - **Expected `mirror_status` after this plan:** `shipped`
- **Name:** `.claude/agents/rag-web-docs-dev-writer.md`
  - **Pi shape:** `.pi/agents/rag-web-docs-dev-writer.md`
  - **Expected `mirror_status` after this plan:** `shipped`
- **Name:** `.claude/agents/rag-web-docs-user-writer.md`
  - **Pi shape:** `.pi/agents/rag-web-docs-user-writer.md`
  - **Expected `mirror_status` after this plan:** `shipped`
- **Name:** `.claude/agents/rag-web-docs-agent-writer.md`
  - **Pi shape:** `.pi/agents/rag-web-docs-agent-writer.md`
  - **Expected `mirror_status` after this plan:** `shipped`
- **Name:** `.claude/commands/rag-web-pi-close.md` (NEW)
  - **Pi shape:** `.pi/extensions/rag-web-team.ts` (not a prompt-template mirror — the Pi-side parallel-fanout primitive is an extension with an in-TUI command, not a separate file invoked from a shell)
  - **Expected `mirror_status` after this plan:** `shipped` (the Pi mirror ships in the same plan; the asymmetric shape — CC command ↔ Pi extension — is named in the scope line). The extension also gets its own `extensions:` bucket entry with `mirror_status: shipped` for drift-tracking of the extension primitive itself.
- **Name:** `.pi/extensions/rag-web-checkpoint.ts` (NEW)
  - **Pi shape:** N/A — Pi-only. CC enforces safety via the harness's built-in permission modes; no CC analog is planned or meaningful.
  - **Expected `mirror_status` after this plan:** `not-applicable` (justification: Pi-only YOLO-mitigation; CC has harness-native permission modes)
- **Name:** `tools/scripts/rag-web-pi-team.sh`, `tools/scripts/rag-web-pi-team-fallback.sh`, `tools/scripts/rag-web-install-drive.sh` (NEW)
  - **Pi shape:** N/A — harness-agnostic shell scripts, invoked identically from either runtime.
  - **Expected `mirror_status` after this plan:** `not-applicable` (justification: harness-agnostic shell tooling, same pattern already established for `tools/scripts/preview.sh`)

---

## Acceptance criteria

- [ ] `drive` installed at `~/.claude/skills/drive/`, alias resolves in a fresh shell, headless and screenshot smoke tests both pass.
- [ ] `.pi/` directory present with `AGENTS.md` symlink, `settings.json`, `profiles/anthropic.json`, four agent definitions under `agents/`, and two extensions under `extensions/`.
- [ ] Manual single-agent invocation for each of the four writers produces the intended artifact and writes only to its declared paths.
- [ ] `bash tools/scripts/rag-web-pi-team.sh --profile anthropic` against a realistic prompt produces four parallel `pi` subprocesses, all exit 0, all four writers produce their artifacts, no writes land outside each agent's writable paths.
- [ ] `/rag-web-pi-close --profile=anthropic` from inside Claude Code produces equivalent output to the launcher script.
- [ ] `pi -e .pi/extensions/rag-web-team.ts` followed by `/rag-web-team` in the Pi TUI produces equivalent output, with in-TUI progress widgets per agent.
- [ ] Every Pi subprocess begins with a visible `pi-checkpoint:` commit in `git log`. `git reset --hard HEAD^` from a deliberately-bad test run restores pre-session state exactly.
- [ ] Profile-swap smoke test: edit `anthropic.json` to change one writer's model, rerun, observe the model change in the subprocess output.
- [ ] `drive`-absent fallback path works: temporarily rename the alias, rerun the launcher, confirm the fallback tmux launcher produces equivalent (if less polished) output.
- [ ] `pi-agents.yaml` entries reflect the expected `mirror_status` above.
- [ ] `## Pi Mirror` section present and accurate (enforced by `/rag-web-close`).

---

## Decisions (resolved 2026-04-21)

1. **Pilot shape = orchestrated constellation with tmux visibility (Q1-C).** Rejected: breadth-first stub-out (A) because it doesn't exercise orchestration; depth-first single agent (B) because it understates the goal and wouldn't deliver the tmux visibility the operator named as a reward of this work.

2. **Dual orchestrator: CC-side `/rag-web-pi-close` AND Pi-side `.pi/extensions/rag-web-team.ts` (Q2-B).** Honors the project's dual-harness rule and the operator's stated extra-time use case — when overage credits make CC expensive, a Pi-only orchestrator path remains available. Rejected: CC-only orchestrator (A) because it fails the extra-time requirement; Pi-only (C) because it surrenders the "invoke from inside a CC session" convenience the operator already has muscle memory for.

3. **Constellation scope = four parallel docs-writers (Q3-B).** `changelog`, `dev`, `user`, `agent`. Rejected: full five (A) because vault-exporter waits on vault standup and adds sequential-tail complexity without pedagogical return; three-agent minimum (C) because dropping `user-writer` removes the highest-value visitor-facing-copy agent. Within the chosen scope, the build proceeds ground-up: changelog-writer is authored and manually verified first before the pattern is copied.

4. **Model strategy = profile files driving launch-time model selection (Q4-B).** `.pi/profiles/<name>.json` per provider; orchestrator passes `--model` at subprocess spawn; agent `.md` files stay model-agnostic. Rejected: hardcoded model per agent (A) because it makes provider swap a per-file edit; single `defaultModel` in `settings.json` (C) because it lacks per-agent overrides at provider-swap time. Profile resolution order: `--profile` flag > `$RAG_WEB_PI_PROFILE` env > `anthropic` default. `gemini.json` is deferred until keys land; committing an empty profile would be a lie.

5. **Tmux layer = global `drive` install at `~/.claude/skills/drive/` (Q5-C).** Rejected: copy `drive` into the rag-web repo (A) because it would add a Python/uv dep to a project whose tooling posture is thin; raw-tmux bash launcher (B) because it gives up the screenshot capability, which is the best visual demo of "what are my four agents doing right now?" A `drive`-absent fallback path preserves the thin-launcher option for contributors who haven't installed the skill.

6. **Safety posture = tool allowlists + git-checkpoint extension (Q6-A+C).** `tools: read,grep,find,ls,write,edit` — no `bash` — on every writer is the front-door lock. `rag-web-checkpoint.ts` committing on `session_start` is the undo button. Rejected as unnecessary for the pilot: damage-control extension with path-enforcement rules (B). The pilot's writers are narrow and shell-disabled; path bleed is the realistic failure, recoverable by `git reset`. Damage-control enters the picture on the plan that introduces the first `bash`-enabled Pi agent.

7. **Install verification is explicitly in-scope and scripted (2026-04-21 operator constraint).** The `drive` install runs six discrete steps, each with a verification that exercises the tool rather than trusting exit-0. Wrapped in `tools/scripts/rag-web-install-drive.sh` so the install is re-runnable and the verification is portable to a fresh machine.
