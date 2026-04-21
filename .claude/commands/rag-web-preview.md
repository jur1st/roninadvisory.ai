---
description: Manage the local Go-backed preview server for the rag-web site/ directory. Dev tool only — nothing here ships to GitHub Pages.
allowed-tools: Bash
effort: low
---

# /rag-web-preview

Start, stop, inspect, or tail logs for the laptop preview server. The server is a stdlib-only Go binary at `tools/preview/` that serves `site/` on port `8080`, bound to `0.0.0.0` so phones and tablets on the same LAN can reach it for responsive checks. A pidfile at `.the-grid/preview.pid` and a log at `.the-grid/preview.log` make it a proper daemon, not a foreground process.

## Usage

Accepts one argument — the subcommand passed through to `tools/scripts/preview.sh`:

- `start` — launch in the background (idempotent; reports "already running" on repeat)
- `stop` — graceful shutdown (SIGTERM → SIGKILL after 2s)
- `status` — report running/not-running and the URL
- `restart` — stop-then-start
- `logs` — tail `-f` the log file

If no argument is given, default to `status`.

## Procedure

1. Parse the argument. Treat missing argument as `status`.
2. Invoke `tools/scripts/preview.sh <subcommand>`.
3. Relay the script's stdout/stderr verbatim.
4. Exit code mirrors the script's exit code.

## Environment overrides

Operator-settable via shell env:

- `PORT` — bind port (default `8080`)
- `HOST` — bind interface (default `0.0.0.0` for LAN access; set `HOST=127.0.0.1` for laptop-only)

## Constraints

- Dev tool only. Not part of the GitHub Pages pipeline; not invoked by preflight or deploy.
- LAN-reachable by default — intended for trusted local networks (home, office). Serves static files only; no write endpoints, no upload paths.
- Never auto-stops a server started outside this workflow; only manages processes tracked by `.the-grid/preview.pid`.
