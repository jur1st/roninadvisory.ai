#!/usr/bin/env bash
set -euo pipefail

# validate-tokens.sh — Lint a CSS file against the Darko Labs token spec.
# Usage: validate-tokens.sh <path/to/tokens.css>

if [[ $# -lt 1 ]]; then
  echo "Usage: validate-tokens.sh <css-file>"
  exit 1
fi

CSS_FILE="$1"

if [[ ! -f "$CSS_FILE" ]]; then
  echo "ERROR: file not found: $CSS_FILE"
  exit 1
fi

PASS=0
FAIL=0

check() {
  local label="$1"
  local result="$2"   # "ok" or "fail"
  local detail="${3:-}"
  if [[ "$result" == "ok" ]]; then
    printf "  [v] %s\n" "$label"
    ((PASS++)) || true
  else
    printf "  [x] %s%s\n" "$label" "${detail:+  — $detail}"
    ((FAIL++)) || true
  fi
}

echo "┌─────────────────────────────────────────────────────┐"
echo "│  Token Validation: $CSS_FILE"
echo "└─────────────────────────────────────────────────────┘"
echo ""
echo "── Required token names ──────────────────────────────"

# Required token names (custom properties that must exist as definitions)
REQUIRED_TOKENS=(
  "color-scheme"
  "font-structure"
  "font-prose"
  "font-mono"
  "space-1"
  "width-prose"
)

for token in "${REQUIRED_TOKENS[@]}"; do
  if [[ "$token" == "color-scheme" ]]; then
    # color-scheme is a CSS property, not a custom property (no -- prefix)
    if grep -qE "color-scheme[[:space:]]*:" "$CSS_FILE"; then
      check "color-scheme defined" "ok"
    else
      check "color-scheme defined" "fail" "missing from file"
    fi
  elif grep -qE "\-\-${token}[[:space:]]*:" "$CSS_FILE"; then
    check "--$token defined" "ok"
  else
    check "--$token defined" "fail" "missing from file"
  fi
done

echo ""
echo "── Semantic color coverage ───────────────────────────"

LIGHT_DARK_COUNT=$(grep -cE 'light-dark\(' "$CSS_FILE" || true)
if [[ "$LIGHT_DARK_COUNT" -ge 7 ]]; then
  check "light-dark() usage (${LIGHT_DARK_COUNT} found, need 7+)" "ok"
else
  check "light-dark() usage (${LIGHT_DARK_COUNT} found, need 7+)" "fail" "add more semantic color pairs"
fi

echo ""
echo "── Spacing token coverage ────────────────────────────"

SPACE_COUNT=$(grep -cE '\-\-space-[0-9]+[[:space:]]*:' "$CSS_FILE" || true)
if [[ "$SPACE_COUNT" -ge 10 ]]; then
  check "spacing tokens (${SPACE_COUNT} found, need 10+)" "ok"
else
  check "spacing tokens (${SPACE_COUNT} found, need 10+)" "fail" "define --space-1 through --space-10 minimum"
fi

echo ""
echo "── Summary ───────────────────────────────────────────"
printf "  PASS: %d   FAIL: %d\n" "$PASS" "$FAIL"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo "RESULT: FAIL"
  exit 1
else
  echo "RESULT: PASS"
  exit 0
fi
