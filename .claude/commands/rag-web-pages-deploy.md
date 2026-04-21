---
description: Trigger a GitHub Pages deployment. Confirms clean git state, runs preflight, pushes (or invokes workflow_dispatch), tails the run, invokes the verify agent on completion. Refuses to act on a dirty working tree.
allowed-tools: Read, Bash
effort: medium
---

# /rag-web-pages-deploy

Deploy the current committed state of `site/` to GitHub Pages.

## Procedure

1. Confirm clean working tree:
   ```bash
   git status --porcelain
   ```
   If non-empty, abort with: "working tree dirty; commit or stash before deploying".

2. Confirm current branch is `main`:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```
   If not `main`, abort.

3. Run preflight via `/rag-web-pages-check`. If it fails, abort.

4. Trigger the deploy:
   - If `git rev-parse HEAD` equals `git rev-parse origin/main` (nothing to push):
     ```bash
     gh workflow run deploy-pages.yml --ref main
     ```
   - Otherwise:
     ```bash
     git push origin main
     ```

5. Tail the resulting run:
   ```bash
   gh run watch
   ```

6. On workflow success, invoke `rag-web-pages-verify`. Relay its structured report.

7. On workflow failure, print the failing job name + a pointer to `.claude/skills/rag-web-pages-deploy/reference/troubleshooting.md`.

## Constraints

- Never commits. Never force-pushes. Never deploys from a branch other than `main`.
- If a deploy is already in flight (per `gh run list --workflow=deploy-pages.yml --status in_progress`), wait for it to complete before starting a new one. The `concurrency:` group serializes anyway, but this local guard prevents the operator-visible queue from growing.
- Does not commit uncommitted changes on the operator's behalf. The operator stages and commits; this command only triggers the deploy once everything is committed.
