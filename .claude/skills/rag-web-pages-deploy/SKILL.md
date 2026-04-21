---
name: rag-web-pages-deploy
description: GitHub Pages lifecycle for rag-web — init, preflight, deploy, verify, rollback. April 2026 spec. Auto-loads on changes under site/, .github/workflows/, or when the operator invokes any /rag-web-pages-* command.
effort: medium
allowed-tools: Read, Grep, Glob, Bash, WebFetch
---

# rag-web-pages-deploy

## Theory of the deployment target

GitHub Pages is a static-file hosting surface served from a git-native artifact. The builder inspects the uploaded content, skips processing when `.nojekyll` is present at the artifact root, and serves the files over a CDN with forced HTTPS on the `*.github.io` domain (or a custom domain when a `CNAME` record is committed).

Two publishing modes exist. **Deploy-from-branch** watches a configured branch and serves from its root or `/docs`. Simple, requires no workflow file, but constrains the artifact layout to paths GitHub recognizes. **GitHub Actions** uploads an artifact to the `github-pages` environment; a downstream job deploys it. The workflow owns the artifact root and can run arbitrary preflight checks against it before a deploy.

rag-web uses Actions. Our artifact root is `site/`, which branch mode does not support; additionally, Actions lets us gate a deploy on link-checking, token validation, and YAML lint running on the same runner that publishes.

The skill exists because the April 2026 spec has a staleness clock. `actions/deploy-pages` and `actions/upload-pages-artifact` both shipped v5 releases within thirty days of this skill being written. A rag-web session picking this up cold in six months should be able to read one file — `reference/github-pages-spec-apr2026.md` — and know whether re-verification is needed.

## Entry points

| Operator intent | Command | Agent | Reference |
|---|---|---|---|
| One-time scaffold | `/rag-web-pages-init` | — | `reference/workflow-authoring.md` |
| Preflight before a commit | `/rag-web-pages-check` | `rag-web-pages-preflight` | `reference/preflight-checklist.md` |
| Push + watch + verify | `/rag-web-pages-deploy` | `rag-web-pages-verify` | `reference/postflight-checklist.md` |
| Propose a rollback | `/rag-web-pages-rollback` | `rag-web-pages-rollback-advisor` | `reference/rollback-runbook.md` |

## When to invoke

Auto-load when the operator touches `site/`, `.github/workflows/deploy-pages.yml`, or `site/.nojekyll`. User-invoke via any of the four slash commands above.

## Reference library

- `reference/github-pages-spec-apr2026.md` — current action versions, permissions, environment, concurrency. Re-verify every 90 days.
- `reference/workflow-authoring.md` — line-by-line commentary on `templates/deploy-pages.yml`.
- `reference/preflight-checklist.md` — the gates the preflight agent and CI preflight job both run.
- `reference/postflight-checklist.md` — the gates the verify agent runs against the live URL.
- `reference/rollback-runbook.md` — operator runbook; the advisor agent reads this and proposes actions against it.
- `reference/custom-domain-setup.md` — DNS + CNAME + HTTPS for the future, not executed in v1.
- `reference/troubleshooting.md` — failure-mode catalogue indexed by symptom.

## Templates

- `templates/deploy-pages.yml` — the workflow. `/rag-web-pages-init` copies this to `.github/workflows/deploy-pages.yml`.
- `templates/nojekyll` — an empty file. `/rag-web-pages-init` copies this to `site/.nojekyll`.

## Doctrine

- **Operator gates the commit.** Consistent with project-wide posture. `/rag-web-pages-deploy` refuses a dirty tree and never auto-commits; `/rag-web-pages-rollback` proposes and waits.
- **Preflight runs twice** — locally via the command, and on the CI runner as the first workflow job. Both invocations hit the same checklist and the same tool binaries. A local pass should imply a CI pass.
- **Staleness is visible.** Every reference doc opens with `verified: YYYY-MM-DD` and a re-verify cadence. Silence is not a guarantee of currency.
- **`include-hidden-files: true` is load-bearing.** `actions/upload-pages-artifact@v5` excludes dotfiles by default; `.nojekyll` is a dotfile. Dropping it re-enables Jekyll, which mangles hand-written HTML. The preflight agent checks both the file and the workflow flag.
- **Naur-voice in reference docs.** Documentation exists to help the next reader build a theory. If a paragraph only catalogues, cut it.

## Relationship to the rest of the project

- Plan 02 (`docs/dev/plans/02-web-frontend-localization.md`) landed the `site/` artifact this skill deploys.
- Plan 03 (`docs/dev/plans/03-pages-deployment.md`) is the implementation plan that produced this skill; read it for the decisions behind the shape.
- `/rag-web-close` surfaces cross-harness drift against `pi-agents.yaml`; every primitive under this skill has a pending Pi row there.
- The CLAUDE.md build-tooling ban is honored: the static `site/` is uploaded as-is. No build step runs between commit and deploy.
