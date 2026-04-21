# GitHub Pages spec — April 2026

**verified:** 2026-04-21
**re-verify cadence:** 90 days (next check due 2026-07-20)
**last-live checks:** https://github.com/actions/deploy-pages, https://github.com/actions/upload-pages-artifact, https://docs.github.com/en/pages

## Action majors in use

| Action | Version | Verified | Notes |
|---|---|---|---|
| `actions/checkout` | `@v4` | 2026-04-21 (knowledge-cache) | v5 may have shipped; re-verify at next cadence |
| `actions/configure-pages` | `@v5` | 2026-04-21 (knowledge-cache) | Computes base path; harmless for root-mounted sites, required by the official recipe |
| `actions/upload-pages-artifact` | `@v5.0.0` | 2026-04-10 release | **`include-hidden-files: true` is load-bearing** (see below) |
| `actions/deploy-pages` | `@v5.0.0` | 2026-03-25 release | v4 still recommended in docs but v5 is current; v4 incompatible with GHES |

## Permissions block

Canonical minimum for a workflow that uploads an artifact and deploys it:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

- `contents: read` — `actions/checkout` requires it.
- `pages: write` — `actions/deploy-pages` requires it.
- `id-token: write` — OIDC signing of the deployment; `actions/deploy-pages` requires it.

Scope at workflow level when both jobs need `contents: read`; scope per-job when the preflight job does not need `pages: write` or `id-token: write`. For public repos the reduction in attack surface is marginal.

## Environment

- Name: `github-pages` (standard; diverging from this breaks rollback UX and the environment protection rules surface in the repo Settings UI).
- Output: `url: ${{ steps.deployment.outputs.page_url }}` — populates the environment card in the GitHub UI.
- Protection rules: configurable in repo Settings → Environments; recommended: deployment branches = `main` only.

## Concurrency

Not mandated by the official docs; industry-standard and recommended:

```yaml
concurrency:
  group: "pages"
  cancel-in-progress: false
```

`cancel-in-progress: false` is intentional. The Pages environment is a shared mutable resource; cancelling a deploy mid-flight can strand a partial artifact. A running deploy must complete before the next one starts.

## Publishing modes

- **Deploy-from-branch.** Not deprecated as of 2026-04. Supports root or `/docs` as the artifact path. Not suitable for rag-web because our artifact root is `site/`.
- **GitHub Actions.** The path rag-web uses. Required for any artifact root other than `/` or `/docs`.

## PR preview deployments

Not a first-party feature as of 2026-04. Community patterns exist (artifact naming per-branch + a separate environment) but add surface area rag-web does not need yet. Re-check at next cadence.

## The `.nojekyll` + `include-hidden-files` coupling

GitHub Pages runs Jekyll processing on uploaded artifacts by default. `.nojekyll` at the artifact root disables Jekyll. `actions/upload-pages-artifact@v5` changed the default for `include-hidden-files` from `true` (in v4) to `false` (in v5). A v5 upload without `include-hidden-files: true` silently drops `.nojekyll` from the artifact, which re-enables Jekyll, which mangles hand-written HTML — files starting with `_` vanish, `{{ ... }}` gets interpreted as Liquid.

This is the single most failure-prone regression in the whole workflow. The preflight agent specifically checks both: `site/.nojekyll` exists, and the workflow YAML contains `include-hidden-files: true`.

## Re-verify procedure

At cadence (or on any suspected breakage):

```bash
gh api /repos/actions/deploy-pages/releases/latest --jq .tag_name
gh api /repos/actions/upload-pages-artifact/releases/latest --jq .tag_name
gh api /repos/actions/configure-pages/releases/latest --jq .tag_name
gh api /repos/actions/checkout/releases/latest --jq .tag_name
```

Diff against the version table above. Update this file in place. Advance the `verified:` date. If any major changed, read the release notes and update `workflow-authoring.md` and `troubleshooting.md` accordingly.
