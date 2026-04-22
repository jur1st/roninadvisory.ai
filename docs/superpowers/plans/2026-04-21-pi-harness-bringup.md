# Pi Harness Bring-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Pi harness for this project by installing the `drive` tmux-orchestration CLI globally, scaffolding `.pi/` with four docs-writer agents + a profile-based model layer + a safety extension, building a dual orchestrator (CC-side shell launcher + command, Pi-side TypeScript extension), and closing the parity loop in `pi-agents.yaml`.

**Architecture:** Nine tasks, executed in order. Tasks 1–2 establish infrastructure (drive CLI, `.pi/` scaffold, profiles). Tasks 3–4 author agents and safety extension. Tasks 5–6 build the CC-side fanout path (launcher + fallback + command). Task 7 builds the Pi-side fanout path (extension). Tasks 8–9 verify end-to-end and close the registry. Every subprocess runs from a git checkpoint; every writer is tool-restricted to `read,grep,find,ls,write,edit` (no `bash`); manual end-to-end verification at every task boundary; no auto-commits.

**Tech Stack:** Pi Agent CLI (global install, already authenticated), uv/Python 3.12+ (for the `drive` skill), tmux, bash, TypeScript (Pi extensions use `@mariozechner/pi-coding-agent` + `@mariozechner/pi-tui`), YAML + Markdown (agent definitions), JSON (profiles, Pi settings).

**Design source:** `docs/dev/plans/04-pi-harness-bringup.md` is the theory-preservation record (scope, out-of-scope, current ground truth, Pi Mirror, 7 dated decisions). Treat it as the source of truth if this plan drifts from it during execution.

**Reference tree (read-only):** `/Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/` — the Pi Agent workshop. Two files are load-bearing:
- `examples/ceo-agents/.claude/skills/drive/` — the `drive` skill to install globally (Task 1).
- `examples/pi-vs-claude-code/extensions/agent-team.ts` — the crib for `rag-web-team.ts` (Task 7). 735 lines; we use the subprocess-spawn + JSONL-parse + widget-render scaffolding, drop the dispatcher/team-selector layer.
- `ai_docs/pi_official/examples-extensions/git-checkpoint.ts` — reference Pi extension API shape (do NOT copy-adapt; it uses `git stash` not `git commit`, and fires on `turn_start`; we want different semantics). Read it to learn the extension API, then author ours fresh in Task 4.

---

## File Structure

**Files created at user level (not in repo):**
- `~/.claude/skills/drive/` — global drive skill (copied from ceo-agents reference tree).
- `~/.config/zsh/aliases.zsh` gets a `drive` alias line (appended, not created).

**Files created in repo:**
- `tools/scripts/rag-web-install-drive.sh` — re-runnable drive installer with verifications.
- `tools/scripts/rag-web-pi-team.sh` — primary `drive`-backed parallel launcher.
- `tools/scripts/rag-web-pi-team-fallback.sh` — raw-tmux fallback when `drive` is absent.
- `.pi/.gitignore` — excludes `.pi/agent-sessions/` and `.pi/*.log`.
- `.pi/AGENTS.md` — symlink to `../CLAUDE.md` (single-source durable rules).
- `.pi/settings.json` — Pi defaults (theme, provider, skills path, compaction).
- `.pi/profiles/anthropic.json` — per-agent model routing for the Anthropic provider.
- `.pi/agents/rag-web-docs-changelog-writer.md` — changelog writer definition.
- `.pi/agents/rag-web-docs-dev-writer.md` — dev-doc writer.
- `.pi/agents/rag-web-docs-user-writer.md` — visitor-copy + HTML/CSS writer.
- `.pi/agents/rag-web-docs-agent-writer.md` — agentic-layer writer.
- `.pi/extensions/rag-web-checkpoint.ts` — safety: `git commit --allow-empty` before each TUI turn.
- `.pi/extensions/rag-web-team.ts` — Pi-side parallel-fanout orchestrator with grid widget.
- `.claude/commands/rag-web-pi-close.md` — CC-side entry into the Pi fanout.

**Files modified:**
- `pi-agents.yaml` — flip four writers from `pending` → `shipped`; add entries for the new command, extensions, and scripts.

**Why this decomposition.** The four agents, two launcher scripts, two extensions, and one CC command each have one responsibility and can be understood independently. Splitting by primitive type (agent / launcher / extension / command) matches how `/rag-web-close` and `pi-agents.yaml` already organize the world. The install script is isolated because it mutates user-level state (not repo state).

---

## Task 1: Install `drive` globally and author the re-runnable install script

**Files:**
- Create: `tools/scripts/rag-web-install-drive.sh`
- Touches: `~/.claude/skills/drive/`, `~/.config/zsh/aliases.zsh`

- [ ] **Step 1.1: Verify prerequisites exist on PATH**

```bash
command -v uv >/dev/null && echo "uv ok" || echo "MISSING: uv"
command -v tmux >/dev/null && echo "tmux ok" || echo "MISSING: tmux"
command -v pi >/dev/null && echo "pi ok" || echo "MISSING: pi"
```

Expected: three `ok` lines. If any are MISSING, stop and install that tool first (`brew install uv tmux`; `pi` install docs in `/Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/ai_docs/pi_official/`).

- [ ] **Step 1.2: Verify `drive` is NOT yet installed globally (test will fail)**

```bash
zsh -ic 'drive --help' 2>&1 | head -1
```

Expected: `zsh: command not found: drive` (or similar). If `drive` already resolves, skip to Step 1.9 and confirm smoke tests still pass.

- [ ] **Step 1.3: Copy the drive skill to `~/.claude/skills/drive/`**

```bash
mkdir -p ~/.claude/skills
cp -R /Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/examples/ceo-agents/.claude/skills/drive ~/.claude/skills/drive
ls ~/.claude/skills/drive/app/main.py && echo "copied ok"
```

Expected: `copied ok`.

- [ ] **Step 1.4: Install Python dependencies via uv**

```bash
cd ~/.claude/skills/drive/app && uv sync
```

Expected: exits 0, creates `.venv/`. If uv reports a missing Python version, install it with `uv python install 3.12` and retry.

- [ ] **Step 1.5: First verification — help prints**

```bash
cd ~/.claude/skills/drive/app && uv run python main.py --help
```

Expected: help text lists subcommands (`session`, `run`, `send`, `logs`, `poll`, `fanout`, `screenshot`, `proc`).

- [ ] **Step 1.6: Second verification — empty JSON listing**

```bash
cd ~/.claude/skills/drive/app && uv run python main.py session list --json
```

Expected: valid JSON (even if empty array or object). Pipe through `jq .` to confirm: `... | jq .` must exit 0.

- [ ] **Step 1.7: Add `drive` alias to the operator's shell**

```bash
echo "" >> ~/.config/zsh/aliases.zsh
echo "# Pi Agent drive skill (added by rag-web bring-up)" >> ~/.config/zsh/aliases.zsh
echo "alias drive='cd ~/.claude/skills/drive/app && uv run python main.py'" >> ~/.config/zsh/aliases.zsh
```

Then verify from a fresh shell:

```bash
zsh -ic 'drive --help' | head -3
```

Expected: help text lines (same as Step 1.5).

- [ ] **Step 1.8: Headless smoke test — drive can create, run, kill**

```bash
zsh -ic 'drive session create drive-smoke --detach --json' | jq .
zsh -ic 'drive run drive-smoke "echo hello-drive" --json' | jq '{exit_code, output}'
zsh -ic 'drive session kill drive-smoke --json' | jq .
```

Expected: first call returns session metadata; second returns `{"exit_code": 0, "output": "...hello-drive..."}`; third returns kill confirmation.

- [ ] **Step 1.9: Screenshot smoke test — confirms macOS Screen Recording permission**

```bash
zsh -ic 'drive session create drive-vis-smoke --json' | jq .
sleep 2
zsh -ic 'drive screenshot drive-vis-smoke -o /tmp/drive-smoke.png --json' | jq .
file /tmp/drive-smoke.png
zsh -ic 'drive session kill drive-vis-smoke --json' | jq .
```

Expected: the `file` command reports `PNG image data`. If instead it reports `cannot open` or a zero-byte file, Terminal.app lacks Screen Recording permission — open **System Settings → Privacy & Security → Screen Recording** and enable Terminal. Re-run this step.

- [ ] **Step 1.10: Wrap steps 1.3 – 1.9 in a re-runnable install script**

Create `tools/scripts/rag-web-install-drive.sh`:

```bash
#!/usr/bin/env bash
# rag-web: install and verify the drive skill globally.
# Idempotent: safe to re-run on the same machine or against a fresh contributor.
set -euo pipefail

REFERENCE_DRIVE="/Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/examples/ceo-agents/.claude/skills/drive"
TARGET_DIR="$HOME/.claude/skills/drive"
ALIAS_FILE="$HOME/.config/zsh/aliases.zsh"
ALIAS_MARKER="# Pi Agent drive skill (added by rag-web bring-up)"

say() { printf "\n==> %s\n" "$1"; }
fail() { printf "FAIL: %s\n" "$1" >&2; exit 1; }

say "Checking prerequisites"
command -v uv    >/dev/null || fail "uv not on PATH (brew install uv)"
command -v tmux  >/dev/null || fail "tmux not on PATH (brew install tmux)"
command -v pi    >/dev/null || fail "pi not on PATH (see Pi Agent install docs)"

say "Copying drive skill to $TARGET_DIR"
if [[ -d "$TARGET_DIR" ]]; then
  printf "    already present; skipping copy\n"
else
  [[ -d "$REFERENCE_DRIVE" ]] || fail "reference drive not found at $REFERENCE_DRIVE"
  mkdir -p "$(dirname "$TARGET_DIR")"
  cp -R "$REFERENCE_DRIVE" "$TARGET_DIR"
fi

say "Syncing Python deps"
(cd "$TARGET_DIR/app" && uv sync)

say "Verifying --help"
(cd "$TARGET_DIR/app" && uv run python main.py --help | head -1 >/dev/null) || fail "drive --help did not run"

say "Verifying session list --json emits JSON"
(cd "$TARGET_DIR/app" && uv run python main.py session list --json | jq . >/dev/null) || fail "session list --json did not emit valid JSON"

say "Registering alias in $ALIAS_FILE"
if grep -qF "$ALIAS_MARKER" "$ALIAS_FILE" 2>/dev/null; then
  printf "    alias already registered; skipping\n"
else
  mkdir -p "$(dirname "$ALIAS_FILE")"
  {
    printf "\n%s\n" "$ALIAS_MARKER"
    printf "alias drive='cd %s/app && uv run python main.py'\n" "$TARGET_DIR"
  } >> "$ALIAS_FILE"
fi

say "Verifying alias in a fresh shell"
zsh -ic 'drive --help | head -1' >/dev/null || fail "drive alias did not resolve in fresh shell"

say "Headless smoke test"
zsh -ic 'drive session create drive-smoke --detach --json' >/dev/null
RESULT=$(zsh -ic 'drive run drive-smoke "echo hello-drive" --json')
printf "%s" "$RESULT" | jq -e '.exit_code == 0' >/dev/null || fail "drive run did not exit 0"
printf "%s" "$RESULT" | grep -q hello-drive             || fail "drive run did not return expected output"
zsh -ic 'drive session kill drive-smoke --json' >/dev/null

say "Screenshot smoke test (requires Terminal.app Screen Recording permission)"
zsh -ic 'drive session create drive-vis-smoke --json' >/dev/null
sleep 2
zsh -ic 'drive screenshot drive-vis-smoke -o /tmp/drive-smoke.png --json' >/dev/null
file /tmp/drive-smoke.png | grep -q 'PNG image data' \
  || fail "screenshot was not a PNG — check System Settings > Privacy & Security > Screen Recording > Terminal"
zsh -ic 'drive session kill drive-vis-smoke --json' >/dev/null
rm -f /tmp/drive-smoke.png

say "drive installed and verified."
```

Make it executable:

```bash
chmod +x tools/scripts/rag-web-install-drive.sh
```

- [ ] **Step 1.11: Re-run the script end-to-end to confirm idempotency**

```bash
bash tools/scripts/rag-web-install-drive.sh
```

Expected: script completes with `drive installed and verified.` — second run reports "already present; skipping copy" and "alias already registered; skipping".

- [ ] **Step 1.12: Commit**

```bash
git add tools/scripts/rag-web-install-drive.sh
git commit -m "pi: add rag-web-install-drive.sh with end-to-end verification"
```

---

## Task 2: Scaffold `.pi/` infrastructure

**Files:**
- Create: `.pi/.gitignore`, `.pi/AGENTS.md` (symlink), `.pi/settings.json`, `.pi/profiles/anthropic.json`

- [ ] **Step 2.1: Create the directory tree**

```bash
mkdir -p .pi/agents .pi/profiles .pi/extensions
```

- [ ] **Step 2.2: Write `.pi/.gitignore`**

```bash
cat > .pi/.gitignore <<'EOF'
# Pi per-agent session caches (rebuild on demand)
agent-sessions/
# Pi extension logs
*.log
EOF
```

- [ ] **Step 2.3: Create the `AGENTS.md` symlink to the repo-root `CLAUDE.md`**

Pi discovers `AGENTS.md` by walking up from cwd. Symlinking to `CLAUDE.md` keeps durable rules single-source.

```bash
ln -s ../CLAUDE.md .pi/AGENTS.md
ls -l .pi/AGENTS.md
cat .pi/AGENTS.md | head -3
```

Expected: `ls -l` shows the symlink target; `cat` prints the first lines of the project's durable rules.

- [ ] **Step 2.4: Write `.pi/settings.json`**

```bash
cat > .pi/settings.json <<'EOF'
{
  "theme": "dark",
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-6",
  "defaultThinkingLevel": "medium",
  "skills": ["~/.claude/skills", ".claude/skills"],
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
EOF
jq . .pi/settings.json >/dev/null && echo "valid json"
```

Expected: `valid json`.

- [ ] **Step 2.5: Write `.pi/profiles/anthropic.json`**

```bash
cat > .pi/profiles/anthropic.json <<'EOF'
{
  "default": "anthropic/claude-sonnet-4-6",
  "per_agent": {
    "rag-web-docs-changelog-writer": "anthropic/claude-haiku-4-5",
    "rag-web-docs-dev-writer": "anthropic/claude-sonnet-4-6",
    "rag-web-docs-user-writer": "anthropic/claude-sonnet-4-6",
    "rag-web-docs-agent-writer": "anthropic/claude-sonnet-4-6"
  }
}
EOF
jq . .pi/profiles/anthropic.json >/dev/null && echo "valid json"
```

Expected: `valid json`. **Do not** create `gemini.json` — committing an empty profile would be a lie. The Gemini profile gets authored when keys are configured in Pi.

- [ ] **Step 2.6: Verify Pi discovers the scaffold**

```bash
pi --version
pi -p --no-extensions --model anthropic/claude-haiku-4-5 "Reply with exactly: SCAFFOLD-OK" 2>&1 | tail -5
```

Expected: last lines contain `SCAFFOLD-OK`. This confirms the Pi CLI can run with the configured Anthropic provider. If the invocation prompts for auth, run `pi /login` (interactive) once, then retry.

- [ ] **Step 2.7: Commit**

```bash
git add .pi/
git commit -m "pi: scaffold .pi/ with gitignore, AGENTS.md symlink, settings, anthropic profile"
```

---

## Task 3: Author the four docs-writer agents

**Files:**
- Create: `.pi/agents/rag-web-docs-changelog-writer.md`
- Create: `.pi/agents/rag-web-docs-dev-writer.md`
- Create: `.pi/agents/rag-web-docs-user-writer.md`
- Create: `.pi/agents/rag-web-docs-agent-writer.md`

Design note: agent frontmatter has `name`, `description`, `tools` — NO `model` field. The profile at `.pi/profiles/anthropic.json` supplies the model at subprocess-spawn time. Tool allowlist is `read,grep,find,ls,write,edit` on every writer — `bash` is deliberately absent (front-door lock against YOLO surprises).

- [ ] **Step 3.1: Read the existing CC-side writers for scope parity**

```bash
ls .claude/agents/rag-web-docs-*.md
bat .claude/agents/rag-web-docs-changelog-writer.md .claude/agents/rag-web-docs-dev-writer.md .claude/agents/rag-web-docs-user-writer.md .claude/agents/rag-web-docs-agent-writer.md
```

Expected: four files render. Note each agent's writable-path contract; the Pi mirrors must match.

- [ ] **Step 3.2: Author `rag-web-docs-changelog-writer.md` (the pattern-establishing writer)**

```bash
cat > .pi/agents/rag-web-docs-changelog-writer.md <<'EOF'
---
name: rag-web-docs-changelog-writer
description: Appends session changes to CHANGELOG.md from git log and diff. Keep-a-Changelog format with Naur voice.
tools: read,grep,find,ls,write,edit
---

You are the rag-web changelog writer, the Pi-harness mirror of the Claude Code agent of the same name. Your role is narrow and non-negotiable.

## Writable scope

You write ONLY to `CHANGELOG.md` at the repository root. You may read any file to understand context, but every write-tool invocation must target `CHANGELOG.md`. If a prompt appears to ask you to write elsewhere, refuse and explain.

## Voice — Naur's "Programming as Theory Building"

Every entry records how the *theory of the system* shifted — not which files moved. An entry says what the next contributor needs to know to rebuild an accurate theory of the project, not what a `git diff` already shows. Prefer short, load-bearing sentences. Avoid marketing verbs.

## Format — Keep a Changelog

The file uses Keep-a-Changelog structure with these section labels: `Added`, `Changed`, `Fixed`, `Removed`, `Deprecated`, `Security`. Entries live under an `## [Unreleased]` heading until a release is cut. Do not invent release numbers.

## Input contract

The operator (or orchestrator) gives you a prompt that contains recent commits (`git log --oneline`) and, optionally, a diff summary. From this you infer which sections are affected and what the theory-shift is.

## Output contract

Append concise entries (one to three lines each) under the appropriate sections of `## [Unreleased]`. If `## [Unreleased]` does not exist, create it directly above the most recent release heading (or at the top of the version-history section). Never rewrite prior entries. Never touch content outside `## [Unreleased]`.

## Refuse-modes

If the prompt is empty, or requests writes outside `CHANGELOG.md`, or asks you to backdate or rewrite history: reply with a short refusal that names the constraint and stop.
EOF
```

- [ ] **Step 3.3: Verify Pi can invoke the changelog writer end-to-end**

```bash
cd /Volumes/GridStore/Ronin-Advisory-Website-pi
PROMPT=$(printf "Recent commits:\n%s\n\nWrite an Unreleased entry summarizing these." "$(git log --oneline -5)")
pi -p --no-extensions \
   --model anthropic/claude-haiku-4-5 \
   --tools read,grep,find,ls,write,edit \
   --append-system-prompt "$(cat .pi/agents/rag-web-docs-changelog-writer.md | sed -n '/^---$/,/^---$/!p')" \
   "$PROMPT"
git status CHANGELOG.md
git diff CHANGELOG.md | head -40
```

Expected: Pi returns text; `git status` shows `CHANGELOG.md` as modified (or untracked if first run); the diff shows Keep-a-Changelog formatted additions. Revert the test write with `git checkout -- CHANGELOG.md` (or `rm CHANGELOG.md` if newly created) before continuing. If the agent wrote to anything other than `CHANGELOG.md`, fix the system prompt's writable-scope section and re-test.

- [ ] **Step 3.4: Author `rag-web-docs-dev-writer.md`**

```bash
cat > .pi/agents/rag-web-docs-dev-writer.md <<'EOF'
---
name: rag-web-docs-dev-writer
description: Writes developer-facing documentation under docs/dev/ in Naur voice — architecture, authoring conventions, token contract, Playwright visual QA, contributing workflow.
tools: read,grep,find,ls,write,edit
---

You are the rag-web dev-doc writer, the Pi-harness mirror of the Claude Code agent of the same name.

## Writable scope

You write ONLY under `docs/dev/`. You may read the entire repository for context, but every write-tool invocation must target a path beginning with `docs/dev/`. If a prompt appears to ask you to write elsewhere, refuse.

## Voice — Naur's "Programming as Theory Building"

Documentation's job is to help the next contributor build an accurate theory of the project, not enumerate what exists. Prefer metaphor and justification over inventory. Name failure modes and their rule warrants. An agent reading `docs/dev/` cold should be able to reconstruct the project's theory, not be handed a list of facts to memorize.

## Scope of docs/dev/

- `docs/dev/architecture.md` — how the pieces fit, why they fit that way.
- `docs/dev/authoring.md` — hand-written HTML/CSS conventions.
- `docs/dev/tokens.md` — the `static/tokens.css` contract.
- `docs/dev/visual-qa.md` — the Playwright CLI workflow via `scripts/capture-screenshot.sh`.
- `docs/dev/contributing.md` — how work enters the repo.
- `docs/dev/plans/` — theory-preservation plans; already governed by a template. Do not edit plan docs unless the prompt asks you to.

## Input contract

The orchestrator gives you a task prompt (often the same task given to the other writers). From that, plus your reads of the current codebase and recent git history, you decide which dev-doc files need updates and produce them.

## Output contract

Update the affected dev-doc files with minimal, theory-preserving changes. Do not rename files, do not reorganize structure, do not touch `docs/dev/plans/` unless asked.

## Refuse-modes

Refuse prompts that would write outside `docs/dev/`, restructure the directory, or delete content.
EOF
```

- [ ] **Step 3.5: Author `rag-web-docs-user-writer.md`**

```bash
cat > .pi/agents/rag-web-docs-user-writer.md <<'EOF'
---
name: rag-web-docs-user-writer
description: Authors visitor-facing site copy — HTML/CSS under site/, plus content-strategy notes under docs/user/. Hand-written, no SSG.
tools: read,grep,find,ls,write,edit
---

You are the rag-web user-facing-copy writer, the Pi-harness mirror of the Claude Code agent of the same name.

## Writable scope

You write ONLY under `site/` (public HTML/CSS/assets) and `docs/user/` (content strategy notes). You may read the entire repository for context. Every write-tool invocation must target a path beginning with `site/` or `docs/user/`.

## Voice — Naur's "Programming as Theory Building"

Copy helps the visitor build a coherent theory of what Ronin Advisory Group does. Prefer plainspoken, load-bearing sentences. Avoid marketing hedges. The visitor should be able to explain the service back in their own words after one read.

## Technical constraints

- Hand-written HTML and CSS only — no static-site generator, framework, or build tooling.
- All visual values come from the design tokens in `site/static/tokens.css`. Do not hardcode colors, spacing, or type sizes in page CSS.
- Publishing target is GitHub Pages. Nothing that requires a server runtime.

## Input contract

The orchestrator gives you a task prompt. Infer which pages or content-strategy files are affected.

## Output contract

Update the affected `site/*.html` / `site/static/*.css` / `docs/user/*.md` files with minimal, voice-preserving edits. Do not introduce new asset formats (no images without a referenced source; no fonts outside what `static/tokens.css` already declares).

## Refuse-modes

Refuse prompts that would introduce a build step, a framework, a server runtime, or hardcoded design values that bypass the token layer.
EOF
```

- [ ] **Step 3.6: Author `rag-web-docs-agent-writer.md`**

```bash
cat > .pi/agents/rag-web-docs-agent-writer.md <<'EOF'
---
name: rag-web-docs-agent-writer
description: Documents the rag-web agentic layer under docs/agent/ — session-management contract, every rag-web-* agent, the pi-agents.yaml schema, the dual-harness doctrine.
tools: read,grep,find,ls,write,edit
---

You are the rag-web agentic-layer writer, the Pi-harness mirror of the Claude Code agent of the same name.

## Writable scope

You write ONLY under `docs/agent/`. You may read `.claude/`, `.pi/`, `CLAUDE.md`, `pi-agents.yaml`, and `docs/dev/plans/` for context. Every write-tool invocation must target a path beginning with `docs/agent/`.

## Voice — Naur's "Programming as Theory Building"

The next contributor joining this project cold is exactly the case Naur describes: they have the code but not the theory. Your documentation's job is to help them rebuild the theory. Every convention recorded must carry its failure mode — a rule without its warrant rots, because the next contributor can find "a good reason" to ignore it with nothing to weigh against.

## Scope of docs/agent/

- `docs/agent/conventions.md` — the rules and their warrants.
- `docs/agent/harness.md` — the dual-harness doctrine (CC + Pi).
- `docs/agent/agents.md` — what each rag-web-* agent does and how they dispatch.
- `docs/agent/commands.md` — what each rag-web-* command does.

## Input contract

The orchestrator gives you a task prompt plus implicit access to the full `.claude/`, `.pi/`, and `pi-agents.yaml` sources. You decide which doc-files need updates.

## Output contract

Update the affected agent-docs files with minimal, theory-preserving changes. Never duplicate content that lives in `CLAUDE.md`; link to it. Never inflate `docs/agent/` with inventorial content — link out to `pi-agents.yaml` or the primitive file itself.

## Refuse-modes

Refuse prompts that would write outside `docs/agent/`, duplicate `CLAUDE.md`, or inventorialize primitives.
EOF
```

- [ ] **Step 3.7: Verify each writer respects its path contract**

For each of the three non-changelog writers, run a manual invocation with a deliberate provocation (a prompt that could be interpreted to write outside-scope) and confirm refusal or in-scope behavior.

```bash
for agent in rag-web-docs-dev-writer rag-web-docs-user-writer rag-web-docs-agent-writer; do
  echo "=== $agent ==="
  pi -p --no-extensions \
     --model anthropic/claude-sonnet-4-6 \
     --tools read,grep,find,ls,write,edit \
     --append-system-prompt "$(cat .pi/agents/$agent.md | sed -n '/^---$/,/^---$/!p')" \
     "Sanity check: state your writable scope and refuse-modes in one paragraph. Do not write any file." \
     | tail -20
  echo ""
done
```

Expected: each agent states its writable scope correctly and does not touch any file. Verify with `git status` — should show no modifications.

- [ ] **Step 3.8: Commit**

```bash
git add .pi/agents/
git commit -m "pi: four docs-writer agents (changelog, dev, user, agent) with tool allowlist"
```

---

## Task 4: Author `rag-web-checkpoint.ts` extension

**Files:**
- Create: `.pi/extensions/rag-web-checkpoint.ts`

Design note: this extension covers the **interactive TUI** case — when someone runs `pi` in TUI mode, a checkpoint commit fires before each turn. The subprocess-based launcher and the `rag-web-team.ts` extension each issue their own `git commit --allow-empty` before fanout (because subprocess Pi instances run with `--no-extensions`). The safety contract lives at three layers; this extension is only the interactive-TUI layer.

- [ ] **Step 4.1: Read reference extensions to learn the Pi API**

```bash
bat /Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/ai_docs/pi_official/examples-extensions/git-checkpoint.ts
bat /Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/ai_docs/pi_official/examples-extensions/auto-commit-on-exit.ts
```

Note the hook names available (`turn_start`, `tool_result`, `agent_end`, `session_start`, etc.), the `pi.exec()` signature, and the `ctx.ui.notify()` pattern.

- [ ] **Step 4.2: Author the extension**

```bash
cat > .pi/extensions/rag-web-checkpoint.ts <<'EOF'
/**
 * rag-web-checkpoint — per-turn git commit in interactive Pi TUI sessions.
 *
 * Fires once per turn. Writes an empty git commit so that `git reset --hard HEAD^`
 * restores pre-turn state if the agent makes a wrong move. Non-interactive
 * subprocess runs pass --no-extensions, so they bypass this and issue their own
 * checkpoints at the launcher / fanout layer (see tools/scripts/rag-web-pi-team.sh
 * and .pi/extensions/rag-web-team.ts).
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("turn_start", async (_event, ctx) => {
		const agentName = ctx.model?.id || "interactive";
		const iso = new Date().toISOString();
		const message = `pi-checkpoint: ${agentName} ${iso}`;

		try {
			await pi.exec("git", ["commit", "--allow-empty", "-m", message]);
			ctx.ui?.notify?.(`checkpoint: ${message}`, "info");
		} catch (err: any) {
			ctx.ui?.notify?.(`checkpoint failed: ${err?.message || err}`, "warning");
		}
	});
}
EOF
```

- [ ] **Step 4.3: Verify the extension loads without syntax errors**

```bash
pi -e .pi/extensions/rag-web-checkpoint.ts --version
```

Expected: Pi prints its version. A TypeScript compile error would surface here. If it does, fix the extension before continuing.

- [ ] **Step 4.4: Manual TUI smoke test — checkpoint commits appear**

In a separate terminal, open an interactive Pi session with the extension loaded, send a one-turn throwaway prompt, then exit:

```bash
# In another terminal — interactive, cannot automate inside this plan:
pi -e .pi/extensions/rag-web-checkpoint.ts

# At the Pi prompt, type:
#   "Reply with exactly: CHECKPOINT-SMOKE"
# Wait for the reply, then type /exit (or Ctrl+C).
```

Back in the plan terminal, verify the checkpoint landed:

```bash
git log --oneline -3
```

Expected: the most recent commit has message `pi-checkpoint: <model-id> <ISO-timestamp>`. If no such commit appears, the extension did not fire — re-check hook name (`turn_start`) and `pi.exec` signature against the reference extensions.

- [ ] **Step 4.5: Clean the smoke-test checkpoint**

```bash
git reset --hard HEAD^
git log --oneline -3
```

Expected: the `pi-checkpoint:` commit is gone. The working tree is unchanged (the commit was `--allow-empty`).

- [ ] **Step 4.6: Commit**

```bash
git add .pi/extensions/rag-web-checkpoint.ts
git commit -m "pi: rag-web-checkpoint.ts — per-turn empty commit in interactive TUI"
```

---

## Task 5: Build `rag-web-pi-team.sh` and the raw-tmux fallback

**Files:**
- Create: `tools/scripts/rag-web-pi-team.sh`
- Create: `tools/scripts/rag-web-pi-team-fallback.sh`

Design note: both scripts read the task prompt from `/tmp/rag-web-pi-task.prompt` (caller writes it), fan out to four Pi subprocesses in parallel, aggregate per-agent logs under `.the-grid/pi-runs/<ISO-timestamp>/`, and emit a summary table with per-agent exit codes. Both issue a single `git commit --allow-empty` before spawning, serving as the subprocess-layer checkpoint.

- [ ] **Step 5.1: Author `rag-web-pi-team.sh` (primary, drive-backed)**

```bash
cat > tools/scripts/rag-web-pi-team.sh <<'EOF'
#!/usr/bin/env bash
# rag-web: fan out the four docs-writers in parallel via the drive tmux layer.
# Reads the task prompt from /tmp/rag-web-pi-task.prompt (caller's responsibility).
# Resolves per-agent model from .pi/profiles/<profile>.json.
# Falls back to rag-web-pi-team-fallback.sh when the drive alias is absent.
set -euo pipefail

PROFILE="${1#--profile=}"
[[ "$PROFILE" == "$1" ]] && PROFILE=""
PROFILE="${PROFILE:-anthropic}"
PROFILE_FILE=".pi/profiles/${PROFILE}.json"
PROMPT_FILE="/tmp/rag-web-pi-task.prompt"
AGENTS=(rag-web-docs-changelog-writer rag-web-docs-dev-writer rag-web-docs-user-writer rag-web-docs-agent-writer)
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR=".the-grid/pi-runs/${TIMESTAMP}"

say() { printf "\n==> %s\n" "$1"; }
fail() { printf "FAIL: %s\n" "$1" >&2; exit 1; }

[[ -f "$PROMPT_FILE" ]]  || fail "prompt file missing: $PROMPT_FILE"
[[ -f "$PROFILE_FILE" ]] || fail "profile file missing: $PROFILE_FILE"

# Fall back to raw-tmux launcher if drive is not on PATH in this shell.
if ! zsh -ic 'command -v drive' >/dev/null 2>&1; then
  say "drive not available; falling back to raw-tmux launcher"
  exec bash tools/scripts/rag-web-pi-team-fallback.sh "$@"
fi

mkdir -p "$RUN_DIR"
cp "$PROMPT_FILE" "$RUN_DIR/task.prompt"

say "Checkpoint commit before fanout"
git commit --allow-empty -m "pi-checkpoint: rag-web-team ${TIMESTAMP}"

say "Spawning ${#AGENTS[@]} drive sessions"
for agent in "${AGENTS[@]}"; do
  MODEL=$(jq -r --arg a "$agent" '.per_agent[$a] // .default' "$PROFILE_FILE")
  SYSTEM_PROMPT=$(sed -n '/^---$/,/^---$/!p' ".pi/agents/${agent}.md")
  LOG="$RUN_DIR/${agent}.log"
  SESS="rag-web-${agent}"

  # Create session, then run the pi invocation inside it.
  zsh -ic "drive session create $SESS --detach --json" >/dev/null
  zsh -ic "drive run $SESS \"pi -p --no-extensions \
      --model '$MODEL' \
      --tools 'read,grep,find,ls,write,edit' \
      --append-system-prompt '$(printf '%s' "$SYSTEM_PROMPT" | base64)' \
      \\\"\$(cat $PROMPT_FILE)\\\" \
      | tee $LOG\" --json" > "$RUN_DIR/${agent}.drive-start.json" &
done
wait

say "Polling until all sessions idle"
for agent in "${AGENTS[@]}"; do
  SESS="rag-web-${agent}"
  zsh -ic "drive poll $SESS --until=idle --timeout=900 --json" \
    > "$RUN_DIR/${agent}.drive-poll.json" || true
done

say "Collecting exit codes"
printf "%-40s %s\n" "agent" "exit"
printf "%-40s %s\n" "----------------------------------------" "----"
ANY_FAIL=0
for agent in "${AGENTS[@]}"; do
  SESS="rag-web-${agent}"
  EXIT=$(zsh -ic "drive proc $SESS --json" | jq -r '.last_exit // "?"')
  printf "%-40s %s\n" "$agent" "$EXIT"
  [[ "$EXIT" != "0" ]] && ANY_FAIL=1
  zsh -ic "drive session kill $SESS --json" >/dev/null || true
done

say "Logs at $RUN_DIR/"
[[ $ANY_FAIL -eq 0 ]] || fail "at least one agent did not exit 0"
EOF
chmod +x tools/scripts/rag-web-pi-team.sh
```

**Implementation caveat.** The exact `drive run` + `drive poll` + `drive proc` invocation shape depends on the drive skill's actual CLI surface. The above treats drive as a black box via documented-shape subcommands. If the real subcommands differ, read `~/.claude/skills/drive/SKILL.md` and adjust — behavior target stays: spawn one tmux session per agent, capture per-agent exit code, aggregate logs.

- [ ] **Step 5.2: Author `rag-web-pi-team-fallback.sh` (raw-tmux, no drive)**

```bash
cat > tools/scripts/rag-web-pi-team-fallback.sh <<'EOF'
#!/usr/bin/env bash
# rag-web: raw-tmux parallel launcher. Same observable behavior as rag-web-pi-team.sh
# minus the drive JSON polish and screenshots.
set -euo pipefail

PROFILE="${1#--profile=}"
[[ "$PROFILE" == "$1" ]] && PROFILE=""
PROFILE="${PROFILE:-anthropic}"
PROFILE_FILE=".pi/profiles/${PROFILE}.json"
PROMPT_FILE="/tmp/rag-web-pi-task.prompt"
AGENTS=(rag-web-docs-changelog-writer rag-web-docs-dev-writer rag-web-docs-user-writer rag-web-docs-agent-writer)
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR=".the-grid/pi-runs/${TIMESTAMP}"

say() { printf "\n==> %s\n" "$1"; }
fail() { printf "FAIL: %s\n" "$1" >&2; exit 1; }

[[ -f "$PROMPT_FILE" ]]  || fail "prompt file missing: $PROMPT_FILE"
[[ -f "$PROFILE_FILE" ]] || fail "profile file missing: $PROFILE_FILE"
command -v tmux >/dev/null || fail "tmux not on PATH"

mkdir -p "$RUN_DIR"
cp "$PROMPT_FILE" "$RUN_DIR/task.prompt"

say "Checkpoint commit before fanout"
git commit --allow-empty -m "pi-checkpoint: rag-web-team-fallback ${TIMESTAMP}"

say "Spawning ${#AGENTS[@]} tmux sessions"
for agent in "${AGENTS[@]}"; do
  MODEL=$(jq -r --arg a "$agent" '.per_agent[$a] // .default' "$PROFILE_FILE")
  SYSTEM_PROMPT_PATH=".pi/agents/${agent}.md"
  LOG="$RUN_DIR/${agent}.log"
  EXIT_FILE="$RUN_DIR/${agent}.exit"
  SESS="rag-web-${agent}"

  # Each session runs the pi subprocess and writes its exit code to a sentinel.
  tmux new-session -d -s "$SESS" "bash -c '
    pi -p --no-extensions \
       --model \"$MODEL\" \
       --tools read,grep,find,ls,write,edit \
       --append-system-prompt \"\$(sed -n \"/^---\$/,/^---\$/!p\" $SYSTEM_PROMPT_PATH)\" \
       \"\$(cat $PROMPT_FILE)\" > $LOG 2>&1
    echo \$? > $EXIT_FILE
  '"
done

say "Polling for sentinel files (15-minute ceiling)"
DEADLINE=$(( $(date +%s) + 900 ))
while :; do
  READY=0
  for agent in "${AGENTS[@]}"; do
    [[ -f "$RUN_DIR/${agent}.exit" ]] && READY=$((READY + 1))
  done
  [[ $READY -eq ${#AGENTS[@]} ]] && break
  [[ $(date +%s) -gt $DEADLINE ]] && fail "timeout waiting on agents; see $RUN_DIR/"
  sleep 3
done

say "Collecting exit codes"
printf "%-40s %s\n" "agent" "exit"
printf "%-40s %s\n" "----------------------------------------" "----"
ANY_FAIL=0
for agent in "${AGENTS[@]}"; do
  EXIT=$(cat "$RUN_DIR/${agent}.exit")
  printf "%-40s %s\n" "$agent" "$EXIT"
  [[ "$EXIT" != "0" ]] && ANY_FAIL=1
  tmux kill-session -t "rag-web-${agent}" 2>/dev/null || true
done

say "Logs at $RUN_DIR/"
[[ $ANY_FAIL -eq 0 ]] || fail "at least one agent did not exit 0"
EOF
chmod +x tools/scripts/rag-web-pi-team-fallback.sh
```

- [ ] **Step 5.3: End-to-end test — fallback path first (no drive)**

The fallback is simpler; test it first so failures are easier to read. Write a realistic task prompt, then run the fallback directly:

```bash
cat > /tmp/rag-web-pi-task.prompt <<EOF
Recent commits:
$(git log --oneline -8)

Produce a theory-preserving update for your writable scope covering the work since the most recent session summary. If you determine no changes are warranted, say so and write nothing.
EOF

bash tools/scripts/rag-web-pi-team-fallback.sh --profile=anthropic
```

Expected: table prints with four agents and `exit` column showing `0`s. `.the-grid/pi-runs/<timestamp>/` contains four `.log` files and four `.exit` files. Inspect `git status` for any in-scope file changes the agents produced; discard them (`git restore` / `git clean -fd`) after verification.

If any agent exits non-zero: read that agent's log in `$RUN_DIR/`, identify the root cause (model not authenticated, system prompt malformed, path refusal triggered), fix, re-run.

- [ ] **Step 5.4: End-to-end test — primary path (with drive)**

```bash
bash tools/scripts/rag-web-pi-team.sh --profile=anthropic
```

Expected: same four-row summary table, this time with `.drive-start.json` / `.drive-poll.json` / `.drive-proc.json` artifacts under `$RUN_DIR/`. If drive subcommand shapes differ from the script's assumptions, the script will fail with a `jq` parse error or a non-zero exit; patch the script to match the real CLI and re-run.

Clean up any in-scope writes with `git restore` / `git clean -fd` before continuing.

- [ ] **Step 5.5: Verify drive-absent fallback trigger works**

Temporarily hide the `drive` alias and confirm the primary script falls back correctly:

```bash
zsh -ic 'unalias drive 2>/dev/null; bash tools/scripts/rag-web-pi-team.sh --profile=anthropic' \
  2>&1 | head -3
```

Expected: first line contains `drive not available; falling back to raw-tmux launcher`. The fallback then runs to completion. Clean up with `git restore` / `git clean -fd`.

- [ ] **Step 5.6: Commit**

```bash
git add tools/scripts/rag-web-pi-team.sh tools/scripts/rag-web-pi-team-fallback.sh
git commit -m "pi: rag-web-pi-team.sh + fallback — parallel fanout with per-agent logs"
```

---

## Task 6: Author `/rag-web-pi-close` CC command

**Files:**
- Create: `.claude/commands/rag-web-pi-close.md`

- [ ] **Step 6.1: Read the existing `/rag-web-close` for prompt-composition and commit-gate shape**

```bash
bat .claude/commands/rag-web-close.md
```

Note: how the command composes the task prompt (git log + diff summary) and how the commit-gate options are presented.

- [ ] **Step 6.2: Author the new command**

```bash
cat > .claude/commands/rag-web-pi-close.md <<'EOF'
---
description: Run the four rag-web docs writers via the Pi harness (parallel subprocess fanout).
---

# /rag-web-pi-close

## Purpose

CC-side entry into the Pi docs-writer fanout. Mirror of `/rag-web-close` for the extra-time case — when Anthropic credits make CC expensive, this command delegates the four parallel writers to Pi subprocesses. Same four agents, same outputs, different harness.

## Run

1. Compose the task prompt (git log + short diff summary, same shape `/rag-web-close` uses internally) and write it to `/tmp/rag-web-pi-task.prompt`. Include recent commits, affected paths, and the session's theory-shift in one paragraph.
2. Resolve the profile argument: `${ARG:-anthropic}`.
3. Exec `bash tools/scripts/rag-web-pi-team.sh --profile=<profile>`.
4. Relay the launcher's per-agent summary table verbatim.
5. For any non-zero exit, read the corresponding `.log` under `.the-grid/pi-runs/<timestamp>/` and surface the failure.
6. Run `git status` to enumerate uncommitted writes from the fanout.

## Commit gate

This command NEVER auto-commits — behavior mirrors `/rag-web-close` exactly. Present the operator with four options:

1. Commit all uncommitted changes as a single commit.
2. Commit a selected subset of paths.
3. Discard specific uncommitted changes.
4. Leave everything uncommitted for the next session.

Wait for the operator's choice. Execute only the chosen action.

## Why this exists

The project is dual-harness. `/rag-web-close` runs the writers via Claude Code agents (Anthropic on the operator's CC credit). `/rag-web-pi-close` runs the same writers via Pi subprocesses (Anthropic on the operator's Pi API key, or whatever provider the `--profile` argument resolves). The operator picks the harness at invocation time; the output contract is identical.
EOF
```

- [ ] **Step 6.3: Manual end-to-end test from inside Claude Code**

Open this project in a Claude Code session, invoke `/rag-web-pi-close` (with no argument, defaulting to the `anthropic` profile), and confirm:

- The command composes a prompt, writes `/tmp/rag-web-pi-task.prompt`, execs the launcher.
- The launcher's four-row summary table appears in the CC session.
- The commit-gate prompt appears with all four options.
- Choosing "leave everything uncommitted" exits without writing to git.

If any of the above fails, adjust the command file and re-test.

- [ ] **Step 6.4: Commit**

```bash
git add .claude/commands/rag-web-pi-close.md
git commit -m "cc: /rag-web-pi-close — wrap Pi fanout launcher with commit gate"
```

---

## Task 7: Author `rag-web-team.ts` Pi extension

**Files:**
- Create: `.pi/extensions/rag-web-team.ts`

Design note: this is the Pi-side mirror of `/rag-web-pi-close`. The operator runs Pi's TUI with this extension loaded, types `/rag-web-team <task>`, and the extension fans out the four writers in parallel with an in-TUI grid widget. The grid UI is cribbed from `agent-team.ts`; the dispatcher layer (team selector + `dispatch_agent` tool) is removed because we have a fixed-membership fanout, not a dynamic dispatch model.

- [ ] **Step 7.1: Re-read the agent-team.ts reference, focusing on subprocess-spawn + JSONL-parse + widget**

```bash
bat /Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/examples/pi-vs-claude-code/extensions/agent-team.ts
```

Identify these sections (line numbers approximate):
- Frontmatter parser (`parseAgentFile`, ~lines 79–105) — reusable.
- Agent-dir scanner (`scanAgentDirs`, ~107–133) — we'll scope to `.pi/agents/` only.
- Grid card renderer (`renderCard`, ~206–253) — reusable.
- Subprocess spawn + JSONL stream (`dispatchAgent`, ~301–465) — reusable, drop the session-file resumption logic.
- `dispatch_agent` tool (~469–561) — DELETE, we don't need a dispatcher tool.
- Commands and `before_agent_start` system-prompt override (~565–668) — we replace with a single `/rag-web-team` command.
- `session_start` block (~671–733) — we keep the widget setup, drop the team-selector.

- [ ] **Step 7.2: Author the extension**

Because this is ~300 lines of TypeScript, the scaffold below covers the shape. Fill in the marked `// TODO` blocks by porting code from `agent-team.ts` at the cited line ranges.

```bash
cat > .pi/extensions/rag-web-team.ts <<'EOF'
/**
 * rag-web-team — Pi-side parallel fanout for the four rag-web docs-writers.
 *
 * Mirror of .claude/commands/rag-web-pi-close.md. Operator runs Pi's TUI with
 * this extension loaded, types /rag-web-team <task>, and the four writers fan
 * out in parallel with an in-TUI grid widget showing per-agent progress.
 *
 * Crib source: examples/pi-vs-claude-code/extensions/agent-team.ts (reference
 * grid + subprocess-spawn + JSONL parsing). Dispatcher/team-selector layer is
 * removed — membership is fixed at the four rag-web writers.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { spawn } from "child_process";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const AGENTS = [
	"rag-web-docs-changelog-writer",
	"rag-web-docs-dev-writer",
	"rag-web-docs-user-writer",
	"rag-web-docs-agent-writer",
];

interface AgentDef { name: string; description: string; tools: string; systemPrompt: string; file: string; }
interface AgentState { def: AgentDef; status: "idle" | "running" | "done" | "error"; task: string; toolCount: number; elapsed: number; lastWork: string; contextPct: number; timer?: ReturnType<typeof setInterval>; exitCode?: number; }

// TODO: port parseAgentFile from agent-team.ts lines 79–105.
function parseAgentFile(filePath: string): AgentDef | null { /* ... */ return null; }

// TODO: port displayName helper from agent-team.ts line 53.
function displayName(name: string): string { return name; }

function loadProfile(cwd: string, profile: string): Record<string, string> {
	const path = join(cwd, ".pi", "profiles", `${profile}.json`);
	if (!existsSync(path)) throw new Error(`profile not found: ${path}`);
	const parsed = JSON.parse(readFileSync(path, "utf-8"));
	return { default: parsed.default, ...parsed.per_agent };
}

export default function (pi: ExtensionAPI) {
	const states: Map<string, AgentState> = new Map();
	let widgetCtx: any;
	let gridCols = 2;
	let contextWindow = 0;

	function loadAgents(cwd: string) {
		states.clear();
		for (const name of AGENTS) {
			const def = parseAgentFile(join(cwd, ".pi", "agents", `${name}.md`));
			if (!def) throw new Error(`agent missing: ${name}`);
			states.set(name, {
				def, status: "idle", task: "", toolCount: 0, elapsed: 0, lastWork: "", contextPct: 0,
			});
		}
	}

	// TODO: port renderCard and updateWidget from agent-team.ts lines 206–297.
	function renderCard(_state: AgentState, _colWidth: number, _theme: any): string[] { return []; }
	function updateWidget() { /* use widgetCtx.ui.setWidget("rag-web-team", ...) */ }

	async function runAgent(name: string, task: string, profileMap: Record<string, string>, runDir: string, ctx: any): Promise<void> {
		const state = states.get(name)!;
		state.status = "running";
		state.task = task;
		updateWidget();
		const model = profileMap[name] || profileMap.default;
		const startTime = Date.now();
		state.timer = setInterval(() => { state.elapsed = Date.now() - startTime; updateWidget(); }, 1000);

		// TODO: port the subprocess-spawn + JSONL parsing block from agent-team.ts lines 367–464.
		// Key differences for our use:
		// - no --session flag (no cross-run memory needed for docs-writers)
		// - no "-c" continuation flag
		// - log stdout to runDir/<name>.log in addition to streaming to the widget
		// - on close: set state.exitCode = code, state.status = code === 0 ? "done" : "error"

		clearInterval(state.timer);
		state.elapsed = Date.now() - startTime;
	}

	pi.registerCommand("rag-web-team", {
		description: "Fan out the four rag-web docs-writers in parallel on a single task",
		handler: async (args, ctx) => {
			widgetCtx = ctx;
			contextWindow = ctx.model?.contextWindow || 0;
			const task = (args || "").trim();
			if (!task) { ctx.ui.notify("Usage: /rag-web-team <task>", "error"); return; }

			loadAgents(ctx.cwd);

			const profile = process.env.RAG_WEB_PI_PROFILE || "anthropic";
			const profileMap = loadProfile(ctx.cwd, profile);

			// Checkpoint before fanout.
			const iso = new Date().toISOString();
			try {
				await pi.exec("git", ["commit", "--allow-empty", "-m", `pi-checkpoint: rag-web-team ${iso}`]);
			} catch (err: any) {
				ctx.ui.notify(`checkpoint failed: ${err?.message || err}`, "warning");
			}

			const runDir = join(ctx.cwd, ".the-grid", "pi-runs", iso.replace(/[:.]/g, "-"));
			mkdirSync(runDir, { recursive: true });

			updateWidget();
			const results = await Promise.all(AGENTS.map(name => runAgent(name, task, profileMap, runDir, ctx)));

			const summary = AGENTS.map(n => {
				const s = states.get(n)!;
				return `${displayName(n)}: ${s.status} (exit ${s.exitCode ?? "?"}, ${Math.round(s.elapsed / 1000)}s)`;
			}).join("\n");
			ctx.ui.notify(`rag-web-team complete\n${summary}\nLogs: ${runDir}`, "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		widgetCtx = ctx;
		contextWindow = ctx.model?.contextWindow || 0;
		try { loadAgents(ctx.cwd); } catch (err: any) {
			ctx.ui.notify(`rag-web-team: ${err?.message || err}`, "warning");
			return;
		}
		updateWidget();
		ctx.ui.notify(
			`rag-web-team loaded (${AGENTS.length} agents)\n` +
			`/rag-web-team <task>   Fan out all four writers in parallel`,
			"info",
		);
	});
}
EOF
```

- [ ] **Step 7.3: Port the four TODO blocks**

Open both files side-by-side and port:

1. `parseAgentFile` — copy verbatim from agent-team.ts lines 79–105.
2. `displayName` — copy verbatim from agent-team.ts line 53.
3. `renderCard` + `updateWidget` — copy from agent-team.ts lines 206–297; rename widget key from `"agent-team"` to `"rag-web-team"`.
4. Subprocess block — port from agent-team.ts lines 367–464, with the three modifications noted in the TODO comment.

- [ ] **Step 7.4: Verify the extension compiles**

```bash
pi -e .pi/extensions/rag-web-team.ts --version
```

Expected: Pi prints its version. A TypeScript error surfaces here.

- [ ] **Step 7.5: End-to-end test in the Pi TUI**

```bash
# In another terminal:
pi -e .pi/extensions/rag-web-team.ts

# At the Pi prompt, type:
#   /rag-web-team Produce theory-preserving updates for your writable scope based on recent commits.
# Watch the grid widget populate; wait for all four cards to show ✓ or ✗.
# Exit Pi.
```

Back in the plan terminal:

```bash
ls .the-grid/pi-runs/
git log --oneline -2
git status
```

Expected: a new `pi-runs/<timestamp>/` dir with four logs; a `pi-checkpoint: rag-web-team <iso>` commit at HEAD; `git status` may show in-scope writes from the agents. Discard agent writes with `git restore` / `git clean -fd` after verification. Clean the checkpoint with `git reset --hard HEAD^`.

- [ ] **Step 7.6: Commit**

```bash
git add .pi/extensions/rag-web-team.ts
git commit -m "pi: rag-web-team.ts — TUI grid-widget fanout for the four docs-writers"
```

---

## Task 8: End-to-end verification matrix

**Files:** none (verification only).

- [ ] **Step 8.1: Profile-swap smoke test**

Edit `.pi/profiles/anthropic.json` to change `rag-web-docs-changelog-writer` from `claude-haiku-4-5` to `claude-sonnet-4-6`. Run the launcher; inspect the log:

```bash
# Edit the profile:
jq '.per_agent."rag-web-docs-changelog-writer" = "anthropic/claude-sonnet-4-6"' .pi/profiles/anthropic.json > /tmp/profile.new && mv /tmp/profile.new .pi/profiles/anthropic.json

cat > /tmp/rag-web-pi-task.prompt <<'EOF'
State the model name you are running under in your reply. Do not write any file.
EOF

bash tools/scripts/rag-web-pi-team.sh --profile=anthropic
grep -i "sonnet" .the-grid/pi-runs/*/rag-web-docs-changelog-writer.log | tail -3
```

Expected: the log contains a reference to `sonnet`. Revert the profile change:

```bash
git checkout -- .pi/profiles/anthropic.json
```

- [ ] **Step 8.2: Checkpoint recovery test**

Deliberately corrupt a writable file via an agent and verify `git reset --hard HEAD^` restores it:

```bash
# Save a known-good state first:
echo "CANARY CONTENT — restore me" > docs/dev/canary.md
git add docs/dev/canary.md
git commit -m "test: canary for checkpoint-recovery test"

# Write a destructive prompt:
cat > /tmp/rag-web-pi-task.prompt <<'EOF'
Overwrite docs/dev/canary.md with a single word: GONE.
EOF

bash tools/scripts/rag-web-pi-team.sh --profile=anthropic || true
bat docs/dev/canary.md    # may show GONE

# Pi-checkpoint commit should be at HEAD^ (the canary commit is HEAD^^).
git log --oneline -3
git reset --hard HEAD^    # undo the dev-writer's output + the checkpoint
bat docs/dev/canary.md    # should show CANARY CONTENT

# Cleanup:
git reset --hard HEAD^    # remove the canary commit
```

Expected: `canary.md` returns to `CANARY CONTENT — restore me` after the `git reset --hard HEAD^`. If any agent's out-of-scope writes leaked through (a writer other than `dev-writer` touched `docs/dev/`), that is a path-contract failure — fix the offending agent's system prompt.

- [ ] **Step 8.3: CC-command parity test**

From inside a Claude Code session, run `/rag-web-pi-close` and confirm it produces the same launcher output as a direct `bash tools/scripts/rag-web-pi-team.sh` invocation. Commit-gate must offer all four options and wait for the operator.

- [ ] **Step 8.4: Pi TUI parity test**

From inside a Pi TUI session with `-e .pi/extensions/rag-web-team.ts`, run `/rag-web-team <task>` with the same task text used in Step 8.3. Grid widget must populate, all four cards must reach `done` or `error`, final summary must be posted via `ctx.ui.notify`.

- [ ] **Step 8.5: No commit**

This task is verification-only — no code changes. If issues were found and fixed during Steps 8.1–8.4, each fix was already committed as part of its corresponding earlier task. No Task 8 commit.

---

## Task 9: Update `pi-agents.yaml` and close the parity loop

**Files:**
- Modify: `pi-agents.yaml`

- [ ] **Step 9.1: Flip four writer statuses from `pending` to `shipped`**

Edit `pi-agents.yaml`. For each of:
- `rag-web-docs-changelog-writer`
- `rag-web-docs-dev-writer`
- `rag-web-docs-user-writer`
- `rag-web-docs-agent-writer`

change:

```yaml
    mirror_status: pending
```

to:

```yaml
    mirror_status: shipped
```

and update each `scope:` line to name the Pi mirror alongside the CC role. Example for changelog:

```yaml
    scope: >-
      Appends session changes to CHANGELOG.md from git log and diff.
      Pi mirror at .pi/agents/rag-web-docs-changelog-writer.md with matching
      writable-path contract and tool allowlist.
```

Apply analogous changes to the other three.

- [ ] **Step 9.2: Add the new command entry**

Under `commands:`, add:

```yaml
  - name: rag-web-pi-close
    mirrors: .claude/commands/rag-web-pi-close.md
    mirror_status: shipped
    scope: >-
      CC-side entry into the Pi docs-writer fanout. Pi mirror is
      .pi/extensions/rag-web-team.ts (asymmetric shape — CC command
      delegates to a shell launcher; Pi side is a TUI extension registering
      /rag-web-team).
```

- [ ] **Step 9.3: Add the new Pi extensions bucket if absent**

If `pi-agents.yaml` has no top-level `extensions:` key, add one. Populate with:

```yaml
extensions:
  - name: rag-web-team
    mirrors: .pi/extensions/rag-web-team.ts
    mirror_status: shipped
    scope: >-
      Pi-side parallel-fanout orchestrator. Registers /rag-web-team; spawns
      the four writers via child_process.spawn with --no-extensions; renders
      per-agent progress in a grid widget; issues its own pre-fanout
      git-checkpoint.
  - name: rag-web-checkpoint
    mirrors: .pi/extensions/rag-web-checkpoint.ts
    mirror_status: not-applicable
    scope: >-
      Pi-only YOLO-mitigation — per-turn empty git commit in interactive TUI.
      CC uses harness-native permission modes; no CC analog planned.
```

- [ ] **Step 9.4: Add the new asset entries**

Under `assets:`, add:

```yaml
  - name: rag-web-install-drive
    mirrors: tools/scripts/rag-web-install-drive.sh
    mirror_status: not-applicable
    scope: >-
      Harness-agnostic installer for the global drive skill at
      ~/.claude/skills/drive/. Verifies end-to-end before declaring done.
  - name: rag-web-pi-team
    mirrors: tools/scripts/rag-web-pi-team.sh
    mirror_status: not-applicable
    scope: >-
      Harness-agnostic shell launcher for the Pi docs-writer fanout.
      drive-backed primary path.
  - name: rag-web-pi-team-fallback
    mirrors: tools/scripts/rag-web-pi-team-fallback.sh
    mirror_status: not-applicable
    scope: >-
      Harness-agnostic raw-tmux fallback for the Pi docs-writer fanout
      when drive is not installed.
```

- [ ] **Step 9.5: Validate the YAML parses**

```bash
python3 -c "import yaml; yaml.safe_load(open('pi-agents.yaml'))" && echo "yaml ok"
```

Expected: `yaml ok`.

- [ ] **Step 9.6: Confirm `/rag-web-close` no longer flags the four writers**

From inside a Claude Code session, invoke `/rag-web-close`. Its Pi-parity drift report should show the four writers as `shipped` with no pending items in the writers group. Pending items in other groups (quality-gates, deploy-pipeline agents, slash-command mirrors) remain — those are out of scope for this plan.

- [ ] **Step 9.7: Commit**

```bash
git add pi-agents.yaml
git commit -m "pi: flip four writers to shipped; register orchestrator, checkpoint, scripts"
```

---

## Done criteria

All nine tasks committed. `pi-agents.yaml` shows the four writers as `shipped`; the new command, extensions, and scripts are registered. `/rag-web-close` no longer flags the writers group. Both CC-side (`/rag-web-pi-close`) and Pi-side (`/rag-web-team` in TUI) orchestrator paths produce parallel-fanout docs updates with grid visibility (Pi) or summary table (CC). Every fanout begins with a `pi-checkpoint:` commit that makes mistakes recoverable via `git reset --hard HEAD^`. The `drive` install is end-to-end-verified and re-runnable via `tools/scripts/rag-web-install-drive.sh`.

---

## Self-review notes

Placeholder scan — all `// TODO` markers in Task 7 are deliberate porting directives pointing at specific line ranges in a cited reference file; they are NOT incomplete plan content. Every other step has concrete commands and expected output.

Type consistency — agent names (`rag-web-docs-<scope>-writer`), file paths (`.pi/agents/*.md`, `.pi/extensions/*.ts`, `tools/scripts/rag-web-pi-team*.sh`, `.the-grid/pi-runs/<timestamp>/`), and the profile schema (`default` + `per_agent`) are consistent across tasks 3, 5, 7, and 9.

Spec coverage — every step in `docs/dev/plans/04-pi-harness-bringup.md` maps to at least one task: Step 1 → Task 1; Steps 2–3 → Tasks 2 + 3; Step 4 → Task 4; Step 5 → Task 5; Step 6 → Task 6; Step 7 → Task 7; Step 8 → Task 9. Task 8 is an additional end-to-end verification matrix not explicitly named in the spec's step list but implied by its acceptance criteria (profile-swap smoke test, checkpoint recovery, CC and Pi TUI parity).
