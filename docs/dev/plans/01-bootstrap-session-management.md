# Bootstrap: rag-web session management

**Scope:** document the environment and create the three-way handshake files. Nothing else. Documentation-layer, agentic primitives, and site content are explicitly deferred to later sessions.

**Out of scope (deferred):**
- Pi harness mirror files (`pi-agents.yaml` entries, `.pi/` — decide later once rag-web CC primitives settle)
- `/rag-web-prime-env` as a separate command (folded into `rag-web-prime`)
- `docs-*-writer` agents, documentation-layer invocation
- Project-specific agentic primitives beyond prime/close
- Site content, HTML/CSS, GH Pages workflow

---

## Current ground truth

- Project root: `/Volumes/GridStore/Ronin-Advisory-Website`
- Existing: `README.md`, `.the-grid/` (session workspace with beacons/bundles/summaries from prior session)
- Absent: `.claude/`, `CLAUDE.md`, `AGENTS.md`, `docs/` (creating now), `.pi/`, `pi-agents.yaml`, git init
- Pi Agent tool location: `/Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent` (badlogic/pi-mono coding agent + JD 02.59 tool config)
- User-level `~/.claude/commands/`: no generic `prime` or `close` — rag-web-* prefix is namespace hygiene, nothing to shadow

---

## Step 1 — `CLAUDE.md` at project root

Durable content only. Target 90%+ durable. Three sections, all load-bearing.

**Role and Scope (≤6 lines):**
- Agent's job on this project: build the Ronin Advisory Group website (greenfield, hand-written HTML/CSS, published via GitHub Pages)
- Dual-harness doctrine: primitives must be usable from both Claude Code and Pi Agent
- Namespace: project-specific primitives prefixed `rag-web-*`
- Doctrine install: read-only priming, adaptive close, never auto-commit

**Rules (invariants):**
- All project-specific slash commands and agents prefixed `rag-web-*`
- Hand-written HTML/CSS only — no SSG, no framework, no build tooling without explicit approval
- Publishing target is GitHub Pages; no features that require a server runtime
- Both harnesses must be first-class — no primitive ships Claude-Code-only without a Pi equivalent plan
- Never auto-commit; `/rag-web-close` gates the commit decision to the operator

**Antipatterns (name + failure mode + correct behavior + reason):**
- **Inventorial CLAUDE.md** — file layouts / tech-stack lists in CLAUDE.md. Do instead: put structural content in prime reads or `docs/`. Reason: CLAUDE.md rot is the observed failure mode for single-layer designs.
- **Cross-harness drift** — building only in `.claude/` and deferring Pi indefinitely. Do instead: when a CC primitive is added, open a follow-up task for the Pi mirror. Reason: README requirement #1 says both harnesses are supported; deferral is fine, silent Claude-only lock-in is not.
- **Auto-commit on close** — `rag-web-close` or any agent silently committing. Do instead: present commit options, wait for operator. Reason: close is read + orchestrate; the operator owns the commit gate.

**Claude Code Configuration (optional block):**
- Default model: `claude-opus-4-7`
- Skills pre-injected at prime: `session-management`, `agentic-engineering`, `documentation-layer`

---

## Step 2 — `.claude/commands/rag-web-prime.md`

Copy the `templates/prime.md` stable core. Keep under ~50 lines. Project-specific adaptations:

**Run block additions:**
- `eza --tree -L2 --group-directories-first .the-grid` (surface prior-session artifacts)
- `ls /Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent 2>/dev/null | head -5` (confirm Pi tool reachability)
- `test -f pi-agents.yaml && echo "Pi config present" || echo "Pi config absent"`

**Read block additions (3–10 explicit lines):**
- READ `README.md`
- READ `CLAUDE.md`
- READ `docs/plans/` entries if they exist
- READ `.the-grid/sessions/summaries/` most recent `.md` if present
- READ `pi-agents.yaml` if it exists
- LIST `.claude/commands/` (inherit generic)
- LIST `.claude/agents/` (inherit generic)

**Report axes (project-tuned, replace generic four):**
1. **Harness parity** — what exists on Claude Code side; what exists on Pi side; drift
2. **Content state** — what pages/assets are present; what's drafted
3. **Publishing state** — GH Pages workflow status; last deploy
4. **Work state** — git branch, uncommitted changes, open plans in `docs/plans/`

---

## Step 3 — `.claude/commands/rag-web-close.md`

Copy the `templates/close.md` stable core. Keep under ~50 lines. Project-specific adaptations:

**Verify block additions:**
- If `CLAUDE.md` changed: check whether new content is durable (role/rules/antipatterns) or structural (drift). Flag structural additions for relocation.
- If `pi-agents.yaml` changed: note as Pi-harness surface update (future cross-harness doc task).

**Dispatch block:**
- Keep the adaptive rules from the template (docs-dev-writer on source changes, docs-user-writer on visitor-surface changes, docs-agent-writer on `.claude/` changes, docs-changelog-writer on any net change, docs-vault-exporter last if Obsidian configured).
- Note: dispatch agents don't exist yet — `/rag-web-close` will no-op the dispatch section until the documentation-layer skill is invoked in the later session. Guard with `if agent exists` check or leave commented and document the gap.

**Loop-state report:**
- Keep the generic 11-loop list; most will report UNKNOWN this early.
- Add project-specific loops: `html-lint` (future), `link-check` (future), `gh-pages-build` (future).

**Commit gate:**
- Unchanged from template. Never auto-commit.

---

## Step 4 — `.gitignore` (minimal)

Since `.the-grid/sessions/` accumulates per-session artifacts (beacons, hook logs, bundles), decide whether to track those. Proposed:

```
.the-grid/sessions/hook_logs/
.the-grid/sessions/context_bundles/
.DS_Store
```

Track `.the-grid/sessions/summaries/` and `.the-grid/sessions/beacons/` as historical record? Operator decides — this step is a flag, not a default.

---

## Acceptance criteria

- [ ] `CLAUDE.md` exists at project root with role/scope, rules, antipatterns — no structural inventory
- [ ] `.claude/commands/rag-web-prime.md` exists, under 50 lines, stable core preserved
- [ ] `.claude/commands/rag-web-close.md` exists, under 50 lines, stable core preserved
- [ ] `docs/plans/01-bootstrap-session-management.md` exists (this file)
- [ ] `/rag-web-prime` executes read-only and reports across the four project-tuned axes
- [ ] `/rag-web-close` runs discovery + verify + adaptive dispatch (with no-op guard) + commit gate, never auto-commits
- [ ] Operator has decided `.gitignore` treatment of `.the-grid/sessions/**`
- [ ] One follow-up note captured: Pi harness mirror for the three primitives (deferred)

---

## Decisions (resolved 2026-04-21)

1. **`/prime-env`** — standalone user-level command; runs out-of-band to generate `.the-grid/config/<hostname>-SYSTEM-ENV.md`. `rag-web-prime` READs that file rather than regenerating it. **Rule captured in CLAUDE.md.**
2. **`git init`** — initialized on `main` at bootstrap. `.gitignore` captures macOS exclusions and the-grid ephemera policy below.
3. **`.the-grid/` tracking** — tracked: `context_bundles/`, `summaries/`, `index.jsonl`. Ignored: `beacons/`, `hook_logs/`. **Rule captured in CLAUDE.md and `.gitignore`.**
4. **Pi mirror timing** — deferred until Claude Code primitives are proven in use. Cross-harness-drift antipattern captured in `CLAUDE.md`; `rag-web-close` surfaces a drift flag when `.claude/` changes without a matching `pi-agents.yaml` entry.
