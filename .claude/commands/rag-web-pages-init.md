---
description: One-time scaffolding for GitHub Pages deployment. Creates .github/workflows/deploy-pages.yml and site/.nojekyll from the skill templates, then prints the GitHub-UI configuration checklist. Does not push.
allowed-tools: Read, Write, Bash
effort: medium
---

# /rag-web-pages-init

One-time setup for the rag-web GitHub Pages deployment. Run this once, early in the project. Running it a second time aborts to avoid clobbering a configured workflow.

## Procedure

1. Preconditions:
   - `site/index.html` exists. If absent, abort with a pointer to `docs/dev/plans/02-web-frontend-localization.md`.
   - `site/static/tokens.css` exists.
   - `.github/workflows/deploy-pages.yml` does **not** exist. If it does, abort with "workflow already configured; this is a one-time command".

2. Copy templates into place:
   ```bash
   mkdir -p .github/workflows
   cp .claude/skills/rag-web-pages-deploy/templates/deploy-pages.yml .github/workflows/deploy-pages.yml
   cp .claude/skills/rag-web-pages-deploy/templates/nojekyll site/.nojekyll
   ```

3. Print the GitHub-UI configuration checklist to the operator:

   ```
   GITHUB UI CONFIGURATION REQUIRED

   Settings → Pages
     Source: GitHub Actions

   Settings → Environments → github-pages (created on first run)
     Deployment branches: main only
     Required reviewers: operator choice

   Settings → Actions → General
     Workflow permissions: Read and write

   Next steps:
     1. Commit the two new files.
     2. Push to main. The workflow will run and establish the github-pages environment.
     3. Complete the Settings checklist above.
     4. Trigger the first deploy via: gh workflow run deploy-pages.yml --ref main
     5. Verify with: /rag-web-pages-deploy (on the next change) or /rag-web-pages-check
   ```

4. Do not `git add`. Do not `git commit`. Do not push. Leave staging and commit decisions to the operator.

## Constraints

- Writes files only. Never pushes. Never triggers a workflow run.
- Idempotency guard: refuse to overwrite an existing `.github/workflows/deploy-pages.yml`.
- If `site/.nojekyll` already exists, leave it (empty is empty; no harm).
