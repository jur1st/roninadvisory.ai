# Architecture

The first question worth answering is: what is this project, in the world?

It is a marketing site for the Ronin Advisory Group — a small advisory firm that wants a durable, legible public surface. The site is the firm's front door: a handful of pages, some prose, a contact path, and a visual voice that should not feel generated. It is not a product, not a CMS, not an application. The value it carries is almost entirely in its content and its composure. Every structural decision on this project flows from that starting observation.

Two things follow directly from the shape of the artifact.

**The publishing target is GitHub Pages.** A static origin, no server runtime, no background jobs, no database. Whatever the site needs to do at runtime, it does in the visitor's browser off a CDN. This is not a constraint we work around; it is a constraint we design into. If a feature would require a server we either do without it or drop back to a third-party embed the visitor's browser can load directly.

**The source is hand-written HTML and CSS.** No static-site generator, no framework, no build step by default. A small marketing site is a place where the authoring voice is the product, and pushing authoring through a generator's abstraction is a poor trade. `CLAUDE.md` carries this as an invariant: no SSG, no framework, no build tooling without explicit approval. When a tool is approved (Playwright is the existing case), the approval is recorded in the plan document that introduced it, and the tool runs only in the developer workflow — never in the shipped payload.

## The layers and what they map to

The project has four working layers. Reading them in this order gives the mental model:

1. **`site/`** — the publishable surface. `site/index.html` is the live page. `site/static/tokens.css` is the design contract. Anything under `site/` is, in principle, what GitHub Pages serves.

2. **`docs/dev/`** — the theory. Developer-facing documentation, this file included. Plans live under `docs/dev/plans/`. Versioned with the source; read by humans and by agents. If something belongs in `CLAUDE.md` but is structural rather than durable, this is where it goes.

3. **`.claude/`** and **`pi-agents.yaml`** — the agentic layer. Claude Code primitives live under `.claude/commands/` (slash commands) and `.claude/agents/` (subagent definitions). `pi-agents.yaml` tracks each primitive's Pi-harness status. The prefix is `rag-web-*` on everything project-specific, so that the project's commands do not shadow generic ones in the user's `~/.claude/`.

4. **`tools/`** — developer-only tooling. `tools/scripts/*.sh` are the runtime-neutral entry points; `tools/package.json` + `tools/node_modules/` hold the Playwright dev dependency. Nothing under `tools/` ships to GitHub Pages.

A visitor sees only layer 1. A contributor edits layer 1 mediated by the contracts set down in layers 2 and 3, with layer 4 as the loop for verifying the result. Losing sight of that gradient — treating `docs/`, `.claude/`, and `tools/` as if they were part of the site — is the most common way to degrade the shape.

## Why the token contract is shaped the way it is

`site/static/tokens.css` is the single source of every visual property that appears on the page: colors, typography stacks, type scale, line heights, letter spacing, a spatial grid, and a handful of layout widths. Nothing in `site/index.html` — or in any future CSS we write — should hard-code a hex, an `oklch()`, a pixel, or a font name.

Three design pressures shape the file.

**First, OKLch is the working color space, not sRGB.** OKLch is perceptually uniform: a 10% change in lightness looks like a 10% change on screen, regardless of hue. This makes the dark-mode palette an honest transform of the light-mode palette rather than a hand-adjusted parallel track. The site's dark mode is not a second theme — it is the same theme, read under different ambient conditions.

**Second, every semantic color declares itself three times.** Static hex fallback, then OKLch token, then a `light-dark()` call. The browser picks the last declaration it understands:

- A browser old enough not to parse `oklch()` falls to the hex.
- A browser that parses `oklch()` but not `light-dark()` lands on the mid-line token.
- A modern browser gets the full `light-dark()` behavior.

This is progressive enhancement as a deliberate design: a site that reads correctly on a five-year-old phone *and* honors a fresh dark-mode preference on a 2026 browser, with no runtime switch and no server-side variant. The `rag-web-css-auditor` agent enforces the three-line pattern so the contract cannot silently erode.

**Third, space is tokenized on a quarter-rem grid** (`--space-1` = 0.25rem through `--space-24` = 6rem). Rem rather than px so the scale respects the visitor's root-size preference. A grid rather than arbitrary numbers because once "margin: 18px" appears in one place, "margin: 17px" appears in another, and the composition loses rhythm. The `rag-web-token-enforcer` agent maps raw pixel values back to the nearest token so that drift surfaces at review time, not six months later.

The metaphor worth naming: tokens are the project's **design vocabulary**. Every page speaks with the same words. If a page needs a word that isn't in the vocabulary, the correct move is to add it to the vocabulary — not to smuggle a one-off hex into the HTML.

See [`tokens.md`](tokens.md) for the full catalog and worked examples, and [`authoring.md`](authoring.md) for the enforcement contract.

## The session-management three-way contract

Agent sessions on this project are mediated by three files in concert:

- **`CLAUDE.md`** at project root holds durable rules: the project's role, the invariants ("hand-written HTML/CSS only"), and the named antipatterns. It is auto-loaded at the start of every session. It carries only content that is still true next quarter.
- **`/rag-web-prime`** at session start reads live ground truth: git state, directory tree, plan docs, last summary, Pi config. It never writes, never dispatches, never touches memory. Its job is to materialize the mental model a contributor (human or agent) needs before acting.
- **`/rag-web-close`** at session end verifies the prime reads, runs adaptive documentation dispatch, and surfaces the commit decision to the operator. It never auto-commits.

Each file owns one kind of artifact. `CLAUDE.md` owns invariants. The prime command owns the session snapshot. The close command owns the session ledger. The failure mode we design around — captured in `CLAUDE.md` as the "inventorial CLAUDE.md" antipattern — is collapsing two of these into one. If `CLAUDE.md` starts listing file layouts, it rots within weeks because the layouts drift and the file never gets re-read. If the prime command starts writing session notes, the snapshot becomes entangled with commentary and loses its ground-truth character. The separation is the design.

The antipattern that most often corrupts this is **auto-commit on close**. A well-intentioned close routine that commits its own output robs the operator of the review gate. `/rag-web-close` is explicit about this: it presents options (commit as-is, commit selected paths, discard, leave for next session) and waits. The commit belongs to the operator, and the command is built to remain orchestrative, never write-by-itself.

See [`contributing.md`](contributing.md) for the full contract and the plan-doc convention that rides on top of it.

## The dual-harness doctrine

This project is designed to be worked on from two agentic runtimes: Claude Code and Pi Agent. Both are first-class. When a primitive ships for Claude Code — a slash command, an agent, a skill — an entry for the Pi mirror is recorded in `pi-agents.yaml`, even when the Pi side is deferred.

The reason is contained in the named antipattern: **cross-harness drift**. The failure mode is that a primitive is added to `.claude/` and a Pi equivalent is simply never planned. Over a quarter, the project accumulates enough Claude-Code-specific hooks that the Pi side is no longer reachable without substantial re-engineering. The deferral was silent, and the lock-in was gradual enough to be invisible. Defending against that failure mode requires a positive record, not the absence of one — which is what `pi-agents.yaml` provides.

Three `mirror_status` values carry the full vocabulary:

- `shipped` — the Pi analog exists and is active.
- `pending` — the CC side exists; the Pi analog is deferred but planned.
- `not-applicable` — no Pi analog is intended, with an inline justification.

`/rag-web-close` reads this file as part of its Pi-harness follow-up check. If a file under `.claude/` changed and the matching `pi-agents.yaml` entry is absent, the operator is told. A `pending` status is fine; silence is not.

The cost of the record is low — one YAML row per primitive. The cost of the drift it prevents is a whole harness.

## Where this leaves us

The whole project, seen in one frame: a marketing site with publisher-grade typography and dark-mode fidelity, built by hand against a token contract, authored through an agentic workflow that is itself designed for two runtimes, with every structural rule carrying the failure mode it was written to prevent.

The theory lives in these documents. The code is the part that a fresh reader will still understand; the reasons are what you lose if you lose the people who made it. This is what the Naur framing is pointing at, and it is the framing the rest of these docs are written under.
