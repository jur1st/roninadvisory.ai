# Troubleshooting

**verified:** 2026-04-21
**re-verify cadence:** append entries as new failure modes are observed

Failure-mode catalogue indexed by symptom. Each entry names the cause, the fix, and any diagnostic commands to confirm the diagnosis.

## Symptom: site is up but content looks like raw markdown or shows Liquid tags (`{{ ... }}`)

**Cause:** Jekyll processing kicked in. Either `.nojekyll` is missing from the artifact or `include-hidden-files: true` is absent from the workflow.

**Fix:**
```bash
test -f site/.nojekyll || (touch site/.nojekyll && git add site/.nojekyll && git commit -m "fix: restore .nojekyll")
grep -q "include-hidden-files: true" .github/workflows/deploy-pages.yml
```

If both are present and the problem persists, inspect the artifact: download `github-pages.tar.gz` from the Actions run and verify `.nojekyll` is at the tarball root.

## Symptom: site returns 404 after a successful workflow run

**Cause 1:** Pages source not set to GitHub Actions in Settings → Pages.

**Fix:** Settings → Pages → Source → **GitHub Actions**.

**Cause 2:** Environment `github-pages` has deployment protection rules blocking the deploy.

**Fix:** Settings → Environments → `github-pages` → review protection rules. The workflow run will show "Waiting for approval" if this is the cause.

## Symptom: deploy job fails with "resource not accessible by integration"

**Cause:** Workflow permissions insufficient. Either the workflow-level `permissions:` block is missing `pages: write` or `id-token: write`, or repo-level Actions permissions are set to read-only.

**Fix:**
- Confirm workflow YAML matches `reference/workflow-authoring.md`.
- Settings → Actions → General → Workflow permissions → **Read and write**.

## Symptom: HTTPS cert shows as pending for > 24 hours

**Cause:** DNS misconfiguration. GitHub cannot provision a Let's Encrypt cert if the DNS records don't resolve to its IPs.

**Fix:**
```bash
dig ronin-advisory-group.com +short
# should return 185.199.108-111.153 (apex) or <owner>.github.io (subdomain)
```

If the IPs don't match `reference/custom-domain-setup.md` (after verifying against live GitHub docs), fix the DNS records at the registrar.

## Symptom: concurrent deploys step on each other

**Cause:** `concurrency:` block missing or misconfigured.

**Fix:** confirm the workflow contains:
```yaml
concurrency:
  group: "pages"
  cancel-in-progress: false
```

`cancel-in-progress: false` is load-bearing — cancelling mid-deploy strands a partial artifact in the Pages environment.

## Symptom: preflight passes locally but fails in CI

**Cause 1:** case-sensitive filesystem difference. GitHub Actions runners are Linux (case-sensitive); the workstation is macOS (case-insensitive by default).

**Fix:** match casing exactly. `SITE/INDEX.HTML` ≠ `site/index.html` on Linux.

**Cause 2:** binary version drift between the workstation's Homebrew install and the CI runner's tarball install.

**Fix:** both should install `lychee` and `actionlint` from the upstream release tarball. If they drift, align to the same release.

## Symptom: lychee reports broken links that look correct

**Cause:** see "preflight passes locally but fails in CI" above (case sensitivity is the usual culprit). Also check that link targets actually exist in `site/` — a link to a file in `docs/dev/` will fail because only `site/` is uploaded.

## Symptom: workflow_dispatch fails but push succeeds

**Cause:** `workflow_dispatch` may run on a branch other than `main` depending on where it's invoked. If the dispatched branch is missing fresh files, preflight fails.

**Fix:** invoke `gh workflow run deploy-pages.yml --ref main` explicitly; don't rely on the default branch.

## Symptom: v5 of `deploy-pages` or `upload-pages-artifact` has a breaking change

**Fix:** pin to v4 until investigated:
```yaml
uses: actions/deploy-pages@v4
uses: actions/upload-pages-artifact@v4
```

Update `reference/github-pages-spec-apr2026.md` with the findings; bump the `verified:` date; document the breaking change here with a new symptom/cause/fix block.

## Symptom: deploy succeeded but verify reports stale content past 5 minutes

**Cause:** likely not CDN lag. Check that the deploy job actually ran on the latest SHA:

```bash
gh run list --workflow=deploy-pages.yml --limit=1 --json headSha,conclusion
```

If the latest run's `headSha` doesn't match `git rev-parse origin/main`, a more recent push didn't trigger a deploy (e.g., the change only touched files outside the `paths:` filter).
