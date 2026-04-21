# Visual QA

A site whose value is in its composure needs a review loop that can see the rendered result. This project's loop is a three-part assembly: a Playwright CLI wrapper that captures screenshots, a sonnet agent that generates systematic capture scripts for multi-state pages, and an opus agent that scores the captures against a sophistication rubric.

The design decision worth naming up front: **the Playwright CLI wrapper is the entire browser story on this project.** There is no Chrome DevTools MCP integration, no remote browser bridge, no manual navigation primitive. Every browser interaction — by a human, by an agent, by a script — routes through `tools/scripts/capture-screenshot.sh`. This is deliberate, and the reason is a direct reading of the `CLAUDE.md` rule against build tooling without explicit approval. Playwright was approved in [`plans/02-web-frontend-localization.md`](plans/02-web-frontend-localization.md) as a dev dependency with a bounded surface: one wrapper script, two flags, one output artifact. Approving it as "Playwright, generally" would invite drift toward a full test harness, which is not what this site needs and not what was approved.

If the wrapper is insufficient for a task, the correct move is to extend it — or add a sibling `tools/scripts/*.sh` — not to bypass it. The rule is what it is because a bypassed wrapper is a bypassed approval.

## The wrapper

`tools/scripts/capture-screenshot.sh` is a thin bash shell around a Playwright inline node script. It does four things:

1. Validates that `bun` is on PATH and that `tools/node_modules/playwright` exists.
2. Launches headless Chromium.
3. Navigates to the URL, waits for `networkidle`, optionally injects `.dark` on `<html>`.
4. Writes the screenshot to the output path, or exits non-zero if the file was not created.

**Invocation:**

```
./tools/scripts/capture-screenshot.sh <url> <output.png> [--full-page] [--dark]
```

**Flags:**

- `--dark` — sets the Playwright context's `colorScheme` to `dark` *and* injects a `.dark` class on `<html>` after navigation. Both are done because some dark-mode strategies read the media query while others read the class; the wrapper covers both so the captured image matches what a visitor with `prefers-color-scheme: dark` would see.
- `--full-page` — captures the full scrollable height rather than the viewport. Useful for long pages where the viewport crop would hide the review target.

**Default viewport:** 1280×720. This is hard-coded in the inline node script the wrapper emits. It is deliberate: the two quality-gate agents capture at this size for light and dark, and the third captures at mobile. A single desktop default means callers who don't care get consistent output.

**Exit code is load-bearing.** The wrapper exits non-zero if the output file did not land on disk, even if the node script printed no visible error. Scripts that loop over many invocations depend on this — a silent write failure would otherwise produce a stale screenshot set.

## The two agents

**`rag-web-visual-test-writer`** (sonnet, background) generates shell scripts that capture a systematic cross-product of page states. Given an HTML file or page spec, it identifies interactive states (default, hover, focus, error, empty, loading) and produces a script like `tools/scripts/capture-<page>.sh` with one `capture-screenshot.sh` invocation per combination of theme (light, dark) × viewport × state. The naming convention is `<page>-<state>-<viewport>-<theme>.png`, which sorts usefully: all of a page's shots cluster together, and within a page all states cluster together.

The script template it generates parameterizes `BASE_URL` and `OUT_DIR` via environment variables (defaulting to `http://localhost:3000` and `screenshots/`). This is enough variability to run the same script against a local dev server and a deployed preview.

**`rag-web-visual-reviewer`** (opus, foreground) is the scorer. It captures three screenshots — light desktop, dark desktop, mobile light — reads the sophistication rubric at `~/.claude/skills/web-frontend/reference/sophistication-rubric.md`, and scores the rendered UI on nine dimensions totaling 25 points. Each dimension requires cited visual evidence ("the h1 is flush against the border at the top, no padding") and failures carry remediation strings. The reviewer does not guess: if a screenshot fails to capture, it halts and reports the error rather than scoring from imagination.

The review is the authoritative loop. The auditor and enforcer agents (see [`authoring.md`](authoring.md)) gate the CSS on pattern compliance; the visual reviewer gates the render on what the eye actually sees. A site can be fully token-compliant and still look wrong — and a site can look right while carrying drift the auditor would catch. Both loops are needed; neither subsumes the other.

## The mobile-viewport limitation

The wrapper defaults to a 1280×720 viewport and does not accept a viewport flag. This is a deliberate minimum — the inline script is small and legible, and every flag added to it expands the surface the two agents have to reason about. For the common "light and dark at desktop" case, the default is correct.

Mobile captures (390×844, matching iPhone 15 Pro) are out of reach of the wrapper as written. Two ways to address this, both acceptable, both named in the `rag-web-visual-reviewer` agent definition:

1. **Mobile wrapper variant.** Add `tools/scripts/capture-screenshot-mobile.sh` as a sibling. Same shape as the desktop wrapper, different hard-coded viewport. The duplication is the point: two scripts, each simple, neither parameterized into complexity. A reviewer invokes either one explicitly.

2. **Ad-hoc node script.** For a one-off mobile capture, write a small `.js` file that uses the Playwright API directly and run it under `bun`. The Playwright CLI surface block embedded in both visual agents lists this as a sanctioned path (`node <custom.js>`). Useful when the captured viewport varies across invocations or when testing a breakpoint at a non-standard width.

Neither option parameterizes the primary wrapper. Adding `--viewport WIDTHxHEIGHT` to `capture-screenshot.sh` would be natural and is consciously declined: the wrapper's job is "capture the authoritative desktop view," and "capture anything at any size" is a different tool with a different maintenance surface.

If mobile capture becomes a recurring need, the right move is the sibling script (option 1). If mobile capture remains occasional, the ad-hoc node script (option 2) is cheaper.

## The Playwright CLI surface, in full

The authoritative surface, as embedded verbatim in both `rag-web-visual-reviewer` and `rag-web-visual-test-writer`:

```
bunx playwright --version                  # confirm install
bunx playwright install chromium           # idempotent browser install
bunx playwright codegen <url>              # interactive script generation
bunx playwright open <url>                 # launch inspector
node <custom.js>                           # run ad-hoc Playwright scripts

./tools/scripts/capture-screenshot.sh <url> <out.png> [--full-page] [--dark]
  - Default viewport 1280x720 (override by editing the inline script)
  - --dark sets context colorScheme=dark AND injects .dark on <html>
  - --full-page captures scrollable height, not just viewport
  - Exits non-zero if the output file was not created
```

The surface is embedded in both agents rather than referenced, so context compaction cannot remove it. If an agent's context gets trimmed, the Playwright invocations it needs survive; the agent never has to "recall" how the wrapper is called.

## What this loop replaces

A more conventional project would wire Playwright into a test harness — `playwright test`, fixtures, config files, screenshot diffing, a CI step, maybe Chromatic. This project deliberately does none of that, for three reasons rooted in the scope:

- **No CI gates today.** The site deploys via GitHub Pages from `main`. A failed test run in CI would not prevent a visitor from seeing the change.
- **No regression baseline.** The site is pre-launch and pre-content. Diffing against a prior screenshot protects against nothing that matters yet.
- **The review is subjective, and opus is the right reviewer.** A pixel-diff test would fire on intentional design changes and never fire on the things that actually matter (rhythm, hierarchy, dark-mode fidelity). The sophistication rubric is what actually scores what matters, and it needs a model that can reason about composition.

When the site ships real pages and the operator decides a regression guard is worth the maintenance, the path forward is `playwright test` with a small, hand-curated baseline — not a `testing.md` primer, which is why this document is the whole testing story for now.

## The full capture-review rhythm

Given a page with a new edit:

1. The author (human or agent) edits `site/index.html` and/or `site/static/tokens.css`.
2. For CSS changes, the CSS auditor and token enforcer run first. Findings resolved.
3. `./tools/scripts/capture-screenshot.sh file://$PWD/site/index.html /tmp/home-light.png` — sanity check the light render.
4. `./tools/scripts/capture-screenshot.sh file://$PWD/site/index.html /tmp/home-dark.png --dark` — sanity check the dark render.
5. Dispatch `rag-web-visual-reviewer` for a scored review.
6. Address remediation strings. Iterate from step 3.

For a page with many interactive states, `rag-web-visual-test-writer` generates a `tools/scripts/capture-<page>.sh` script that replaces steps 3–4 with one invocation producing the full matrix.

The rhythm is as fast as it is because the wrapper is as narrow as it is. Every capability added to the wrapper is a capability that the agents have to reason about and that review sessions can get bogged down in. The smallest tool that does the job is the right tool.

## Cross-references

- [`authoring.md`](authoring.md) — the CSS auditor and token enforcer that gate the code side.
- [`tokens.md`](tokens.md) — the token contract the visual reviewer is implicitly scoring against.
- [`plans/02-web-frontend-localization.md`](plans/02-web-frontend-localization.md) — the Playwright approval scope.
