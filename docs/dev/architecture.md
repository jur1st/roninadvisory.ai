# Architecture

The first question worth answering is: what is this project, in the world?

It is a marketing site for the Ronin Advisory Group — a small advisory firm that wants a durable, legible public surface. The site is the firm's front door: a handful of pages, some prose, a contact path, and a visual voice that should not feel generated. It is not a product, not a CMS, not an application. The value it carries is almost entirely in its content and its composure. Every structural decision on this project flows from that starting observation.

Two things follow directly from the shape of the artifact.

**The publishing target is GitHub Pages.** A static origin, no server runtime, no background jobs, no database. Whatever the site needs to do at runtime, it does in the visitor's browser off a CDN. This is not a constraint we work around; it is a constraint we design into. If a feature would require a server we either do without it or drop back to a third-party embed the visitor's browser can load directly.

**The source is hand-written HTML and CSS.** No static-site generator, no framework, no build step by default. A small marketing site is a place where the authoring voice is the product, and pushing authoring through a generator's abstraction is a poor trade. `CLAUDE.md` carries this as an invariant: no SSG, no framework, no build tooling without explicit approval. When a tool is approved (Playwright is the existing case), the approval is recorded in the plan document that introduced it, and the tool runs only in the developer workflow — never in the shipped payload.

## The layers and what they map to

The project has four working layers. Reading them in this order gives the mental model:

1. **`site/`** — the publishable surface. `site/index.html` is the live page. `site/static/tokens.css` is the design contract. `site/.nojekyll` is a required marker file that signals GitHub Pages to skip its Jekyll processor and serve the hand-written HTML as-is. Anything under `site/` is what the deploy workflow uploads as the artifact.

2. **`.github/workflows/deploy-pages.yml`** — the deployment surface. A two-job CI workflow: a preflight job (link-check, token validation, `actionlint`, `.nojekyll` presence check) and a deploy job (uploads `site/` as a Pages artifact via `actions/upload-pages-artifact@v5` with `include-hidden-files: true`, then deploys via `actions/deploy-pages@v5`). Triggers on pushes to `main` that touch `site/` or the workflow file itself. The `include-hidden-files: true` flag is load-bearing — without it, `.nojekyll` is excluded from the artifact and Jekyll processing resumes. See `docs/dev/pages/README.md` and the skill at `.claude/skills/rag-web-pages-deploy/`.

3. **`docs/dev/`** — the theory. Developer-facing documentation, this file included. Plans live under `docs/dev/plans/`. Versioned with the source; read by humans and by agents. If something belongs in `CLAUDE.md` but is structural rather than durable, this is where it goes.

4. **`.claude/`**, **`.pi/`**, and **`pi-agents.yaml`** — the agentic layer. Claude Code primitives live under `.claude/commands/` (slash commands), `.claude/agents/` (subagent definitions), and `.claude/skills/` (skill libraries). Pi primitives live under `.pi/agents/` (agent definitions), `.pi/extensions/` (TypeScript extensions that register TUI commands and event hooks), and `.pi/profiles/` (provider-keyed model-routing maps). `pi-agents.yaml` at the repo root tracks each primitive's Pi-harness status across both directories. The prefix is `rag-web-*` on everything project-specific, so that the project's commands do not shadow generic ones in the user's `~/.claude/` or the Pi TUI.

5. **`tools/`** — developer-only tooling. `tools/scripts/*.sh` are the runtime-neutral entry points; `tools/package.json` + `tools/node_modules/` hold the Playwright dev dependency; `tools/preview/` holds the stdlib-only Go binary that serves `site/` over localhost for cross-device responsive review. Nothing under `tools/` ships to GitHub Pages. Both Playwright and the Go preview server were approved explicitly as dev dependencies — the approval model is recorded in the plan doc or session notes that introduced each tool, and the approval criterion is the same in both cases: dev workflow only, zero shipping surface.

A visitor sees only layer 1. A contributor edits layer 1 mediated by the contracts set down in layers 3 and 4, with layer 5 as the loop for verifying the result, and layer 2 as the gate from commit to public URL. Losing sight of that gradient — treating `docs/`, `.claude/`, `.github/`, and `tools/` as if they were part of the site — is the most common way to degrade the shape.

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

## The dual-harness is now operational

As of the pi-agent-parity branch, the Pi side is no longer aspirational — it ships the same writer constellation the CC side ships, via a different dispatch mechanism with the same output contract.

The architecture has two legs:

**CC leg.** `/rag-web-close` dispatches four writer agents (`changelog`, `dev`, `user`, `agent`) as native Claude Code subagents, in parallel, using CC's built-in agent infrastructure. Defined in `.claude/commands/rag-web-close.md`. CC's permission model is the safety layer; no extensions required.

**Pi leg.** The same four writers live under `.pi/agents/` as model-agnostic `.md` files. Two dispatch paths reach them:

- `/rag-web-pi-close` (`.claude/commands/rag-web-pi-close.md`) — invoked from inside a CC session. Composes a task prompt, writes it to `/tmp/rag-web-pi-task.prompt`, and shells out to `tools/scripts/rag-web-pi-team.sh`, which spawns four `pi` subprocesses in parallel via the `drive` tmux layer (falling back to raw tmux when `drive` is absent). Logs land under `.the-grid/pi-runs/<timestamp>/`.
- `/rag-web-team` (`.pi/extensions/rag-web-team.ts`) — registered inside the Pi TUI when the extension is loaded. Fans out the same four writers as Pi subprocesses via `child_process.spawn`, with a grid widget showing per-agent status. The operator chooses this path when Pi is already the active harness.

The asymmetry is intentional and named: the CC-side entry point is a prompt-template command; the Pi-side entry point is a TypeScript extension with a TUI command. Both invoke the same underlying agent `.md` files. Both produce identical artifacts.

### Profile-based model routing

Pi's dispatch is model-agnostic at the agent level. The agent `.md` files carry no `model:` field. Model selection happens at launch time via profile files under `.pi/profiles/`:

- `anthropic.json` — maps each writer to a model string in the `anthropic/claude-*` namespace. The changelog writer runs Haiku (cheaper, summary work); the three substantive writers run Sonnet 4.6.
- `openrouter.json` — same mapping through the OpenRouter provider. Authored this session and exercised end-to-end.

The operator selects a profile with `--profile=<name>` on the launcher or by setting `$RAG_WEB_PI_PROFILE` in the environment. No agent file is touched when switching providers. A Gemini profile is deferred until Gemini keys land; committing an empty profile would be a misrepresentation.

This is the decision captured in plan `04`: hardcoding models per agent makes a provider swap a per-file edit; a single `defaultModel` in `settings.json` lacks per-agent granularity at swap time. Profiles thread the needle.

### Safety at three layers

The Pi dispatch path runs `pi --no-extensions` for each subprocess, which means the interactive-TUI `rag-web-checkpoint.ts` extension does not fire inside the subprocess. Safety is covered at three distinct points instead:

1. **Tool allowlist (front-door lock).** Every subprocess Pi instance receives `--tools read,grep,find,ls,write,edit`. No `bash`. This is the narrowest safe surface for document writers. A writer that can't exec a shell can't delete the repo.

2. **Launcher checkpoint (pre-fanout git commit).** Both `rag-web-pi-team.sh` and `rag-web-team.ts` issue a `git commit --allow-empty -m "pi-checkpoint: rag-web-team <timestamp>"` before spawning subprocesses. If the fanout produces a wrong write, `git reset --hard HEAD^` restores pre-fanout state exactly.

3. **TUI-layer checkpoint (interactive sessions).** When a developer runs Pi interactively with `rag-web-checkpoint.ts` loaded, an empty commit fires on every `turn_start`. This covers exploratory Pi sessions that are not a fanout — the extension is the per-turn undo button. Subprocess runs bypass it by design (`--no-extensions`) and get the launcher checkpoint instead.

The three layers address different threat surfaces. The allowlist prevents the wrong action. The launcher checkpoint enables recovery from a wrong write. The TUI checkpoint enables turn-by-turn recovery during interactive exploration. They are not redundant; each covers ground the others do not.

## Where this leaves us

The whole project, seen in one frame: a marketing site with publisher-grade typography and dark-mode fidelity, built by hand against a token contract, authored through an agentic workflow that runs on two runtimes — each with its own dispatch path, a shared set of agent definitions, and a safety posture tuned to how that runtime works — with every structural rule carrying the failure mode it was written to prevent.

The Pi harness is no longer a planned future state. `.pi/` is a working directory. The four docs-writers run from it. The model-routing layer is exercised. The recovery checkpoints fire. A contributor joining today can work from either harness and produce the same results.

The theory lives in these documents. The code is the part that a fresh reader will still understand; the reasons are what you lose if you lose the people who made it. This is what the Naur framing is pointing at, and it is the framing the rest of these docs are written under.
