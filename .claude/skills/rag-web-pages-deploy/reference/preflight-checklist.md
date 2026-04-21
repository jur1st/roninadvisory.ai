# Preflight checklist

**verified:** 2026-04-21
**re-verify cadence:** on every change to the workflow or to `site/` structure

Gates run by the `rag-web-pages-preflight` agent and by the CI preflight job. Both invocations hit the same binaries with the same flags. A local pass should imply a CI pass.

## Hard gates (workflow fails if any fail)

### 1. `.nojekyll` exists at artifact root

```bash
test -f site/.nojekyll
```

**Why:** without it, Jekyll mangles hand-written HTML. Files starting with `_` vanish; `{{ ... }}` gets interpreted as Liquid.

**Remediation:**
```bash
touch site/.nojekyll && git add site/.nojekyll
```

### 2. Workflow YAML is valid

```bash
actionlint .github/workflows/deploy-pages.yml
```

**Why:** catches expression typos, shellcheck issues in inline `run:` blocks, and schema drift.

**Remediation:** read actionlint output; fix the flagged line.

### 3. CSS tokens are consistent

```bash
./tools/scripts/validate-tokens.sh site/static/tokens.css
```

**Why:** gates drift from the token contract. See `tools/scripts/validate-tokens.sh` for the rule set.

**Remediation:** reconcile `site/static/tokens.css` with the validator's expected shape.

### 4. `include-hidden-files: true` is present in the workflow

```bash
grep -q "include-hidden-files: true" .github/workflows/deploy-pages.yml
```

**Why:** `actions/upload-pages-artifact@v5` excludes dotfiles by default; without this flag, `.nojekyll` is silently dropped from the artifact and Jekyll re-enables itself. See `github-pages-spec-apr2026.md`.

**Remediation:** add `include-hidden-files: true` under the `with:` block of the `upload-pages-artifact` step.

### 5. Internal links resolve

```bash
lychee --offline --no-progress --verbose site/
```

**Why:** broken links degrade the site quietly. `--offline` means we check the local filesystem only (fast, deterministic, no dependency on external sites being reachable).

**Remediation:** fix the path in `site/`, or update the referring file.

## Soft gates (warn but do not fail)

### 6. HTML is well-formed

Run `htmltest` or `html-validate` if installed; skip silently if neither binary is present. Operator chose not to require these in v1.

### 7. No `localhost` or `127.0.0.1` references

```bash
! grep -rE 'https?://(localhost|127\.0\.0\.1)' site/
```

**Why:** shipped content shouldn't point at dev-only hosts. Warn, don't fail — occasional docs might reference them deliberately.

## Reporting shape

Structured output, to be relayed verbatim:

```
PREFLIGHT
  [pass] .nojekyll exists
  [pass] workflow YAML valid
  [pass] css tokens consistent
  [pass] include-hidden-files: true present
  [pass] lychee: 12 links checked, 0 broken
  [warn] html-validate skipped (binary absent)
  [pass] no localhost references

result: PASS
```

Exit code: `0` on all hard gates passing; `1` on any hard-gate failure. Soft-gate failures return `0` with `[warn]` lines.

## When preflight passes locally but fails in CI

Possible causes, in order of likelihood:
1. Case-sensitivity — macOS filesystem is case-insensitive, Linux CI runner is case-sensitive. `SITE/INDEX.HTML` ≠ `site/index.html` on Linux.
2. Uncommitted file — local run saw a change you haven't staged yet.
3. Binary version drift — local `lychee` version differs from CI. Align to upstream release tarball.
