# Contributing

Contributing to this project means working inside a small set of load-bearing conventions that exist because single-layer designs rot. This document describes those conventions — what they are, what failure mode each one prevents, and how the day-to-day rhythm uses them.

Three of them are primary: the session-management three-way contract, the plan-doc convention, and the `.the-grid/` session artifact policy. A fourth — the dual-harness doctrine — runs as a cross-cutting rule through all of them.

## The session-management three-way contract

Every session on this project is mediated by three files working in concert. Each file owns one kind of artifact. The design is the separation.

**`CLAUDE.md`** at project root. Durable rules only: the project's role, the invariants (hand-written HTML/CSS; GitHub Pages only; `rag-web-*` namespace), and three named antipatterns. Auto-loaded at the start of every agent session. Target: 90%+ of the content is still true a quarter from now. If content would not survive that test, it doesn't belong here — it belongs in a prime read or under `docs/`.

**`/rag-web-prime`** at session start. Defined in `.claude/commands/rag-web-prime.md`. A ground-truth snapshot, materialized by running a small fixed set of shell commands and reading a small fixed set of files, then reporting across four axes:

1. Harness parity — which `rag-web-*` primitives exist on the CC side, which on the Pi side, and what drift is pending.
2. Content state — pages and assets drafted; what is publishable.
3. Publishing state — GitHub Pages workflow, last deploy, publish branch.
4. Work state — git branch, uncommitted changes, open plans in `docs/dev/plans/`.

The prime command is explicit about what it is not: **it never writes, never dispatches agents, and never modifies memory.** It is read-only by design. Its output is a mental model; its value is lost the moment it starts also leaving artifacts behind.

**`/rag-web-close`** at session end. Defined in `.claude/commands/rag-web-close.md`. An adaptive orchestrator that does three things:

1. Verifies the prime reads — checks whether `CLAUDE.md`, `pi-agents.yaml`, plan docs, or system-env config changed this session, and flags structural drift.
2. Dispatches documentation-layer agents adaptively — `rag-web-docs-dev-writer` on source changes, `rag-web-docs-user-writer` on visitor-facing changes, `rag-web-docs-agent-writer` on `.claude/` changes, `rag-web-docs-changelog-writer` on any net change, `rag-web-docs-vault-exporter` last if Obsidian is configured.
3. Presents the commit/discard decision to the operator.

The close command is explicit about what it is not: **it never auto-commits.** It shows the uncommitted changes and four options — commit as-is, commit selected paths, discard specific changes, leave for next session — and waits. This is the named antipattern "Auto-commit on close" in `CLAUDE.md`. The failure mode is a close routine that commits its own output, silently, which robs the operator of the review gate. The correct posture is read + orchestrate + present; writing is done by dispatched agents (which the operator reviews as part of the commit gate), never by the command itself.

**Why the separation matters.** Collapsing the three layers is the named "Inventorial CLAUDE.md" antipattern. A `CLAUDE.md` that starts listing file layouts rots within weeks because the file is only auto-loaded, never actively maintained. The layouts drift, and an agent session reading stale structure has a worse map than no map at all. The fix is structural: file layouts live in the prime command's Read block (which is *always* run fresh) or in `docs/` (which is versioned and reviewable). The same logic argues against the prime command doing any writing — the snapshot must be pure or it stops being a snapshot.

## The plan-doc convention

Substantive work on this project routes through a plan document under `docs/dev/plans/`. Four exist today:

- `01-bootstrap-session-management.md` — established the three-way contract itself.
- `02-web-frontend-localization.md` — added the scaffold, Playwright CLI, four quality-gate agents, and the typography primer.
- `03-pages-deployment.md` — added the GitHub Pages deployment layer: the `rag-web-pages-deploy` skill, three agents, four commands, the CI workflow, and `site/.nojekyll`.
- `04-design-system-lock-in.md` — promoted mockup A (editorial masthead) to `site/`; rewrote the token catalog from the Tier-1 scaffold to the editorial palette (two-ink, oxblood, no state tokens); committed typography to Path C (Adobe Typekit); authored the design-system theory document and the failure-mode catalogue.

A plan doc is not a ticket. It is a written theory of what is about to change, why the changes have the shape they do, and what the acceptance criteria are. The sections are fixed by convention:

- **Scope** — what this plan covers.
- **Out of scope (deferred)** — what is deliberately *not* covered, so future readers don't mistake omission for oversight.
- **Current ground truth** — the state of the world before the plan lands.
- **Steps** — numbered, with enough detail that execution can be delegated.
- **Acceptance criteria** — checkable items.
- **Decisions** — resolved questions, with the resolution. Load-bearing: this is where the *why* of the plan's shape gets recorded.
- **Pi Mirror** — required section (see below).

A template lives at `docs/dev/plans/_template.md`.

## The `## Pi Mirror` section — required

Every plan doc must carry a `## Pi Mirror` section. `/rag-web-close` flags its absence. The section enumerates each primitive the plan introduces or modifies and states, for each, the Pi-harness expectation:

- `shipped` — a Pi analog exists and is active.
- `pending` — the CC side exists; the Pi side is planned but deferred.
- `not-applicable` — no Pi analog is intended, with an inline justification.

The reason this is required — and the reason it is required in the *plan*, not reconstructed after the fact — is the named "Cross-harness drift" antipattern in `CLAUDE.md`. The failure mode: a primitive is added to `.claude/`, the Pi equivalent is never planned, and over time the project silently locks to a single harness. The lock-in is invisible because each individual omission is reasonable; only the accumulated pattern is the problem.

The fix is a positive record at the moment the CC primitive ships. `pi-agents.yaml` at project root is that record; it carries one row per primitive with the current `mirror_status`. The plan doc is where the status is first proposed; `pi-agents.yaml` is where it is maintained.

`pending` is an acceptable status — the project explicitly supports deferring the Pi side until CC primitives are proven in use. `not-applicable` is also acceptable — some artifacts (the Playwright dev dependency, the shell scripts, the publishable HTML/CSS) genuinely have no Pi analog. Silence is what is not acceptable: the record has to exist.

`/rag-web-close` enforces two checks tied to this:

- If a file under `.claude/` was created or modified and the matching `pi-agents.yaml` entry is absent or `pending`, cross-harness drift is flagged.
- If a file under `docs/dev/plans/` was created or modified and lacks a `## Pi Mirror` section, parity-convention violation is flagged and the operator is pointed at the template.

Neither check blocks work. Both surface what would otherwise go unnoticed.

## The `.the-grid/` session artifact policy

The `.the-grid/` directory holds session-management state. Its contents split cleanly into two halves, with the split codified in `CLAUDE.md` and `.gitignore`:

**Tracked** (part of the versioned history):

- `.the-grid/sessions/context_bundles/` — structured context snapshots, one per session.
- `.the-grid/sessions/summaries/` — session summaries in `.md` and `.json`.
- `.the-grid/sessions/index.jsonl` — the session index.
- `.the-grid/config/<hostname>-SYSTEM-ENV.md` — machine environment profiles. Regenerated by the user-level `/prime-env` command; read by session primes.

**Ephemeral** (git-ignored):

- `.the-grid/sessions/beacons/` — transient session markers.
- `.the-grid/sessions/hook_logs/` — per-hook output.

Why the split? Summaries and context bundles are evidence: a reader six months from now can reconstruct what was decided and why by reading them. Beacons and hook logs are machinery; their value is real-time, during the session that produced them, and they accumulate quickly enough to drown the signal if tracked. Each directory is in the half it belongs to because of what the artifact is, not because of how large it is or how often it changes.

The `/prime-env` command is out-of-band relative to `/rag-web-prime`. It runs rarely — after a significant tool install, a shell reconfiguration, a brew sweep — and writes the SYSTEM-ENV.md file. `/rag-web-prime` reads that file but never regenerates it. Regenerating it inside `/rag-web-prime` would violate the read-only contract; splitting the concern means the session prime stays fast and predictable.

## The dual-harness doctrine

Running through all of the above is a commitment recorded in `README.md` and reiterated in `CLAUDE.md`: this project supports two agent runtimes, Claude Code and Pi Agent, and both are first-class. The `rag-web-*` namespace exists so that project-specific primitives can be lifted between runtimes without shadowing the generic ones on either side. `pi-agents.yaml` exists so the parity story is a positive record, not an implicit understanding.

The doctrine does not mean both harnesses must be built at the same time — deferring the Pi implementation until the CC primitive is proven is explicitly supported. What it does mean is that the *plan* for the Pi side exists at the moment the CC side ships, even if the implementation is marked `pending`. Silent deferral is the antipattern; explicit deferral is the norm.

## Day-to-day rhythm

A typical session on this project:

1. **Prime.** Run `/rag-web-prime`. Read its four-axis report. This is the mental model.
2. **Work.** Edit source, edit plans, add primitives. If the work involves layout or responsive design, start the local preview server (`tools/scripts/preview.sh start` or `/rag-web-preview start`) so that a phone or tablet on the same network can load the working `site/` directory in a real browser. If the work is substantive, there is a plan doc covering it; if a new substantive direction emerges mid-session, the close step will produce the plan.
3. **Review.** For CSS changes, dispatch `rag-web-css-auditor` and `rag-web-token-enforcer`. For visible changes, dispatch `rag-web-visual-reviewer`. For responsive layout work, verify on a physical device via the preview server. Resolve findings.
4. **Close.** Run `/rag-web-close`. Review the verify report, let the adaptive documentation dispatch run, review the agent outputs, then make the commit decision.

The commit belongs to the operator. The close routine presents; the operator chooses.

## What happens if the conventions drift

Each convention has a visible failure mode and a named antipattern in `CLAUDE.md`:

- `CLAUDE.md` accumulates structural content → "Inventorial CLAUDE.md" — relocate the structural content to prime reads or `docs/`.
- A CC primitive ships without a Pi mirror entry → "Cross-harness drift" — add the `pi-agents.yaml` row and a `## Pi Mirror` entry in the plan doc that introduced the primitive.
- The close routine or a dispatched agent commits without operator review → "Auto-commit on close" — revert, rebuild the close step to present rather than write.

The antipatterns are named so they can be talked about. "That's auto-commit drift" is a short sentence that does a lot of work in a review. Each one includes the failure mode, the correct behavior, and the reason — so that the *why* survives the original context, which is the whole point of the Naur framing that runs through this project's docs.

## Cross-references

- `CLAUDE.md` at project root — the durable rules.
- `.claude/commands/rag-web-prime.md` — the prime command definition.
- `.claude/commands/rag-web-close.md` — the close command definition.
- `pi-agents.yaml` at project root — the Pi-mirror registry.
- [`plans/_template.md`](plans/_template.md) — the plan-doc template.
- [`architecture.md`](architecture.md) — the theory the conventions serve.
- [`design-system.md`](design-system.md) — the editorial design theory: what the site claims, how it makes that visible, and what invariants keep it recoverable.
- [`troubleshooting.md`](troubleshooting.md) — named failure modes from the editorial-masthead iteration; each entry is a pattern, not an incident report.
- [`preview.md`](preview.md) — the local preview server; when and why to run it during a session.
