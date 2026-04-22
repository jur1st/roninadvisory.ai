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

  # Build a per-agent invoke script so we don't wrestle with nested tmux quoting.
  INVOKE_SCRIPT="$RUN_DIR/${agent}.invoke.sh"
  cat > "$INVOKE_SCRIPT" <<INVOKE
#!/usr/bin/env bash
pi -p --no-extensions \\
   --model "$MODEL" \\
   --tools "read,grep,find,ls,write,edit" \\
   --append-system-prompt "\$(sed -n '/^---\$/,/^---\$/!p' $SYSTEM_PROMPT_PATH)" \\
   "\$(cat $PROMPT_FILE)" > "$LOG" 2>&1
echo \$? > "$EXIT_FILE"
INVOKE
  chmod +x "$INVOKE_SCRIPT"

  tmux new-session -d -s "$SESS" "bash $INVOKE_SCRIPT"
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
