#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TOOLS_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# capture-screenshot.sh — Playwright CLI wrapper for UI screenshots.
# Usage: capture-screenshot.sh <url> <output.png> [flags]
#
# Flags:
#   --full-page            Capture the full scrollable page (not just viewport)
#   --dark                 Render in dark mode. Sets context.colorScheme AND
#                          pins data-theme="dark" on <html>. This matches the
#                          site's inline theme script (site reads data-theme,
#                          not a .dark class). Light is also pinned explicitly
#                          when --dark is absent, so the capture is deterministic.
#   --viewport WIDTHxHEIGHT   Override the default 1280x720 viewport.
#                             Examples: --viewport 1440x900, --viewport 390x844
#   --scale N              Override deviceScaleFactor (default 1). Use 2 for
#                          @2x retina-legible captures in embedded reviews.
#
# Examples:
#   capture-screenshot.sh http://localhost:3000 home-light.png
#   capture-screenshot.sh http://localhost:3000 home-dark.png --dark
#   capture-screenshot.sh http://localhost:3000 mobile.png --viewport 390x844
#   capture-screenshot.sh http://localhost:3000 review-full.png \
#       --full-page --dark --viewport 1440x900 --scale 2

URL=""
OUTPUT=""
FULL_PAGE=false
DARK_MODE=false
VIEWPORT_W=1280
VIEWPORT_H=720
SCALE=1

# Parse arguments. Multi-arg flags (--viewport, --scale) need shift 2; the
# loop form handles that cleanly where a for-arg loop cannot.
while [[ $# -gt 0 ]]; do
  case "$1" in
    --full-page) FULL_PAGE=true; shift ;;
    --dark)      DARK_MODE=true; shift ;;
    --viewport)
      if [[ -z "${2:-}" || ! "$2" =~ ^[0-9]+x[0-9]+$ ]]; then
        echo "ERROR: --viewport requires WxH (e.g. 1440x900)" >&2
        exit 1
      fi
      VIEWPORT_W="${2%x*}"
      VIEWPORT_H="${2#*x}"
      shift 2 ;;
    --scale)
      if [[ -z "${2:-}" || ! "$2" =~ ^[0-9]+$ ]]; then
        echo "ERROR: --scale requires a positive integer" >&2
        exit 1
      fi
      SCALE="$2"
      shift 2 ;;
    http://*|https://*)
      if [[ -z "$URL" ]]; then URL="$1"; fi
      shift ;;
    *.png|*.jpg|*.jpeg|*.webp)
      if [[ -z "$OUTPUT" ]]; then OUTPUT="$1"; fi
      shift ;;
    *)
      if [[ -z "$URL" ]]; then
        URL="$1"
      elif [[ -z "$OUTPUT" ]]; then
        OUTPUT="$1"
      fi
      shift ;;
  esac
done

if [[ -z "$URL" || -z "$OUTPUT" ]]; then
  echo "Usage: capture-screenshot.sh <url> <output.png> [flags]"
  echo ""
  echo "  --full-page         Capture the full scrollable page"
  echo "  --dark              Dark mode (pins data-theme=dark on <html>)"
  echo "  --viewport WxH      Override default 1280x720 (e.g. 1440x900)"
  echo "  --scale N           Override deviceScaleFactor (default 1)"
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
printf "  Viewport  : %sx%s @%sx\n" "$VIEWPORT_W" "$VIEWPORT_H" "$SCALE"
printf "  Full page : %s\n" "$FULL_PAGE"
printf "  Dark mode : %s\n" "$DARK_MODE"
echo ""

# Build the playwright script inline.
# Theme injection sets data-theme on <html> (the attribute the site's inline
# theme script reads), not a .dark class. The older class-based injection
# never had an effect on this site; captures via --dark were really just
# colorScheme-hinted light shots.
SCRIPT=$(cat <<'PWSCRIPT'
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: VIEWPORT_W_ARG, height: VIEWPORT_H_ARG },
    deviceScaleFactor: SCALE_ARG,
    colorScheme: DARK_ARG ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.goto(URL_ARG, { waitUntil: 'networkidle' });
  await page.evaluate((dark) => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, DARK_ARG);
  // Brief pause so the browser re-resolves color-scheme / token values
  // after the attribute flip before the screenshot fires.
  await page.waitForTimeout(150);
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
SCRIPT="${SCRIPT//VIEWPORT_W_ARG/${VIEWPORT_W}}"
SCRIPT="${SCRIPT//VIEWPORT_H_ARG/${VIEWPORT_H}}"
SCRIPT="${SCRIPT//SCALE_ARG/${SCALE}}"
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
