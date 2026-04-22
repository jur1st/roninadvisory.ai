#!/usr/bin/env bash
# rag-web: install and verify the drive skill globally.
# Idempotent: safe to re-run on the same machine or against a fresh contributor.
#
# Screenshot capability is deliberately NOT verified here — it requires macOS
# Screen Recording permission for Terminal.app, a one-time grant the operator
# handles out-of-band. If you need the screenshot feature later, run
# `drive screenshot <session>` manually and fix the permission prompt then.
set -euo pipefail

REFERENCE_DRIVE="/Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/examples/ceo-agents/.claude/skills/drive"
TARGET_DIR="$HOME/.claude/skills/drive"
ALIAS_FILE="$HOME/.config/zsh/aliases.zsh"
ALIAS_MARKER="# Pi Agent drive skill (added by rag-web bring-up)"

say() { printf "\n==> %s\n" "$1"; }
fail() { printf "FAIL: %s\n" "$1" >&2; exit 1; }

say "Checking prerequisites"
command -v uv   >/dev/null || fail "uv not on PATH (brew install uv)"
command -v tmux >/dev/null || fail "tmux not on PATH (brew install tmux)"
command -v pi   >/dev/null || fail "pi not on PATH (see Pi Agent install docs)"
command -v jq   >/dev/null || fail "jq not on PATH (brew install jq)"

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
zsh -ic 'drive session create drive-smoke --detach --json' 2>/dev/null >/dev/null
RESULT=$(zsh -ic 'drive run drive-smoke "echo hello-drive" --json' 2>/dev/null)
printf "%s" "$RESULT" | jq -e '.exit_code == 0' >/dev/null || fail "drive run did not exit 0"
printf "%s" "$RESULT" | grep -q hello-drive             || fail "drive run did not return expected output"
zsh -ic 'drive session kill drive-smoke --json' 2>/dev/null >/dev/null

say "drive installed and verified."
