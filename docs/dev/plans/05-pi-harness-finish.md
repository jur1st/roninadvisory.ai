# Pi Harness Finish — Quality Gates, Deploy Pipeline, Command Mirrors

**Scope:** Close the remaining Pi parity debt from plan 04 — author the damage-control extension that gates bash-enabled Pi agents, stand up the Gemini profile, mirror the four quality-gate agents and three deploy-pipeline agents, and port the seven remaining slash commands to Pi extensions. At the end of this plan, `pi-agents.yaml` has no `pending` entries except `rag-web-docs-vault-exporter` (explicitly deferred). This plan does NOT author new CC primitives, modify existing CC primitives, build the vault-exporter mirror, or rewrite existing Pi primitives from plan 04.

**Out of scope (deferred):**

- `rag-web-docs-vault-exporter` Pi mirror — waits on Obsidian vault standup
- New CC primitives of any kind — this plan is pure parity work
- Upstream contribution of damage-control rules additions back to the Pi reference project
- Model-switcher utility (queued post-pilot per plan 04 roadmap)
- Pi equivalent of the `rag-web-pages-deploy` *skill* as a Pi skill surface — see Decision 3

---

## Current ground truth

**What plan 04 shipped.** Four docs-writer Pi agents at `.pi/agents/rag-web-docs-{changelog,dev,user,agent}-writer.md`, two extensions (`rag-web-checkpoint.ts`, `rag-web-team.ts`), two profiles (`anthropic.json`, `openrouter.json`), and `.pi/AGENTS.md` symlinked to `CLAUDE.md`. The writers constellation is `shipped` on both harnesses. The `rag-web-pi-close` ↔ `rag-web-team` asymmetric pair is `shipped`. Plan 04 Decision 6 explicitly deferred the damage-control extension "until the plan that introduces the first bash-enabled Pi agent" — this plan is that plan.

**What is still `pending` in `pi-agents.yaml`.** Seven commands (`rag-web-prime`, `rag-web-close`, `rag-web-pages-init`, `rag-web-pages-check`, `rag-web-pages-deploy`, `rag-web-pages-rollback`, `rag-web-preview`), eight agents (`rag-web-docs-vault-exporter` plus seven quality/deploy agents), one skill (`rag-web-pages-deploy`). The vault-exporter is deferred; the remaining fifteen entries are this plan's scope.

**Supporting reference material.**

- Damage-control reference extension at `/Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/examples/pi-vs-claude-code/extensions/damage-control.ts` (209 lines)
- Spec at `.../examples/pi-vs-claude-code/specs/damage-control.md`
- Starter rules YAML at `/Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/skill/templates/damage-control-yaml.md`
- Pi command-registration pattern at `.../ai_docs/pi_official/examples-extensions/commands.ts`
- The CC-side Pages skill (`.claude/skills/rag-web-pages-deploy/`) — its `reference/` directory is consumed by Pi command extensions directly by path; see Decision 3

**Keys landed.** `GEMINI_API_KEY` exported from `~/.config/zsh/secrets.zsh` as of 2026-04-21. The `gemini.json` profile that plan 04 refused to commit empty is now honest to author.

**Current branch.** `pi-agent-parity`, clean working tree after this plan is committed. Recent history is dominated by `pi-checkpoint:` commits from a Gemini-routed Pi session; the pilot is proven operational on the Anthropic, OpenRouter, and Google sides.

---

## Phase 1 — Unblock (sequential)

Three tasks that gate the fanout. Sequential because each phase-2 track depends on at least one.

### Step 1 — Author `.pi/profiles/gemini.json`

**Goal.** Honest parity across profiles; the four docs-writers plus the seven new agents all appear in the per-agent map.

1. Create `.pi/profiles/gemini.json` with the same shape as `anthropic.json`:
   - `default`: `google/gemini-2.5-pro` (or the current production-preview tag — match what `openrouter.json` has been using minus the `openrouter/` prefix)
   - `per_agent`: one entry per rag-web agent that exists after this plan. The changelog writer can drop to `google/gemini-2.5-flash` the way anthropic drops it to haiku.
2. Add the same new-agent entries to `anthropic.json` and `openrouter.json` so all three profiles stay in sync. An agent missing from a profile falls to `default` — acceptable, but every profile must list every agent deliberately, not by omission.
3. Smoke-test: `pi -p --profile gemini "hello"` returns a response. No quality assertion required at this step; we're validating key plumbing, not output.

### Step 2 — Author `.pi/extensions/rag-web-damage-control.ts`

**Goal.** The safety gate that makes bash-enabled Pi agents acceptable. Without it, tracks C and D are unsafe to ship.

1. Copy the reference implementation verbatim from `/Volumes/home/00-Meta/02-Tools-Config/02.59-Pi-Agent/examples/pi-vs-claude-code/extensions/damage-control.ts` to `.pi/extensions/rag-web-damage-control.ts`. Do NOT fork or rewrite — the intent is upstream-compatible consumption.
2. Copy the starter rules YAML from `.../skill/templates/damage-control-yaml.md` to `.pi/damage-control-rules.yaml`. Project-level rules file (not global) so the rules travel with the repo.
3. Add rag-web-specific additions to the rules file:
   - `zeroAccessPaths`: `.the-grid/sessions/context_bundles/` (operator-sensitive session records)
   - `readOnlyPaths`: `.pi/extensions/rag-web-checkpoint.ts` (safety-load-bearing, should not be edited by an agent)
   - `noDeletePaths`: `.claude/`, `.pi/`, `pi-agents.yaml`
4. Smoke-test with a deliberately bad turn in an interactive Pi session:
   - Interactive Pi turn asks an agent to run `rm -rf node_modules`. Damage-control should block with "Security Policy Violation: rm with recursive or force flags".
   - Interactive Pi turn asks an agent to `cat .env`. Damage-control should block (zero-access) or prompt per rule flags.
5. Register the extension in operator's interactive Pi flow. The `rag-web-team.ts` fanout already passes `--no-extensions` to subprocesses, so damage-control does not apply inside subprocess runs — it guards interactive use. Subprocess safety continues to come from the tool allowlist + orchestrator checkpoint (layers 1 and 3 of the three-layer contract).

### Step 3 — Decide skill-bucket disposition

**Goal.** Resolve how `rag-web-pages-deploy` (a CC skill) appears in Pi registry after this plan. See Decision 3.

Action: flip the `skills:` entry from `mirror_status: pending` to `mirror_status: not-applicable`. Update the `scope:` line to record: *"Pi has no skill-primitive class equivalent; CC's `rag-web-pages-deploy/SKILL.md` + `reference/` + `templates/` tree is consumed by `.pi/extensions/rag-web-pages.ts` directly by path. The reference docs and templates are harness-agnostic; only the CC-side progressive-disclosure dispatch is CC-specific."*

---

## Phase 2 — Fanout (parallel tracks C, D, E)

After phase 1 lands and commits, three tracks run concurrently. Any harness: three parallel CC `Agent()` calls, or three Pi subprocesses dispatched via a one-off `rag-web-pi-team.sh` invocation.

### Track C — Quality-gate agent Pi mirrors (4 agents)

**Goal.** Parity for the agents the operator invokes explicitly or the `web-frontend` skill dispatches against named CSS/visual targets.

For each of `rag-web-css-auditor`, `rag-web-token-enforcer`, `rag-web-visual-reviewer`, `rag-web-visual-test-writer`:

1. Author `.pi/agents/<name>.md` with YAML frontmatter: `name`, `description` (copy-down from CC agent), `tools: read,grep,find,ls,write,edit,bash`. No `model:` — profiles supply that.
2. Body mirrors the CC agent's scope and procedure, translated to Pi conventions: lowercase tool names, reference `tools/scripts/validate-tokens.sh` / `tools/scripts/capture-screenshot.sh` by relative path, no `<Task>` tags or CC-specific agent-loop language.
3. `rag-web-visual-reviewer` keeps its heavier-model role: in `per_agent`, map it to the profile's strongest model (`claude-opus-4-7` on anthropic, `google/gemini-2.5-pro` on gemini). CC agent frontmatter notes `effort: high`; Pi has no effort field — model strength substitutes.
4. Manual single-agent invocation per writer against a realistic prompt. Verify output lands in the intended reporting shape and no path bleed occurs.
5. Add each to `per_agent` in all three profile files.

### Track D — Deploy-pipeline agent Pi mirrors (3 agents)

**Goal.** Parity for the three mechanical-plus-one-advisory agents that own the GH Pages lifecycle.

For each of `rag-web-pages-preflight`, `rag-web-pages-verify`, `rag-web-pages-rollback-advisor`:

1. Author `.pi/agents/<name>.md` with frontmatter matching the CC analog's declared tools plus `bash` (preflight needs `actionlint`, `lychee`, `validate-tokens.sh`; verify needs `gh api`, `curl`; advisor needs `gh api`).
2. Body adapted to Pi conventions, same structural shape as the CC agent (procedure, hard gates, reporting format, constraints).
3. `rag-web-pages-rollback-advisor` stays on the strongest model in every profile — the CC analog is `opus + effort: high` for the worst-day-of-the-year decision; Pi mirror uses the strongest model in each profile (`claude-opus-4-7`, `openrouter/google/gemini-2.5-pro`, `google/gemini-2.5-pro`).
4. Manual invocation per agent against a realistic input. Preflight runs against the current `site/` tree; verify runs against a live `ronin.example`; advisor runs with the last three deployments as input data.
5. Add each to `per_agent` in all three profile files.

### Track E — Command extension mirrors (7 commands → 3 extensions)

**Goal.** Make `/rag-web-prime`, `/rag-web-close`, `/rag-web-pages-{init,check,deploy,rollback}`, and `/rag-web-preview` invokable from inside the Pi TUI.

Per Decision 2, 7 commands collapse into 3 Pi extensions grouped by topic. Pi extensions can register multiple commands per file; the bundling reduces boilerplate and colocates shared state.

1. **`.pi/extensions/rag-web-session.ts`** — registers `/rag-web-prime` (read-only prime report equivalent to the CC slash command's Run + Read blocks) and `/rag-web-close` (adaptive dispatcher: inspects diff, spawns the four docs-writer agents via `child_process.spawn` the same way `rag-web-team.ts` does, surfaces Pi-drift findings, gates the commit). Reads `CLAUDE.md`, `pi-agents.yaml`, `docs/agent/` — the same ground truth the CC side reads.
2. **`.pi/extensions/rag-web-pages.ts`** — registers `/rag-web-pages-init`, `/rag-web-pages-check`, `/rag-web-pages-deploy`, `/rag-web-pages-rollback`. Consumes `.claude/skills/rag-web-pages-deploy/reference/` and `templates/` directly by path (see Decision 3). Dispatches the three Pi deploy-pipeline agents from track D.
3. **`.pi/extensions/rag-web-preview.ts`** — registers `/rag-web-preview` with the same subcommand verbs as the CC side (`start`, `stop`, `status`, `restart`, `logs`). Thin wrapper over `tools/scripts/preview.sh`; harness-agnostic script is already in the assets bucket.

4. Each extension follows the `rag-web-team.ts` shape: default export function taking `ExtensionAPI`, registers commands via `pi.registerCommand`, renders structured reports via the UI API. No shortcuts — these are operator-driven slash commands, not hotkey actions.
5. Manual invocation per command inside a Pi TUI session. The output must be equivalent to the CC analog's output — same structured report, same gate-and-wait semantics for `/rag-web-close`, same idempotency-guard for `/rag-web-pages-init`.

---

## Phase 3 — Registry + verification

**Goal.** `pi-agents.yaml` reflects reality; `/rag-web-close` drift check is clean.

1. Flip `mirror_status` for the four quality-gate agents, three deploy-pipeline agents, seven commands, and the skill — per track-by-track deliverables.
2. Register the new extensions in `pi-agents.yaml` under `extensions:`:
   - `rag-web-session` (new, `mirror_status: shipped`, scope names the command-bundling asymmetry)
   - `rag-web-pages` (new, `shipped`, scope names the skill-consumption path)
   - `rag-web-preview` (new, `shipped`, scope points to the shell script it wraps)
   - `rag-web-damage-control` (new, `mirror_status: not-applicable`, scope records "Pi-only YOLO-mitigation layer; CC enforces safety via harness-native permission modes — same category as `rag-web-checkpoint`")
3. Update `docs/agent/harness.md` cross-harness-drift section to record that plan 05 cleared the `pending` backlog for everything except vault-exporter.
4. Update `docs/agent/agents.md` dispatch table Pi columns for the quality-gate and deploy-pipeline agents; same for command rows in `docs/agent/commands.md`.
5. Verify `/rag-web-close` no longer surfaces these entries in its Pi-harness-follow-up check.

---

## Pi Mirror

Every primitive this plan introduces or modifies:

- **Name:** `.pi/profiles/gemini.json` (NEW)
  - **Pi shape:** Profile file, same shape as `anthropic.json` and `openrouter.json`; parity with those two.
  - **Expected `mirror_status` after this plan:** N/A — profiles are Pi-only by nature, no CC analog class. Tracked under `settings:` if registered at all.
- **Name:** `.pi/extensions/rag-web-damage-control.ts` (NEW)
  - **Pi shape:** Pi extension copied verbatim from reference tree; project rules at `.pi/damage-control-rules.yaml`.
  - **Expected `mirror_status` after this plan:** `not-applicable` — same justification as `rag-web-checkpoint`; CC uses harness-native permission modes.
- **Name:** `.claude/agents/rag-web-css-auditor.md`, `rag-web-token-enforcer.md`, `rag-web-visual-reviewer.md`, `rag-web-visual-test-writer.md` (track C)
  - **Pi shape:** `.pi/agents/<name>.md`, same role, Pi-tool-surface vocabulary, tool allowlist adds `bash`.
  - **Expected `mirror_status` after this plan:** `shipped` (each).
- **Name:** `.claude/agents/rag-web-pages-preflight.md`, `rag-web-pages-verify.md`, `rag-web-pages-rollback-advisor.md` (track D)
  - **Pi shape:** `.pi/agents/<name>.md`, same role, `bash` in allowlist.
  - **Expected `mirror_status` after this plan:** `shipped` (each).
- **Name:** `.claude/commands/rag-web-prime.md`, `rag-web-close.md` (track E, session bundle)
  - **Pi shape:** Both commands registered by a single extension at `.pi/extensions/rag-web-session.ts` (asymmetric shape — CC prompt-template files ↔ one Pi TS extension registering two commands).
  - **Expected `mirror_status` after this plan:** `shipped` for both. Scope names the bundling asymmetry.
- **Name:** `.claude/commands/rag-web-pages-{init,check,deploy,rollback}.md` (track E, pages bundle)
  - **Pi shape:** All four commands registered by `.pi/extensions/rag-web-pages.ts` (asymmetric shape — CC prompt-template files ↔ one Pi TS extension registering four commands).
  - **Expected `mirror_status` after this plan:** `shipped` for all four.
- **Name:** `.claude/commands/rag-web-preview.md` (track E, solo)
  - **Pi shape:** `.pi/extensions/rag-web-preview.ts` (asymmetric shape — CC prompt-template file ↔ Pi TS extension).
  - **Expected `mirror_status` after this plan:** `shipped`.
- **Name:** `.claude/skills/rag-web-pages-deploy/`
  - **Pi shape:** No direct analog. Reference docs and templates are consumed by `.pi/extensions/rag-web-pages.ts` directly by path.
  - **Expected `mirror_status` after this plan:** `not-applicable` — Pi has no skill-primitive class; the skill's content is harness-agnostic and consumed by path.

---

## Acceptance criteria

- [ ] `.pi/profiles/gemini.json` exists with `default` + complete `per_agent` coverage for all eleven rag-web agents. `anthropic.json` and `openrouter.json` updated to match coverage.
- [ ] `pi -p --profile gemini "hello"` returns a response — key plumbing verified.
- [ ] `.pi/extensions/rag-web-damage-control.ts` copied verbatim from reference; `.pi/damage-control-rules.yaml` present with starter rules plus rag-web additions.
- [ ] Interactive Pi session with damage-control loaded blocks `rm -rf node_modules` with the expected reason string.
- [ ] Interactive Pi session blocks or prompts on `cat .env` per rule flags.
- [ ] Four Pi quality-gate agents present under `.pi/agents/` with `bash` in their tool allowlist and `model:` absent. Each produces its intended report on manual invocation.
- [ ] Three Pi deploy-pipeline agents present under `.pi/agents/`. Preflight reports pass/fail against current `site/` tree; verify reports divergence against a live URL; advisor produces a proposal structure given three deployments.
- [ ] Three new Pi command extensions (`rag-web-session.ts`, `rag-web-pages.ts`, `rag-web-preview.ts`) present. Seven commands invokable from inside Pi TUI.
- [ ] `/rag-web-prime` inside Pi TUI produces a report equivalent to the CC side (five axes, same structural shape).
- [ ] `/rag-web-close` inside Pi TUI dispatches docs-writers in parallel and gates the commit without committing.
- [ ] `/rag-web-pages-check` inside Pi TUI invokes `rag-web-pages-preflight` Pi agent and relays its structured report.
- [ ] `pi-agents.yaml`: seven commands, four quality-gate agents, three deploy-pipeline agents flipped to `shipped`; `rag-web-pages-deploy` skill flipped to `not-applicable` with justification; three new extensions added (`shipped`); `rag-web-damage-control` extension added (`not-applicable` with justification).
- [ ] `/rag-web-close` Pi-harness-follow-up check is clean — the only remaining `pending` entry is `rag-web-docs-vault-exporter`.
- [ ] `docs/agent/harness.md`, `agents.md`, `commands.md` updated to reflect the new Pi surface.
- [ ] `## Pi Mirror` section present and accurate (enforced by `/rag-web-close`).

---

## Decisions (resolved 2026-04-22)

1. **Plan execution shape = single phased plan, not split across two.** Rejected: split into 05 (phase 1 + command mirrors) and 06 (quality gates + deploy pipeline). The phased-single-plan approach honors the operator's standing "execute approved plans in a single pass" rule — decisions block pre-resolves every shape question so phase 2 runs without re-gating per track. The split alternative would have added a full plan-doc round trip between tracks for no material clarity gain.

2. **Command mirror bundling = topic-grouped extensions, not 1:1 per command.** Seven CC commands collapse into three Pi extensions (`session` = prime + close; `pages` = init + check + deploy + rollback; `preview` = preview). Rejected: one extension per command (7 files, redundant boilerplate, no shared-state benefit); one grand-unified extension (single point of failure, harder to reason about). Topic grouping matches how the CC skill tree already clusters these — the Pages commands share the `rag-web-pages-deploy` skill content; prime/close share the session-management contract. A Pi extension is a natural carrier for a related cluster.

3. **Skill bucket disposition = `not-applicable` with path-consumption scope.** Pi has no skill-primitive class equivalent. The CC `rag-web-pages-deploy/SKILL.md` + `reference/` + `templates/` tree contains two kinds of content: Naur-voice theory (SKILL.md) and dated-with-re-verification reference documentation. Both are harness-agnostic — the theory is true regardless of harness; the dated references (GitHub Pages spec, preflight checklist, rollback runbook, troubleshooting catalogue) are useful to any caller. Rejected: port the skill tree to a `.pi/skills/` directory (Pi would not auto-load it; value is zero); mirror each reference file by copy (duplicates stale-propagation surface for dated content). Chosen: `.pi/extensions/rag-web-pages.ts` reads `.claude/skills/rag-web-pages-deploy/reference/*.md` by path, and the `not-applicable` status with a scope line naming "consumed by path" records the decision for future contributors.

4. **Damage-control scope = project-level rules, reference extension verbatim.** Rules file at `.pi/damage-control-rules.yaml` (travels with the repo, works for any operator on any machine). Extension body copied verbatim from the reference project — we intend rules-list additions to flow upstream when they prove out, not to fork the TypeScript. Rejected: global rules at `~/.pi/damage-control-rules.yaml` (machine-specific, undiscovered by a fresh checkout); fork-and-adapt the TypeScript (divergence debt for no near-term gain).

5. **Gemini profile coverage = all eleven agents, honest defaults.** Every rag-web agent appears in `per_agent`; the changelog writer drops to `gemini-2.5-flash` the way anthropic drops it to haiku; the visual-reviewer and rollback-advisor ride the strongest model. Rejected: add only the writers now, add gates/pipeline-agents per-track (silent coverage gaps between plan landing and next registry sweep); inherit all agents from `default` (wastes the plan-04-established `per_agent` convention). All three profiles updated symmetrically — a profile file missing an agent is a lie by omission.

6. **Fanout mechanism for phase 2 = harness-agnostic.** Tracks C, D, E can be fanned out as three parallel CC `Agent()` tool calls from the primary agent, OR as a one-off `rag-web-pi-team.sh` invocation with a custom task prompt pointing at this plan. Either harness runs the fanout; neither mechanism imposes new infrastructure. Rejected: build a plan-specific launcher (overkill — the infrastructure already exists on both sides).

7. **Phase boundaries are commit boundaries.** Phase 1 commits before phase 2 begins. Phase 2 commits per track (three commits on the fanout, not one giant). Phase 3 commits as a single registry-and-docs sweep. Rejected: one commit per primitive (churn); one commit for the whole plan (loses the checkpoint that makes a bad track recoverable via `git reset` without losing the others).
