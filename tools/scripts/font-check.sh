#!/usr/bin/env bash
set -euo pipefail

# font-check.sh — Verify Darko Labs required fonts are installed on macOS.
# Uses atsutil (macOS font server) rather than fc-list.
# Always exits 0 — informational only.
# Usage: font-check.sh

echo "┌─────────────────────────────────────────────────────┐"
echo "│  Font Availability Check                            │"
echo "│  (macOS font server via atsutil)                    │"
echo "└─────────────────────────────────────────────────────┘"
echo ""

if ! command -v atsutil &>/dev/null; then
  echo "  [x] atsutil not found — this check requires macOS"
  exit 0
fi

FONT_LIST=$(atsutil fonts -list 2>/dev/null || true)

check_font() {
  local display_name="$1"
  local search_term="$2"
  local fallback="$3"

  if echo "$FONT_LIST" | grep -qi "$search_term"; then
    printf "  [v] %-28s  present\n" "$display_name"
  else
    printf "  [x] %-28s  MISSING\n" "$display_name"
    printf "      Fallback: %s\n" "$fallback"
  fi
}

echo "── Required typefaces ────────────────────────────────"
check_font \
  "Helvetica Neue LT Com" \
  "Helvetica Neue LT Com" \
  "var(--font-structure): system-ui, -apple-system, 'Helvetica Neue', sans-serif"

check_font \
  "Addington CF" \
  "Addington CF" \
  "var(--font-prose): Georgia, 'Times New Roman', serif"

check_font \
  "Berkeley Mono" \
  "Berkeley Mono" \
  "var(--font-mono): 'JetBrains Mono', 'Fira Code', ui-monospace, monospace"

echo ""
echo "── Notes ─────────────────────────────────────────────"
echo "  Fonts are checked in the macOS font server (user + system)."
echo "  Newly installed fonts may need a font server restart:"
echo "    atsutil databases -remove && open /System/Library/Fonts"
echo "  Or log out / log in to refresh the font cache."
echo ""
echo "  Token fallbacks above are used automatically when the"
echo "  primary font is unavailable (see darko-labs-tokens.css)."

exit 0
