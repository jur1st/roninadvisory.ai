#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TOOLS_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# capture-screenshot.sh — Playwright CLI wrapper for UI screenshots.
# Usage: capture-screenshot.sh <url> <output.png> [--full-page] [--dark]
#
# Examples:
#   capture-screenshot.sh http://localhost:3000 home-light-desktop.png
#   capture-screenshot.sh http://localhost:3000 home-dark-desktop.png --dark
#   capture-screenshot.sh http://localhost:3000 home-full.png --full-page --dark

URL=""
OUTPUT=""
FULL_PAGE=false
DARK_MODE=false

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --full-page) FULL_PAGE=true ;;
    --dark)      DARK_MODE=true ;;
    http://*|https://*)
      if [[ -z "$URL" ]]; then URL="$arg"; fi ;;
    *.png|*.jpg|*.jpeg|*.webp)
      if [[ -z "$OUTPUT" ]]; then OUTPUT="$arg"; fi ;;
    *)
      if [[ -z "$URL" ]]; then
        URL="$arg"
      elif [[ -z "$OUTPUT" ]]; then
        OUTPUT="$arg"
      fi
      ;;
  esac
done

if [[ -z "$URL" || -z "$OUTPUT" ]]; then
  echo "Usage: capture-screenshot.sh <url> <output.png> [--full-page] [--dark]"
  echo ""
  echo "  --full-page   Capture the full scrollable page (not just viewport)"
  echo "  --dark        Inject .dark class on <html> before capture"
  exit 1
fi

# Check bun + local playwright install.
# We invoke the inline script with `bun` (not `node`) because bun resolves
# modules from CWD's node_modules regardless of where the temp script file
# lives; plain `node` walks up from the script path (/tmp here) and never
# finds the project's node_modules.
if ! command -v bun &>/dev/null; then
  echo "ERROR: bun not found on PATH"
  echo "  Install: brew install oven-sh/bun/bun"
  exit 1
fi

if [[ ! -d "$TOOLS_DIR/node_modules/playwright" ]]; then
  echo "ERROR: ./node_modules/playwright not present"
  echo "  Install from tools/: cd tools && bun add -d playwright"
  exit 1
fi

echo "┌─────────────────────────────────────────────────────┐"
echo "│  Capture Screenshot                                 │"
echo "└─────────────────────────────────────────────────────┘"
printf "  URL       : %s\n" "$URL"
printf "  Output    : %s\n" "$OUTPUT"
printf "  Full page : %s\n" "$FULL_PAGE"
printf "  Dark mode : %s\n" "$DARK_MODE"
echo ""

# Build the playwright script inline
SCRIPT=$(cat <<'PWSCRIPT'
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    colorScheme: DARK_ARG ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.goto(URL_ARG, { waitUntil: 'networkidle' });
  if (DARK_ARG) {
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
  }
  await page.screenshot({
    path: OUTPUT_ARG,
    fullPage: FULL_PAGE_ARG,
  });
  await browser.close();
  console.log('Screenshot written to: ' + OUTPUT_ARG);
})();
PWSCRIPT
)

# Substitute values (safe: no shell expansion in the node script)
SCRIPT="${SCRIPT//URL_ARG/\'${URL}\'}"
SCRIPT="${SCRIPT//OUTPUT_ARG/\'${OUTPUT}\'}"
SCRIPT="${SCRIPT//DARK_ARG/$( [[ "$DARK_MODE" == "true" ]] && echo "true" || echo "false" )}"
SCRIPT="${SCRIPT//FULL_PAGE_ARG/$( [[ "$FULL_PAGE" == "true" ]] && echo "true" || echo "false" )}"

TMPSCRIPT=$(mktemp /tmp/capture-screenshot-XXXXXX.js)
trap 'rm -f "$TMPSCRIPT"' EXIT
echo "$SCRIPT" > "$TMPSCRIPT"

(cd "$TOOLS_DIR" && bun "$TMPSCRIPT") 2>&1

echo ""
if [[ -f "$OUTPUT" ]]; then
  echo "  [v] Screenshot saved: $OUTPUT"
else
  echo "  [x] Screenshot was not created — check output above"
  exit 1
fi
