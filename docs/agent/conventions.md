# Conventions — the rules and the failure modes behind them

Every convention in this file exists because something went wrong, or would go wrong, without it. A convention recorded without its failure mode rots: the next contributor who sees a "good reason" to ignore it has nothing to weigh against that reason. The conventions are kept here, in one place, with their warrants intact.

Source: [`CLAUDE.md`](../../CLAUDE.md). This file extends — never duplicates — the durable rules recorded there.

---

## The three `CLAUDE.md` antipatterns

### Inventorial CLAUDE.md

- **Failure mode.** File layouts, tech-stack lists, and "current state" copy accumulate in `CLAUDE.md` and go stale within weeks. A stale rulesfile is worse than a missing one — it lies with authority. A future agent reads the inventory, trusts it, and reasons from an inaccurate map.
- **Rule.** Structural content goes into prime reads (live each session) or `docs/` (versioned and explicitly maintained). `CLAUDE.md` holds only durable role, rules, and antipatterns.
- **Rule warrant.** Single-layer persistence designs fail. The three-way contract (prime / `CLAUDE.md` / close) exists so each layer owns one kind of artifact: prime owns live state, `CLAUDE.md` owns durable rules, close owns reconciliation. Blurring it collapses the design. If `CLAUDE.md` grows beyond ~80 lines, the cause is almost always inventorial drift; split the durable-but-long material into `docs/agent/` and link from `CLAUDE.md`.

### Cross-harness drift

- **Failure mode.** A Claude Code primitive is added to `.claude/` and the Pi equivalent is never built. Over sessions, the project silently locks to one harness. No single commit causes the violation; the accumulated omission does.
- **Rule.** When a CC primitive ships, open a follow-up task for the Pi mirror and surface it at the next `/rag-web-close`. The surface is [`pi-agents.yaml`](../../pi-agents.yaml); the check is the Pi-harness-follow-up step in `/rag-web-close`.
- **Rule warrant.** `README.md` requirement #1 commits the project to supporting both harnesses. Silent single-harness lock-in violates that commitment. See [`harness.md`](harness.md) for the full doctrine and the `mirror_status` schema.

### Auto-commit on close

- **Failure mode.** `/rag-web-close` or a dispatched agent commits changes without operator review. The operator discovers the project's theory shifted without their consent — history then carries decisions the operator never made.
- **Rule.** `/rag-web-close` presents uncommitted changes with four options (commit as-is, commit selected paths, discard specific changes, leave for next session) and waits for the operator. Dispatched agents never commit.
- **Rule warrant.** Close is read + orchestrate, never write-by-itself. The commit gate belongs to the operator. The design keeps close incapable of the crossing because a gate that the gatekeeper can open from inside the room is not a gate.

---

## The plan-doc convention

Plans under [`docs/dev/plans/`](../../docs/dev/plans/) are the project's theory-preservation mechanism for larger bodies of work. They are not task lists; they are the record of *why* a body of work was shaped the way it was. The decisions blocks, in particular, are load-bearing source material for a future contributor trying to rebuild the theory.

### The template

Plans are authored from [`docs/dev/plans/_template.md`](../../docs/dev/plans/_template.md). The template's sections are not suggestions:

- **Scope** — one sentence on what this plan accomplishes and what it explicitly does NOT. Explicit non-scope prevents drift during execution.
- **Out of scope (deferred)** — list form. Named non-goals survive the session; unnamed ones get re-proposed next session.
- **Current ground truth** — what exists, what's absent, citing files and recent commits. Anchors the plan in observable state, not recollection.
- **Steps** — concrete, numbered, ordered.
- **`## Pi Mirror`** — required. See below.
- **Acceptance criteria** — concrete checks, including the two parity checks the template already provides.
- **Decisions** — resolved decisions with dates. This block is what a future contributor reads to understand why the plan looks the way it does.

### The `## Pi Mirror` section — required

Every plan doc carries a `## Pi Mirror` section. The close command checks for it and flags a missing section as a parity-convention violation.

For each CC primitive the plan introduces or modifies, the section records:

- **Name** — the primitive's name
- **Pi shape** — what the Pi analog looks like (same YAML entry, a separate script, nothing, etc.)
- **Expected `mirror_status` after this plan** — `shipped`, `pending`, or `not-applicable`
- **Justification** — required when `not-applicable`; names the asymmetry

If the plan modifies no primitive under `.claude/`, the section is present but contains exactly:

> *N/A — this plan modifies no primitive under `.claude/`.*

The explicit N/A is the point. Silence is indistinguishable from oversight; a present-but-null section is unambiguous. A plan that elides the section entirely is treated as a violation even if its scope is genuinely outside `.claude/` — the check enforces the convention, not the content.

### Why plans are the theory record

Commits record what changed; plans record why the change was possible. A decision made in the flow of a session — "use `light-dark()` with a static fallback because the token resolves in both modes" — lives in the plan's Decisions block. Three months later, a contributor wondering whether they can simplify the three-line CSS pattern reads the decision and understands what they would be giving up. The antipattern the decision prevented is recorded; the alternatives considered are recorded. The plan is how the project's theory outlives the session that made it.

---

## `.the-grid/` — session-artifact policy

The project's session-management machinery writes under `.the-grid/`. Its contents fall into two categories, and the split is deliberate:

### Tracked (part of project history)

- `.the-grid/sessions/context_bundles/` — session context bundles written at close.
- `.the-grid/sessions/summaries/` — human-readable session summaries, paired with their JSON siblings.
- `.the-grid/sessions/index.jsonl` — the append-only session index.
- `.the-grid/config/<hostname>-SYSTEM-ENV.md` — machine environment profile, regenerated by `/prime-env`.

These are the record. A future contributor reading through the session summaries should be able to reconstruct the arc of the project's development; they are as much a part of the theory as the code is.

### Ignored (ephemeral)

- `.the-grid/sessions/beacons/` — transient session-start markers.
- `.the-grid/sessions/hook_logs/` — hook execution traces.

These exist only for the duration of a session's tooling. Tracking them would dilute history with noise and make diffs illegible. The gitignore entry enforces the split at the VCS layer; the convention records why.

### The split matters

A common mistake is to treat all session machinery as one category — either tracking everything (and drowning the history) or ignoring everything (and losing the summaries). The split exists because `context_bundles/` and `summaries/` *are* the project's memory across sessions, while `beacons/` and `hook_logs/` are scaffolding that should vanish when the session ends.

---

## The skill layer — what a skill is, and why it is not an agent or a command

Prior to plan 03, the agentic layer had two kinds of primitives: commands (user-invocable entry points under `.claude/commands/`) and agents (orchestrated instruments under `.claude/agents/`). Plan 03 introduced the first project-level skill: [`rag-web-pages-deploy`](../../.claude/skills/rag-web-pages-deploy/).

A skill is a **progressive disclosure surface and reference library**. It bundles:

- A `SKILL.md` — the theory of the domain it owns (what GitHub Pages is, why this project uses it the way it does, an entry-point table, doctrine). Naur-voice; ≤200 lines.
- A `reference/` directory — dated, re-verification-scheduled documentation. Each file opens with `verified: YYYY-MM-DD` and a cadence. Reference docs rot on a schedule the project can see and act on; `SKILL.md` does not recapitulate them.
- A `templates/` directory — scaffold files that commands copy into place (e.g., the workflow YAML, the `.nojekyll` marker).

A skill is not a replacement for agents or commands:

- It does not execute anything. Agents execute.
- It is not user-invoked. Commands are user-invoked.
- It is auto-loaded when the operator touches the skill's domain files (`site/`, `.github/workflows/`, `site/.nojekyll`) and user-invocable via the associated commands.

The design intention from plan 03 (Decision 5): "skill structure adopted. Progressive disclosure for the dated spec, durable theory surface for future sessions, locality for the runbook cluster." The alternative — embedding the GitHub Pages spec, workflow commentary, rollback runbook, and troubleshooting catalogue directly in agent bodies or command files — would distribute dated content across primitives that have no re-verification cadence, producing invisible staleness.

When a skill is added, its `pi-agents.yaml` entry's `mirrors:` value points to the skill directory, not a file. The parity obligation applies to the skill tree as a whole.

---

## Known issues

### Name collision: `rag-web-pages-deploy` (skill) vs `/rag-web-pages-deploy` (command)

The skill at `.claude/skills/rag-web-pages-deploy/` and the command at `.claude/commands/rag-web-pages-deploy.md` share a name. The harness dispatches correctly — skill lookup is by directory, command lookup is by file — but any display that lists both primitives in one view (e.g., a slash-command autocomplete that includes skills) will show `rag-web-pages-deploy` twice without distinguishing context.

This is cosmetic, not functional. No behavioral change has been observed; the naming was intentional (the command wraps the skill's deploy path) and the convention of naming them symmetrically aids readability in individual context but creates display ambiguity in aggregate views.

**Resolution path if this becomes operationally confusing:** rename the command to `/rag-web-pages-push` to distinguish the user-facing trigger from the skill. This would require updating the command file, `pi-agents.yaml`, the `SKILL.md` entry-point table, and any `agents.md`/`commands.md` references. Until it causes a real dispatch error, treat as cosmetic.

---

## Pi extensions — a new primitive class

Prior to plan 04, the Pi agentic surface had only agents and settings. Plan 04 introduced *extensions*: TypeScript modules that wire into Pi's event API (`turn_start`, `session_start`) and register TUI commands. Extensions are not agents (they do not run on tasks) and not commands (they are not prompt-template files invoked by the operator). They are runtime hooks.

Six extensions ship with this project:

- [`.pi/extensions/rag-web-checkpoint.ts`](../../.pi/extensions/rag-web-checkpoint.ts) — fires on `turn_start` in interactive Pi TUI sessions; issues `git commit --allow-empty` so `git reset --hard HEAD^` undoes a turn. `mirror_status: not-applicable` — CC enforces safety via harness-native permission modes; no CC analog is meaningful.
- [`.pi/extensions/rag-web-team.ts`](../../.pi/extensions/rag-web-team.ts) — registers `/rag-web-team`; spawns four Pi subprocesses in parallel with an in-TUI grid widget; issues its own pre-fanout checkpoint. `mirror_status: shipped` — the CC analog is `/rag-web-pi-close`.
- [`.pi/extensions/rag-web-session.ts`](../../.pi/extensions/rag-web-session.ts) — registers `/rag-web-prime` and `/rag-web-close`; topic-grouped bundle for the two session-management commands. `mirror_status: shipped`.
- [`.pi/extensions/rag-web-pages.ts`](../../.pi/extensions/rag-web-pages.ts) — registers `/rag-web-pages-{init,check,deploy,rollback}`; consumes the CC `rag-web-pages-deploy` skill's `reference/` and `templates/` directly by path. `mirror_status: shipped`.
- [`.pi/extensions/rag-web-preview.ts`](../../.pi/extensions/rag-web-preview.ts) — registers `/rag-web-preview`; thin wrapper over `tools/scripts/preview.sh`. `mirror_status: shipped`.
- [`.pi/extensions/rag-web-damage-control.ts`](../../.pi/extensions/rag-web-damage-control.ts) — interactive-TUI safety interceptor; guards bash-enabled agents. `mirror_status: not-applicable` — CC has no analog (harness-native permission modes). See the three-layer safety contract section below.

All six are tracked in `pi-agents.yaml` under the `extensions:` bucket. Adding a new extension requires a registry entry in that bucket. The `mirror_status` logic is identical to other buckets: `shipped` means a CC behavioral equivalent exists; `not-applicable` means no CC analog is planned, with justification in the `scope` field.

---

## The three-layer safety contract for Pi writers

When Pi writer subprocesses run — whether via the CC `rag-web-pi-team.sh` launcher or the Pi `rag-web-team` extension — three independent safety layers apply. Understanding all three is required before adding or modifying any Pi writer, because each layer guards a distinct failure mode.

**Layer 1 — Tool allowlist (front-door lock).** Every Pi writer's frontmatter declares `tools: read,grep,find,ls,write,edit`. No `bash`. This means a writer subprocess cannot run shell commands, cannot invoke `git`, and cannot reach outside its declared writable paths via the shell. A writer that needs `bash` is not a docs-writer — it is a different kind of agent and requires a different safety posture. The allowlist is enforced at subprocess spawn by the `--tools` flag passed to `pi`.

**Layer 2 — Interactive-TUI checkpoint.** [`.pi/extensions/rag-web-checkpoint.ts`](../../.pi/extensions/rag-web-checkpoint.ts) fires on `turn_start` in interactive Pi TUI sessions and issues `git commit --allow-empty -m "pi-checkpoint: <agent-name> <ISO>"`. This means any turn that produces a wrong write is recoverable with `git reset --hard HEAD^`. This layer protects the operator during direct interactive Pi use.

**Layer 3 — Orchestrator-layer checkpoint.** Subprocess Pi runs pass `--no-extensions`, which bypasses the TUI-layer checkpoint entirely. Both orchestrators (`rag-web-pi-team.sh` and `rag-web-team.ts`) issue their own `git commit --allow-empty -m "pi-checkpoint: rag-web-team <ISO>"` before fanout. This covers the gap that `--no-extensions` creates.

The three layers are additive and non-redundant:

| Layer | What it prevents | What bypasses it |
|---|---|---|
| Tool allowlist | Shell escape, path bleed via bash | Nothing in normal operation |
| TUI checkpoint | Bad writes in interactive turns | `--no-extensions` subprocess runs |
| Orchestrator checkpoint | Bad writes in fanout runs | (nothing — covers the `--no-extensions` gap) |

Plan 05 introduced the damage-control layer for `bash`-enabled Pi agents: [`.pi/extensions/rag-web-damage-control.ts`](../../.pi/extensions/rag-web-damage-control.ts) (copied verbatim from the reference implementation) loads `.pi/damage-control-rules.yaml` on `session_start` and intercepts `tool_call` events in interactive Pi TUI turns to block destructive bash patterns and enforce zero-access / read-only / no-delete path lists. This layer guards interactive use; it does not apply inside subprocess runs (which pass `--no-extensions`) — layer 3 covers that gap. The three-layer contract is now complete and operational across the full agentic surface, including shell-enabled agents.

---

## Asymmetric primitive shape

A CC primitive and its Pi analog may be `mirror_status: shipped` even when their implementation shapes are completely different. This is expected behavior, not a registry error.

The canonical example: `/rag-web-pi-close` is a CC prompt-template command file; its Pi mirror is `.pi/extensions/rag-web-team.ts`, a TypeScript extension that registers a TUI command. One is a Markdown file invoked via the CC slash-command dispatcher; the other is compiled TypeScript hooked into Pi's event system. Both produce the same behavioral contract: four writers fan out in parallel, logs accumulate under `.the-grid/pi-runs/`, the operator sees a summary and a commit gate.

The rule for registering an asymmetric pair:
1. Both sides get their own `pi-agents.yaml` entry in the appropriate bucket (`commands:` for the CC side, `extensions:` for the Pi extension).
2. Each entry's `scope` line names the counterpart and the asymmetry explicitly.
3. Both entries carry `mirror_status: shipped`.

What is NOT acceptable: a single entry that tries to represent both sides, or a `shipped` entry whose counterpart has not been built.

---

## Pi profile files — model routing without per-agent frontmatter

Pi writer agents do not carry a `model:` field in their frontmatter. Model selection is deferred to `.pi/profiles/<name>.json` files, resolved at subprocess spawn time. The orchestrator passes `--model <resolved>` to each `pi` invocation.

This design was chosen in plan 04 (Decision 4) over hardcoded-per-agent (inflexible to provider swap) and single-`defaultModel`-in-settings (lacks per-agent overrides). The profile file maps `default` and `per_agent.<agent-name>` to model strings.

Available profiles at this time: `anthropic` (`.pi/profiles/anthropic.json`), `openrouter` (`.pi/profiles/openrouter.json`), and `gemini` (`.pi/profiles/gemini.json`, added in plan 05 once `GEMINI_API_KEY` was confirmed). All three profiles carry a `per_agent` entry for every active rag-web agent — an agent missing from a profile will fall to `default`, which is acceptable only when made explicit, not by omission.

When adding a new Pi writer agent: add its name to the `per_agent` block of every existing profile file. An agent missing from a profile will run on the `default` model — this may be acceptable, but it should be an explicit decision, not an omission.

---

## The design-system contract

The canonical design-token catalog is [`site/static/tokens.css`](../../site/static/tokens.css). That file is not a stylesheet — it is the vocabulary the site's visual direction speaks in. The editorial-masthead direction (`docs/dev/plans/04-design-system-lock-in.md`) is the shipped design; the catalog's shape encodes that direction: two-ink palette (`--color-ink` / `--color-paper`) with a single second accent (`--color-mark`, oxblood), no state tokens (`--color-success` / `--color-warning` / `--color-error` are absent by design), an editorial type scale (`--size-xs` through `--size-5xl`), rule weights, and page-margin tokens.

Three quality-gate agents enforce compliance against this contract:

- [`rag-web-css-auditor`](../../.claude/agents/rag-web-css-auditor.md) — enforces the three-line semantic-color fallback pattern (static hex → OKLch token → `light-dark()` semantic pair) in every component color declaration.
- [`rag-web-token-enforcer`](../../.claude/agents/rag-web-token-enforcer.md) — catches hardcoded CSS values (hex, pixel spacing, literal font strings) that should reference a catalog token.
- [`rag-web-visual-reviewer`](../../.claude/agents/rag-web-visual-reviewer.md) — scores the rendered UI against the 25-point sophistication rubric; token compliance is one scored dimension.

All three reference `site/static/tokens.css` by file path. They read the live catalog at invocation time; they carry no hardcoded token names in their bodies, so a catalog evolution that adds or renames tokens does not silently break them.

`rag-web-visual-reviewer` has an additional constraint: **all browser interaction routes through `tools/scripts/capture-screenshot.sh`**, the single sanctioned capture surface. The wrapper owns viewport dimensions, device scale factor, and `data-theme` pinning (the attribute the site's inline theme script reads). An ad-hoc sibling script is not a valid workaround — it fragments the capture contract and makes reviews unreproducible. Reviews need to be reproducible because a score from a different viewport, scale, or theme state is not comparable to the previous score. If the wrapper cannot express what a review needs, the wrapper gets extended and the agent body updated to document the new flag. This was codified after the design-system plan's Step 10 surfaced a live case where a viewport gap forced the reviewer to author `_review-capture.js` inline; the remediation was `--viewport` and `--scale` flags in the wrapper and explicit removal of the escape hatch from the agent body.

- **Failure mode.** Rewriting the token catalog without a plan doc. Token-catalog drift is indistinguishable from vocabulary drift — the catalog *is* the vocabulary. A change that swaps `--color-mark` for `--color-accent-red`, or adds a fourth ink without a rationale, shifts the visual argument of the site without leaving a traceable decision. A future contributor reading the CSS sees a different design without understanding what changed or why.
- **Rule.** A change to the token catalog is a theory-level change. It deserves a plan doc — scope, decision block, Pi Mirror section — before the first token is renamed. Patch-level corrections (typo in a comment, a hex fallback that resolves to the wrong shade) do not require a plan; palette shape changes do.
- **Rule warrant.** The design-system-lock-in plan records the decision to lock in the editorial direction and provides the decision trail (why oxblood and not a third ink, why no state colors, why the type scale stops at `--size-5xl`). A future plan that expands or reshapes the catalog should do the same. The validator gate (`tools/scripts/validate-tokens.sh`) enforces the minimums mechanically; the plan doc enforces the *reason* the minimums are what they are.

---

## The `rag-web-*` namespace

All project-specific slash commands, agents, and skills carry the `rag-web-*` prefix. Global or sibling-project primitives do not.

- **Failure mode without it.** A global agent named `docs-writer` lives at `~/.claude/agents/docs-writer.md`. A project-specific agent named `docs-writer` lives at `.claude/agents/docs-writer.md`. The project's version shadows the global, *or* the global shadows the project's, depending on resolution order. Either way, the operator cannot invoke both, and collisions are silent.
- **Rule.** Every project-specific primitive is prefixed `rag-web-*`. The rule is absolute: `/rag-web-prime`, `/rag-web-close`, `rag-web-docs-dev-writer`, `rag-web-visual-reviewer`, and so on.
- **Rule warrant.** The prefix scopes the project's primitives so that the operator can invoke both project and global primitives in the same session without collision. The prefix is load-bearing because agent and slash-command resolution is by name, not by location.

When a new primitive is added, confirm the `rag-web-*` prefix is present before the entry is added to `pi-agents.yaml`. An unprefixed project primitive is not "project-specific" — it is a trap for the next operator.
