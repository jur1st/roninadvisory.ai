# Postflight checklist

**verified:** 2026-04-21
**re-verify cadence:** on every workflow change

Gates run by the `rag-web-pages-verify` agent after a deploy completes. The question this checklist answers: does what is committed to `main` match what is served on the live URL?

## The serving surface

The deployment URL is exposed as `steps.deployment.outputs.page_url` in the workflow and visible in the GitHub UI under Environments → `github-pages`. For a repo at `<owner>/<repo>`, the default URL is `https://<owner>.github.io/<repo>/` (or the custom domain when configured).

Resolve it programmatically:

```bash
gh api /repos/${OWNER}/${REPO}/pages --jq .html_url
```

## Gates

### 1. Live URL responds 200

```bash
curl -sSfI "$PAGE_URL" | head -1
```

**Expected:** `HTTP/2 200` (CDN serves HTTP/2).

**Remediation:** check the Actions run logs. If the run succeeded but the URL 404s, the environment is likely misconfigured in Settings → Pages (Source should be "GitHub Actions").

### 2. HTTPS is enforced

```bash
curl -sSI "http://${PAGE_HOST}${PAGE_PATH}" | grep -i location
```

**Expected:** `Location: https://...` redirect.

**Remediation:** Settings → Pages → Enforce HTTPS (toggle). Takes effect after the first successful deploy.

### 3. Canonical content spot-check

Fetch `PAGE_URL`, extract the `<title>` and first `<h1>`, compare to `site/index.html` at `HEAD`.

**Expected:** match.

**Remediation:** the served version may be stale cache. Wait 60 seconds, re-check. If still stale past 5 minutes, check that the deploy job actually ran on the latest SHA (`gh run list --workflow=deploy-pages.yml --limit=1`).

### 4. Known assets resolve

For each asset in `site/static/`:

```bash
curl -sSfI "${PAGE_URL}static/tokens.css"
```

**Expected:** `HTTP/2 200`, `content-type: text/css`.

**Remediation:** the asset wasn't uploaded — check `include-hidden-files` if it's a dotfile, and confirm `path: site/` on the `upload-pages-artifact` step.

### 5. No Jekyll processing kicked in

```bash
curl -sS "$PAGE_URL" | grep -q "{{" && echo FAIL || echo PASS
```

**Expected:** PASS. Jekyll would interpret `{{ ... }}` as Liquid; raw content in our hand-written HTML would be mangled.

**Remediation:** confirm `.nojekyll` was in the artifact. Download `github-pages.tar.gz` from the Actions run and verify `.nojekyll` at the tarball root.

## Reporting shape

```
POSTFLIGHT
  [pass] https://<owner>.github.io/<repo>/ → HTTP/2 200
  [pass] HTTPS enforced
  [pass] title/h1 match HEAD
  [pass] static/tokens.css → 200
  [pass] no Jekyll interpretation detected

result: PASS
```

## When to suspect CDN lag

Pages caches aggressively. If a deploy succeeded but content looks stale, wait 60 seconds and re-run the check. Consistent staleness past 5 minutes points at a real deploy problem, not a cache — check `gh run list` for a failed or still-running workflow.
