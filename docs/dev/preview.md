# Local Preview Server

When you change a CSS value and want to see it on a phone without deploying, you need a real HTTP server. This document explains what the preview server is, why it exists as a Go binary rather than a shell one-liner, when to reach for it versus a simpler alternative, and how it relates to the Playwright visual-QA loop.

## What it maps to in the dev loop

The site's artifact is hand-written HTML/CSS intended to read well across a range of devices. The responsible review question after any edit is: does it still read well on a phone? On a tablet? At reduced text size? You cannot answer that question from a desktop viewport alone, and the Playwright wrapper (`tools/scripts/capture-screenshot.sh`) captures at a fixed 1280x720 desktop viewport. The preview server is how you close that gap: it makes the working `site/` directory reachable over the local network so that physical devices — any phone or tablet on the same Wi-Fi — can load the page in a real browser, at the real viewport, with real font rendering and real touch behavior.

This is different from what `file://` URLs give you. A `file://` path is browser-local: it is not reachable from a second device, and browsers treat it with a stricter origin policy than they would a served response. For a purely static site with no cross-origin concerns, the difference is usually invisible — but once the site carries web fonts, service workers, or any `fetch()`, `file://` is wrong. The preview server is right for that class of site.

## Why a Go binary, not a shell one-liner

Go was explicitly approved as a dev-tooling dependency for this project — same exception class as Playwright, recorded in the session notes that introduced the server. The approval criterion is the same: the tool runs only in the developer workflow; nothing from `tools/preview/` ships to GitHub Pages.

The case for Go over a shell `python3 -m http.server` or a Node one-liner:

- **LAN address detection on start.** The binary (`tools/preview/main.go`) resolves the primary non-loopback IPv4 address from the system's active interfaces and prints both URLs — loopback and LAN — on startup. A one-liner does not do this, so the contributor has to run `ifconfig` separately to find the address to type into their phone.
- **Proper daemon lifecycle.** `tools/scripts/preview.sh` manages a pidfile (`.the-grid/preview.pid`) and a log file (`.the-grid/preview.log`). The server is a background process with a structured start/stop/status/restart/logs interface, not a foreground process that blocks the terminal or gets lost in a tab.
- **Graceful shutdown.** The binary handles `SIGTERM` and `SIGINT`, waits up to five seconds for in-flight requests to finish, and logs `stopped` cleanly. A kill of the process found via the pidfile is safe.
- **Zero dependencies.** `tools/preview/go.mod` declares `go 1.26` and no external packages. `go run .` from `tools/preview/` is the full dependency install. There is no `npm install` equivalent, no lock file to update, no dependency surface to audit.

Rationale not documented for why Go specifically was chosen over, say, a compiled C binary or a Rust binary — but the zero-dependency stdlib-only property is the functional reason it reads simply; any of those would have been acceptable on the same terms.

## What LAN-default means and why

The server binds to `0.0.0.0` by default, which means it accepts connections from any interface: loopback, wired Ethernet, Wi-Fi. Any device on the same local network can load the site. This is deliberate.

The alternative — binding to `127.0.0.1` — serves only the laptop. That is the right choice when working on a coffee-shop network you don't control, or when the site content is not ready for anyone else to see (even informally). But the whole *point* of running a preview server for this kind of project is cross-device responsive review. A localhost-only default would require an extra step (setting `HOST=127.0.0.1`) every time you want to do the thing the server exists for. LAN-default optimizes for the common case; the escape hatch for the uncommon case is one env var.

The server serves static files only. There is no upload endpoint, no write path, no dynamic handler. The exposure surface on a trusted local network is the same files that will be published to GitHub Pages.

## Commands

All server management goes through `tools/scripts/preview.sh`. The slash command `/rag-web-preview` is a thin wrapper over that script for agent-session convenience.

**Start the server:**

```
tools/scripts/preview.sh start
```

Prints the loopback URL and, if bound to `0.0.0.0`, the LAN URL. Returns immediately; the server runs in the background.

**Check whether it is running:**

```
tools/scripts/preview.sh status
```

**Stop it:**

```
tools/scripts/preview.sh stop
```

**Restart after an edit that required stopping:**

```
tools/scripts/preview.sh restart
```

**Tail the log:**

```
tools/scripts/preview.sh logs
```

**Override the port or bind address:**

```
PORT=9000 tools/scripts/preview.sh start
HOST=127.0.0.1 tools/scripts/preview.sh start
```

`PORT` and `HOST` are read by the script and forwarded to the binary. Both can be combined.

## Where the pidfile and log live

`.the-grid/preview.pid` and `.the-grid/preview.log` are both git-ignored (`.gitignore` was updated when the server landed). They live under `.the-grid/` alongside other ephemeral session artifacts. Their presence does not affect source control; their absence (after `stop`) is normal.

If the pidfile exists but the process is gone (a crash, a machine restart), `status` and `stop` both detect the stale pidfile and clean it up. `start` also checks before launching, so a stale pidfile does not block a fresh start.

## When to use the preview server vs. a `file://` URL

Use a `file://` URL when:
- You are doing a quick desktop sanity check and do not need a second device.
- You are capturing a screenshot via `tools/scripts/capture-screenshot.sh` — the wrapper accepts `file://` paths and works correctly with them.
- You want to skip the server lifecycle entirely for a one-off look.

Use the preview server when:
- You want to load the page on a phone or tablet.
- The page uses web fonts loaded via `@font-face` from `site/static/` — browsers are stricter about `@font-face` cross-origin on `file://` than over HTTP.
- You are doing a sustained editing session and want the URL to stay stable across edits (no path-dependent file:// URL to reconstruct).
- You want request logging (`logs` shows each request with method, status, and timing).

## Relationship to the Playwright visual-QA loop

The preview server and the Playwright wrapper solve adjacent but distinct problems.

The **Playwright wrapper** (`tools/scripts/capture-screenshot.sh`) captures a screenshot on a controlled viewport in headless Chromium. It is deterministic, scriptable, and suitable for agent review — the `rag-web-visual-reviewer` agent uses it to score the rendered UI. It does not tell you what the page looks like on a physical device.

The **preview server** gives a physical device access to the page. It is not scriptable; it is interactive. It tells you what the page feels like to scroll, what the font rendering looks like on an OLED display, whether a tap target is too small. That feedback cannot be automated at the level of quality the project is aiming for.

The two loops are complementary. In practice, a session that involves CSS layout work benefits from both: the Playwright loop for agent-scored desktop review, and the preview server for hands-on responsive verification. The Playwright loop does not replace physical review; physical review does not replace the scored rubric.

If you open the preview server URL in a desktop browser while editing, the browser's built-in DevTools give you everything you would get from a local development server in a conventional project. That is a legitimate use too — but it is secondary. The primary use case for the preview server is the second device.

## Go prerequisite

The script checks for `go` on `PATH` and fails with an actionable error if it is absent:

```
ERROR: go not found on PATH
  Install: brew install go
```

Verify the install:

```
go version
```

Go does not need to be a recent release for this server — the binary uses only stdlib features available since Go 1.21 — but `go 1.26` is declared in `go.mod` to reflect the version the binary was authored and tested against.

## Cross-references

- `tools/preview/main.go` — the server binary; stdlib-only, zero external dependencies.
- `tools/scripts/preview.sh` — the harness-agnostic entry point; `start | stop | status | restart | logs`.
- `.claude/commands/rag-web-preview.md` — the slash-command wrapper for agent sessions.
- [`visual-qa.md`](visual-qa.md) — the Playwright capture loop; explains the distinction between desktop screenshot review and physical device review.
- [`architecture.md`](architecture.md) — the `tools/` layer and the approval model for dev tooling.
