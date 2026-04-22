# Legacy placeholder — roninadvisory.ai

The first published version of the site, served from
`jur1st/roninadvisory.ai` on `main` between March 2025 and April 2026.
Preserved here because the logo and the origin prose are both part of
the firm's record, even though neither ships in the current cover.

## Contents

- `index.html` — the original placeholder as served. Inline CSS, EB
  Garamond via Google Fonts, a single centered logo, and the four-
  paragraph ronin prose.
- `logo.png` — the 1.5&nbsp;MB hero logo used by the placeholder. Not
  currently referenced by the live cover. Kept intact for future use.

## Provenance

- Commit `75a25b4` — "Create POC" (2025-07-08)
- Commit `8d1334c` — "Update index.html" (2025-03-27)
- Commit `cfc0462` — "Update index.html" (2025-03-27)
- Commit `5c17ab0` — "Create CNAME" (2025-03-27)
- Commit `c1fe75a` — "Added logo" (2025-03-27)

The CNAME file from that tree (`roninadvisory.ai`) now lives at
`site/CNAME` so the GitHub Pages workflow can bind the custom domain
to the uploaded artifact.

## Why the prose isn't gone

The four paragraphs are buried verbatim in `site/index.html` as an
HTML comment, positioned above `<main>`. Invisible to the browser,
visible to anyone who reads the source. This file is the readable
canonical copy.
