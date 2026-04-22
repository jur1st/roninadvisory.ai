# Harness — the dual-harness doctrine

This project has two first-class runtimes: Claude Code and Pi Agent. Every project-specific primitive — slash command, agent, skill — is expected to exist, or be explicitly excused, on both sides. That symmetry is the doctrine. This file records why, how it is tracked, and what breaks when it is ignored.

---

## Why two harnesses

The commitment is a project rule, not a preference. From [`CLAUDE.md`](../../CLAUDE.md):

> Both harnesses are first-class. When a Claude Code primitive ships, open a follow-up for the Pi equivalent — silent single-harness lock-in is a rule violation.

Read that as intent, not as ceremony. The purpose of supporting both harnesses is that the project must remain workable if one of them becomes unavailable — a model deprecation, an API outage, a change in operator preference. A codebase that can only be operated by one agent runtime has implicitly become a client of that runtime. The `rag-web-*` primitives exist at the project layer precisely so that allegiance runs the other way: the harnesses serve the project.

The practical implication: a CC-only primitive is not "done." It is half-shipped. The other half may be `pending` or `not-applicable`, but the decision must be recorded.

---

## The drift registry — `pi-agents.yaml`

[`pi-agents.yaml`](../../pi-agents.yaml) at the repo root is the single registry that tracks parity. Every file under `.claude/` that embodies a project primitive has an entry, plus select root artifacts whose harness coupling matters. The file is the Pi envelope in the same way that `CLAUDE.md` is the CC envelope — neither envelope is the implementation, both are the contract.

### Schema

```yaml
version: 1

commands:
  - name: <primitive-name>
    mirrors: <path-to-cc-file>
    mirror_status: shipped | pending | not-applicable
    scope: >-
      <one-paragraph purpose statement>

agents:   [ ... same shape ... ]
skills:   [ ... same shape ... ]
settings: [ ... same shape ... ]
assets:   [ ... same shape ... ]
```

Six top-level buckets (`commands`, `agents`, `skills`, `extensions`, `settings`, `assets`) exist so that a primitive's *kind* is preserved even when its Pi shape does not resemble the CC shape at all. A Pi "command" may be a script; a Pi "agent" may be a YAML entry in a different registry; a Pi "extension" is a TypeScript module that hooks into Pi's event API — a class of primitive that has no CC equivalent. The bucket survives; the file format does not have to.

The `extensions:` bucket was added in plan 04 to record Pi-specific runtime hooks (`rag-web-checkpoint.ts`, `rag-web-team.ts`). An extension entry with `mirror_status: not-applicable` signals that no CC analog exists or is meaningful — the exemption is structural, not a gap.

The `skills:` bucket is now populated — the `rag-web-pages-deploy` skill is the first project-level skill, added in plan 03. A skill's `mirrors:` value points to a directory, not a file (`mirrors: .claude/skills/rag-web-pages-deploy/`), because the skill is a structured tree (SKILL.md + reference/ + templates/), not a single primitive. The drift check still applies: a skill entry with `mirror_status: pending` means the Pi side of the skill tree has not been built.

The `assets:` bucket captures harness-agnostic files that are meaningful to the deployment lifecycle but require no Pi mirror. Current entries: `tools/scripts/` (shell scripts, harness-agnostic), `site/index.html + tokens.css` (published artifacts, harness-agnostic), `.github/workflows/deploy-pages.yml` (GitHub infrastructure, runs regardless of harness), and `site/.nojekyll` (static marker consumed by GitHub's Pages builder). Adding an asset entry does not open a parity obligation; the `scope` field must name the asymmetry.

The preview server (`tools/preview/` Go binary, `tools/scripts/preview.sh`) is registered in this bucket as `not-applicable`. The binary and script are harness-agnostic — both CC and Pi invoke the same script against the same binary. Only the slash-command surface (`/rag-web-preview`) is harness-specific and carries `mirror_status: pending` in the `commands:` bucket. This is the canonical example of a split entry: one logical feature, two registry entries at different parity status, neither wrong.

### `mirror_status` — three values, each with a meaning

| Value | When to use | What it asserts |
|---|---|---|
| `shipped` | The Pi implementation exists, is active, and mirrors the CC primitive's behavior. | Parity is real. No follow-up owed. |
| `pending` | The CC side exists; the Pi side is a committed follow-up, not yet built. | Parity is owed. `/rag-web-close` will flag this on every session that touches the primitive until the Pi side lands or the status is changed. |
| `not-applicable` | No Pi analog is planned. The `scope` field must carry the justification. | Parity is deliberately waived. The failure mode (silent single-harness lock-in) does not apply because the decision is explicit. |

`not-applicable` is the escape hatch, and it is load-bearing. Some artifacts — `tools/package.json`'s Playwright dev dependency, the publishable `site/` scaffold, shell scripts under `tools/scripts/` — are either harness-agnostic or specific to one harness's internal loop. Forcing a Pi mirror on them would be ritual, not parity. The registry records the exemption with its reason; the antipattern check skips entries marked `not-applicable`.

### Asymmetric primitive shape

Two CC and Pi primitives can be `mirror_status: shipped` even when their file formats are completely different. The `rag-web-pi-close` / `rag-web-team` pair is the canonical example: the CC side is a prompt-template command file (`.claude/commands/rag-web-pi-close.md`); the Pi side is a TypeScript extension that registers a `/rag-web-team` TUI command (`.pi/extensions/rag-web-team.ts`). Both are `shipped`. The `scope` line in each registry entry names the asymmetry; the `mirror_status` asserts that the behavioral contract is equivalent.

The rule: `mirror_status: shipped` means the output contract is equivalent, not that the primitive's shape is identical. A `scope` line that names the asymmetry is required whenever the shapes differ.

### What the registry does not do

It does not execute anything. It is a reviewable artifact. `/rag-web-close` reads it to flag drift; an operator reads it to audit; a future coding agent reads it to know which primitives are half-shipped. The file may be reshaped as Pi's schema matures — entries survive the reshape because they carry their scope in prose.

---

## The cross-harness-drift antipattern

Recorded in [`CLAUDE.md`](../../CLAUDE.md):

- **Failure mode:** a Claude Code primitive is added under `.claude/`, and the Pi equivalent is never built. Over sessions, the project silently locks to one harness. The commitment from `README.md` is violated not by a single decision but by accumulated omission.
- **Mitigation:** when a CC primitive ships, an entry is added to `pi-agents.yaml` — `shipped` if the Pi side lands in the same plan, `pending` if it is a follow-up, `not-applicable` with justification if no Pi analog is intended. `/rag-web-close` checks every modified `.claude/` file against the registry and surfaces missing or `pending` entries at the session boundary.
- **Rule warrant:** `README.md` requirement #1. Silent lock-in violates the project's stated intent. The rule exists because the drift is not visible inside a single session — it only becomes visible when a future operator discovers that a primitive they expected on both sides exists on only one.

The check runs in `/rag-web-close` under the `Pi-harness follow-up` section. See [`commands.md`](commands.md) for the contract.

As of plan 04, the four docs-writers (`rag-web-docs-{changelog,dev,user,agent}-writer`) were the first agents to clear `pending` status, proving the dual-harness doctrine operational for the writers constellation. Plan 05 (2026-04-22) extended that parity to the full agentic surface: the four quality-gate agents, three deploy-pipeline agents, and all seven slash commands are now `shipped` on both harnesses. The only remaining `pending` entry is `rag-web-docs-vault-exporter`, explicitly deferred to Obsidian vault standup. The dual-harness doctrine is now operational across every active primitive, not merely the writers.

---

## How to add a primitive, correctly

1. Write the CC side under `.claude/commands/` or `.claude/agents/`.
2. Add the entry to `pi-agents.yaml` in the right bucket, with `scope` written as a real description (not a restatement of the file name).
3. Pick the `mirror_status` that matches reality — if the Pi side will not be built this session, `pending` is honest; `shipped` is not.
4. If `not-applicable`, write the justification in `scope`. "Harness-specific" alone is insufficient; name the asymmetry.
5. The plan doc covering the change carries a `## Pi Mirror` section (see [`conventions.md`](conventions.md)) recording the same expectation. The registry and the plan agree or the plan is wrong.

If any of these steps is skipped, `/rag-web-close` will flag the omission on the session that introduced it. The operator then fixes it or records why it is acceptable. The point is not to prevent every drift — the point is to prevent *silent* drift.
