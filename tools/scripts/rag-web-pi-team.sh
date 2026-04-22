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
  LOG="$RUN_DIR/${agent}.log"
  SESS="rag-web-${agent}"

  # Each session runs pi against the agent's system prompt, piping output to a log.
  # We strip the YAML frontmatter from the agent .md via sed before feeding it to --append-system-prompt.
  SYSTEM_PROMPT=$(sed -n '/^---$/,/^---$/!p' ".pi/agents/${agent}.md")

  zsh -ic "drive session create $SESS --detach --json" >/dev/null
  # Write agent-specific invocation to a temp file to avoid shell-quoting hell.
  INVOKE_SCRIPT="$RUN_DIR/${agent}.invoke.sh"
  cat > "$INVOKE_SCRIPT" <<INVOKE
#!/usr/bin/env bash
pi -p --no-extensions \\
   --model "$MODEL" \\
   --tools "read,grep,find,ls,write,edit" \\
   --append-system-prompt "$(printf '%s' "$SYSTEM_PROMPT" | sed "s/'/'\\\\''/g")" \\
   "\$(cat $PROMPT_FILE)" \\
   > "$LOG" 2>&1
echo \$? > "$RUN_DIR/${agent}.exit"
INVOKE
  chmod +x "$INVOKE_SCRIPT"
  zsh -ic "drive run $SESS \"bash $INVOKE_SCRIPT\" --json" > "$RUN_DIR/${agent}.drive-start.json" &
done
wait

say "Polling until all sessions idle (15-minute ceiling)"
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
  SESS="rag-web-${agent}"
  EXIT=$(cat "$RUN_DIR/${agent}.exit")
  printf "%-40s %s\n" "$agent" "$EXIT"
  [[ "$EXIT" != "0" ]] && ANY_FAIL=1
  zsh -ic "drive session kill $SESS --json" >/dev/null 2>&1 || true
done

say "Logs at $RUN_DIR/"
[[ $ANY_FAIL -eq 0 ]] || fail "at least one agent did not exit 0"
