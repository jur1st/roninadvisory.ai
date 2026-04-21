# Workflow authoring — commentary

**verified:** 2026-04-21
**re-verify cadence:** 90 days

Line-by-line commentary on `templates/deploy-pages.yml`. Every decision is documented here. If the workflow drifts from this doc, one or the other is wrong — don't leave the ambiguity in place.

## Triggers

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'site/**'
      - '.github/workflows/deploy-pages.yml'
  workflow_dispatch:
```

- Only `main`. Pages deploys from production; feature branches don't need to trigger a deploy.
- `paths:` filter — don't waste a deploy on changes that can't affect the served artifact (e.g., docs edits, agent definition changes, changelog updates).
- The workflow file itself is in the filter. Without that, a typo-fix in the workflow wouldn't trigger a deploy using the corrected workflow.
- `workflow_dispatch` — manual trigger. Useful for re-deploys without pushing and for rollback via `gh workflow run --ref <sha>`.

## Permissions

See `github-pages-spec-apr2026.md`. Scoped at the workflow level because both jobs need `contents: read`; scoping `pages: write` and `id-token: write` per-job adds verbosity without meaningfully reducing attack surface for a public repo.

## Concurrency

See `github-pages-spec-apr2026.md`. `cancel-in-progress: false` is a hard requirement.

## Preflight job

Runs on `ubuntu-latest`. Installs `lychee` and `actionlint` from upstream release tarballs rather than via `apt` because apt's versions lag; the workstation and CI runner should run the same binary version.

Steps in order:

1. `actions/checkout@v4` — fetch the repo.
2. Install preflight tools — tarball downloads, small enough to inline.
3. `actionlint` on the workflow file — catches YAML and expression errors before a push triggers a live failure.
4. `./tools/scripts/validate-tokens.sh` — gates CSS token drift.
5. `test -f site/.nojekyll` — the Jekyll-disable marker must exist.
6. `lychee --offline` — link check against local files; `--offline` means no network calls (fast, deterministic, no dependency on external sites being up).

Failure in any preflight step fails the whole workflow. The deploy job never runs. This is deliberate — the workflow is the last gate, and it must be strict.

## Deploy job

Runs only if preflight passes (`needs: preflight`). Steps in order:

1. `actions/checkout@v4` again — a new job means a fresh workspace.
2. `actions/configure-pages@v5` — computes the base path for the artifact. Harmless for root-mounted sites but required by the official recipe; follows the principle of least surprise.
3. `actions/upload-pages-artifact@v5` — uploads `site/` with `include-hidden-files: true`. The latter is load-bearing: see `github-pages-spec-apr2026.md`.
4. `actions/deploy-pages@v5` — deploys the uploaded artifact to the `github-pages` environment. Its `page_url` output populates the environment card in the GitHub UI.

## What's deliberately absent

- **No cache steps.** The static site has no dependencies to cache.
- **No matrix.** Single runner, single artifact.
- **No `if: github.event_name == 'push'` gating.** `workflow_dispatch` should follow the same path so rollback-via-dispatch works.
- **No inline link-check against the deployed URL.** That's the `rag-web-pages-verify` agent's job, post-deploy, outside the workflow.
- **No Jekyll build step.** rag-web is hand-written HTML/CSS; no build step exists and none will be added.
- **No Node/Bun steps.** Playwright is a dev dependency for visual QA (plan 02); it does not run in the deploy workflow.
