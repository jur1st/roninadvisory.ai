# Design System

This document records the theory behind the Ronin Advisory Group's visual direction, so a future contributor can rebuild that theory rather than just observing its output. It answers three questions in order: what is the design claiming, how is the claim made visible, and what invariants keep it recoverable.

Read this alongside [`tokens.md`](tokens.md), which catalogs the vocabulary the design speaks in, and [`typography.md`](typography.md), which records the font-delivery decision. The archived mockup directions that informed this choice live under `docs/dev/mockups/_archive/README.md`. The full decision record is `docs/dev/plans/04-design-system-lock-in.md`.

---

## 1. What is the design claiming?

The front page of Ronin Advisory Group is the cover of a quarterly the firm publishes. The firm's services are its colophon.

That sentence is a category claim — and it is made against a specific alternative. Most professional-services sites are brochures that imitate the shape of a SaaS landing page: a hero statement, a three-column benefits grid, a testimonial strip, a prominent CTA button, KPI tiles in a hero band. That shape is wrong for forensics and AI-risk work. Buyers of evidentiary competence are not buying a productivity subscription; they are looking for signals that the practitioner thinks carefully, publishes their reasoning, and is not in a hurry. The editorial-masthead framing supplies those signals before any copy is read.

**The shape of the claim:**

- No hero section
- No call-to-action button
- No KPI tiles
- No testimonial strip
- No gradient
- No stock imagery
- No phone number
- No logo-mark — the wordmark is the logotype

The company name sets at display scale, slightly negative-tracked, in FreightDisp Pro. The services appear as a numbered colophon — italic oxblood folios, grotesque labels, a hairline rule between each entry — because presenting them as a colophon quietly asserts that this is where the engagements are recorded, not pitched. Gunnerbench sits in the foot position as Issue N°01, framed as the first entry in a continuing periodical. The thesis of the firm and the thesis of the publication collapse into the same gesture.

The target reader for this page is someone deciding whether to engage a forensics and AI-risk consultant. The signal they are reading for is: does this person think carefully, at record? The editorial register delivers that signal. The SaaS brochure shape would undermine it.

---

## 2. How is the claim made visible?

Three axes carry the editorial register: palette, typography, and structure. Each is documented here at the theory level; the implementable details are in [`tokens.md`](tokens.md), [`typography.md`](typography.md), and [`authoring.md`](authoring.md).

### Palette

Two inks on warm off-white paper, with a single second accent.

- **Ink:** deep warm black (`--color-ink`). Not neutral. Warm rather than cool so the page reads as printed matter, not a screen.
- **Paper:** warm off-white (`--color-paper`). Not `#fafafa`. The warmth is load-bearing: the editorial direction collapses the moment the page feels clinical.
- **Second accent:** oxblood (`--color-mark`). Editorial red — the tone of an archival stamp, not a CTA button. Used sparingly: the issue mark, the masthead ornament, one keyword, focus rings.

The palette has a cross-direction convergence signal worth recording as a brand-color decision. Mockup A (editorial masthead) and mockup B (typographic architecture) were developed independently, from different compositional premises. They converged independently on the same combination — warm paper background and oxidized red accent. When two directions driven by different theories land on the same palette, that is not coincidence; it is a stable signal. The combination is the palette because it earned that status under pressure.

State tokens (success, warning, error) are not in the catalog. They are not present because the design does not need them and because adding them would add a third ink. If a future surface legitimately needs a state color, it earns a place in the catalog via a plan document that records the register shift as a decision. See `docs/dev/plans/04-design-system-lock-in.md` Decision 3.

### Typography

One serif family at two optical sizes, one grotesque, one monospace. Three voices is the ceiling.

- **FreightDisp Pro** — the cover voice. Display-sized type in this face carries the authority of a masthead. It sets tight (`--leading-display: 0.92`) because display-sized type at loose line-height reads as decorative rather than declarative.
- **FreightText Pro** — the body voice. Same family as the display face, tuned for smaller sizes. The optical consistency between display and text means the page reads as a single typographic system, not a collision of styles.
- **Acumin Pro** — the structural voice. Every piece of structure — colophon labels, folio numbers, metadata, section kickers — is in Acumin. Grotesque for structure, serif for prose: the distinction is legible to the eye as "this is scaffolding, not content."
- **Berkeley Mono** — the machine-register voice. Used for items that belong in the machine world: email addresses, domain names, ledger metadata. Its presence signals "this is a literal string, not prose."

The three-plus-one arrangement is intentional. Three named editorial voices (display / text / grotesque) plus one monospace. A fourth face added to the mix — a second display face, a different grotesque for a new section — would shift the register from designed to assembled. Three is the maximum for this design theory; a fourth face is a sign that a different theory is forming.

Path C (Adobe Typekit) is committed. The site reads in the correct register via graded fallback stacks while the kit is not loaded; see [`typography.md`](typography.md) for the operational setup.

### Structure

The page uses printed-matter conventions throughout:

- **Folio strip** — the top header carrying the firm name, section mark, and issue number. Functions as the running head on a periodical spread.
- **Masthead** — the company name at display scale. The typographic equivalent of a newspaper masthead: the thing you read to know where you are.
- **Lede** — the paragraph beneath the masthead. Reads as editorial voice, not marketing copy.
- **Colophon** — the services section. A colophon in book typography is the record of production: who made it, in what tradition, by what means. Services rendered as a colophon assert "this is the record of engagements," not "these are the pitches." The numbered list with oxblood folios makes the form explicit.
- **Rule-mark** — a mid-century triple-rule SVG with a centered diamond, placed once between the foot section and the imprint strip. A printed-matter ornament that signals end-of-page rather than end-of-content.
- **Imprint strip** — the bottommost element, carrying the legal entity, registration mark, and the day/night edition toggle. Functions as the printer's imprint on a title page: small, formal, unambiguous.

The double-rule frame that surrounds the cover — a CSS `border` plus an `outline` at offset — is a printed-border convention. See [`troubleshooting.md`](troubleshooting.md) for the high-DPR failure mode in the double-rule implementation.

Interior pages, when they exist, should continue this pattern. Not cards. Not tiles. Typeset matter: numbered, ruled, grotesque for structure, serif for prose.

**The base-prose block holds the editorial register for un-classed markup.** `site/static/styles.css` carries a base block of element selectors (`h1`–`h6`, `p`, `ul`, `ol`, `dl`, `blockquote`, `figure`, `code`, `pre`, `table`, `details/summary`, and minimal form elements) that establishes the editorial defaults before any class-scoped rule arrives. Its job is to make raw, un-classed markup on a subpage read as typeset matter rather than browser-default Times. The cover's class-scoped selectors (`.masthead__title`, `.lede p`, `.foot__block h3`) are more specific and continue to win. The base block is the floor; wrappers modulate it.

The convention the base block follows — which any future addition must honor — is that element selectors set structural properties (margin, padding, display, borders) and only override typographic properties (`font-family`, `font-size`, `line-height`) when the element genuinely needs a non-body default at all times (`h1`–`h6`, `code`, `pre`). Inherited typography flows from `body` through wrapper rules to reach leaf elements. If a base element rule sets `font-size` explicitly on `p`, a wrapper that tries to resize its child `<p>` elements by setting `font-size` on itself will lose — the element selector outspecifies inheritance. See [`troubleshooting.md`](troubleshooting.md) for the specificity trap this creates and the correct fix posture.

---

## 3. What invariants keep it recoverable?

Three rules. Violating any one of them is a theory-level change — meaning it is not a styling preference, and it deserves a plan document before it lands.

**The company name is the logotype.**

There is no mark. Adding a mark — a katana, a kanji, a stylized R, any symbol — reads as costume. The rōnin framing carries seriousness precisely because it is named and not costumed. A mark says "we had a designer make us a logo." The absence of a mark says "the name is the logo; we are not compensating for anything." This is the most recoverable invariant to violate by accident, because adding a mark feels like an addition, not a replacement. The addition is the theory shift.

**The colophon structure is the site's spine.**

Interior pages render as typeset matter — numbered, ruled, grotesque for structure, serif for prose — not as cards or product tiles. A future page that adopts a card-grid layout is not extending the editorial direction; it is departing from it. If the departure is intentional and justified, it earns a plan record. If it creeps in because "cards are easier to lay out," the design theory has been replaced by an authoring convenience.

**Oxblood is the only non-ink color.**

`--color-mark` (oxblood, aliased as `--color-accent`) is the only color on the site that is neither a dark ink nor a warm light. It is used in exactly the places where a printed periodical would use a spot color: the issue mark, the masthead ornament, the colophon folios, focus rings. A second accent — for a CTA, a new section, a status badge — shifts the register from editorial to commercial. The design's restraint is the signal; breaking it breaks the signal.

---

## How to extend this design without breaking its premise

New pages, new sections, new components should be evaluated against the three invariants above. Beyond that:

- **Spacing and rhythm.** Use the editorial spacing progression in [`tokens.md`](tokens.md). At cover scale, `clamp()` is the correct spacing mechanism; prefer it over breakpoint-gated pixel values.
- **New tokens.** Add to `tokens.css` first, then consume. Every new semantic color earns three lines (the fallback pattern). Every new spacing token earns a comment with its reasoning.
- **New type treatments.** Write to an existing token voice. A new section that calls for small-caps headers is using `--font-grotesque` with `--tracking-caps` — it is not inventing a new voice.
- **New page layouts.** A second page is the right moment to factor the base styles into `site/static/base.css`. Until that page exists, the inline styles in `site/index.html` are not a pattern to replicate — they are a minimum until the site has more than one page.

A future contributor who reads this file, [`tokens.md`](tokens.md), and [`authoring.md`](authoring.md) should be able to make correct edits without re-deriving the brand. The three invariants are the shortcuts to correct judgment when a new demand arrives and the theory is not immediately obvious.

---

## Cross-references

- [`tokens.md`](tokens.md) — the design vocabulary: every color, type size, spacing value, rule weight, and layout width.
- [`typography.md`](typography.md) — Path C committed; Adobe Typekit operational setup; fallback stacks for the interval before the kit loads.
- [`authoring.md`](authoring.md) — how to write HTML and CSS against this contract; common drift patterns and how they fail.
- [`docs/dev/mockups/_archive/README.md`](mockups/_archive/README.md) — the archived directions (B and C) that informed this design without becoming it.
- `docs/dev/plans/04-design-system-lock-in.md` — the full decision record for the editorial-catalog rewrite and the logic behind every major choice.
