# Rollback runbook

**verified:** 2026-04-21
**re-verify cadence:** when any GitHub Pages rollback-related spec changes

Operator procedure for rolling back a bad deployment. The `rag-web-pages-rollback-advisor` agent proposes a target; the operator executes. The advisor never pulls the trigger — rollback is explicitly a human decision.

## When to roll back

Prefer a **forward-fix** (new commit that corrects the problem) when:
- The bad deploy exposes content, not a broken site.
- The fix is small and obvious.
- The visible-to-users window is tolerant of another full preflight + deploy cycle (a few minutes).

**Roll back** when:
- The site is returning 500s or empty responses.
- The deploy shipped content that must not be live (sensitive info, wrong brand language, broken primary page).
- A forward-fix would take longer than the visible-to-users window can tolerate.

## Listing recent deployments

```bash
gh api /repos/${OWNER}/${REPO}/pages/deployments \
  --jq '.[] | {sha: .commit.sha, created: .created_at, status: .status.status}' \
  | head -20
```

Each entry includes the commit SHA, timestamp, and status.

## Identifying last-known-good

The advisor agent cross-references three sources:

1. Recent `rag-web-pages-verify` reports in `.the-grid/sessions/summaries/*.md` (which SHA was last verified as serving clean content).
2. The deployments list above (which SHAs actually deployed).
3. Session commit logs (`git log` on `main`).

It produces a proposal in the shape:

```
ROLLBACK PROPOSAL
  bad:  abc123 (2026-04-21 14:22 UTC) — verify FAILED on title mismatch
  good: def456 (2026-04-21 13:05 UTC) — verify PASSED, last clean deploy
  action: re-deploy def456 via the Pages UI (Path A) or workflow_dispatch (Path B)
```

## Executing the rollback

Two paths. Both are manual — the advisor does not execute either.

### Path A — Pages UI (recommended for speed)

1. Open the repo → Environments → `github-pages`.
2. Find the last-known-good deployment in the list.
3. Three-dot menu → **Re-run deployment**.

This republishes the existing artifact without a new workflow run. Fastest rollback; takes seconds to go live.

### Path B — workflow_dispatch against a known-good SHA

```bash
gh workflow run deploy-pages.yml --ref def456
gh run watch
```

Slower (full preflight + deploy) but useful if the Pages UI rollback isn't available (e.g., the bad deploy corrupted environment state, or the operator is driving from the CLI).

## After rollback

1. Run `/rag-web-pages-check` against the rolled-back SHA to confirm preflight still passes for the good state.
2. Create a tracking issue (or a `docs/dev/plans/*.md` entry) for the root cause of the bad deploy.
3. The forward-fix commit must pass preflight locally before push — do not skip.
4. Update `troubleshooting.md` if the failure mode is novel.

## Never auto-execute

The advisor agent never runs the `gh` commands above. It produces the proposal; the operator chooses Path A, Path B, or neither. This is consistent with the project-wide "never auto-commit" posture and with the rule that `rag-web-*` primitives gate their most consequential actions to the human.
