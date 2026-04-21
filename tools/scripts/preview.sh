#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TOOLS_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
REPO_ROOT="$( cd "$TOOLS_DIR/.." && pwd )"
PREVIEW_DIR="$TOOLS_DIR/preview"
SITE_DIR="$REPO_ROOT/site"

RUN_DIR="$REPO_ROOT/.the-grid"
PID_FILE="$RUN_DIR/preview.pid"
LOG_FILE="$RUN_DIR/preview.log"

PORT="${PORT:-8080}"
HOST="${HOST:-0.0.0.0}"

lan_ip() {
  # First non-loopback IPv4 address on an up interface, or empty.
  ifconfig 2>/dev/null \
    | awk '/^[a-z0-9]+:.*<.*UP.*>/ {iface=$1} /inet [0-9]/ && iface !~ /^lo/ {print $2; exit}'
}

# preview.sh — manage the local Go-backed rag-web preview server.
# Commands: start | stop | status | restart | logs

usage() {
  cat <<EOF
Usage: preview.sh <command>

Commands:
  start     Start the preview server in the background
  stop      Stop the running preview server
  status    Report whether the server is running
  restart   Stop (if running) and start
  logs      Tail the preview log

Environment:
  PORT      Port to bind (default: 8080)
  HOST      Interface to bind (default: 0.0.0.0 — LAN-reachable)
            Set HOST=127.0.0.1 for laptop-only.
EOF
}

require_go() {
  if ! command -v go &>/dev/null; then
    echo "ERROR: go not found on PATH"
    echo "  Install: brew install go"
    exit 1
  fi
}

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

cmd_start() {
  require_go

  if [[ ! -d "$SITE_DIR" ]]; then
    echo "ERROR: site/ not found at $SITE_DIR"
    exit 1
  fi

  if is_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    echo "  [=] already running (pid $pid) — http://$HOST:$PORT"
    return 0
  fi

  mkdir -p "$RUN_DIR"

  echo "┌─────────────────────────────────────────────────────┐"
  echo "│  rag-web preview                                    │"
  echo "└─────────────────────────────────────────────────────┘"
  printf "  Root     : %s\n" "$SITE_DIR"
  printf "  Bind     : %s:%s\n" "$HOST" "$PORT"
  printf "  Loopback : http://127.0.0.1:%s\n" "$PORT"
  if [[ "$HOST" == "0.0.0.0" ]]; then
    local ip; ip="$(lan_ip)"
    if [[ -n "$ip" ]]; then
      printf "  LAN      : http://%s:%s\n" "$ip" "$PORT"
    fi
  fi
  printf "  Log      : %s\n" "$LOG_FILE"
  echo ""

  (
    cd "$PREVIEW_DIR"
    nohup go run . -root "$SITE_DIR" -host "$HOST" -port "$PORT" \
      >"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
  )

  # Give the server a moment to bind so `status` immediately after is honest.
  sleep 0.4

  if is_running; then
    echo "  [v] started (pid $(cat "$PID_FILE"))"
  else
    echo "  [x] failed to start — last 20 log lines:"
    tail -20 "$LOG_FILE" 2>/dev/null | sed 's/^/    /'
    rm -f "$PID_FILE"
    exit 1
  fi
}

cmd_stop() {
  if ! is_running; then
    echo "  [=] not running"
    rm -f "$PID_FILE"
    return 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  echo "  stopping pid $pid..."
  kill "$pid" 2>/dev/null || true

  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$PID_FILE"
      echo "  [v] stopped"
      return 0
    fi
    sleep 0.2
  done

  echo "  [!] still running after 2s — sending SIGKILL"
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "  [v] stopped (forced)"
}

cmd_status() {
  if is_running; then
    echo "  [v] running (pid $(cat "$PID_FILE"))"
    echo "      http://127.0.0.1:$PORT"
    if [[ "$HOST" == "0.0.0.0" ]]; then
      local ip; ip="$(lan_ip)"
      [[ -n "$ip" ]] && echo "      http://$ip:$PORT"
    fi
  else
    echo "  [=] not running"
    [[ -f "$PID_FILE" ]] && rm -f "$PID_FILE"
  fi
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_logs() {
  if [[ ! -f "$LOG_FILE" ]]; then
    echo "  [=] no log file yet at $LOG_FILE"
    exit 0
  fi
  tail -f "$LOG_FILE"
}

case "${1:-}" in
  start)   cmd_start   ;;
  stop)    cmd_stop    ;;
  status)  cmd_status  ;;
  restart) cmd_restart ;;
  logs)    cmd_logs    ;;
  -h|--help|help|"") usage ;;
  *)
    echo "ERROR: unknown command: $1" >&2
    echo ""
    usage
    exit 1
    ;;
esac
