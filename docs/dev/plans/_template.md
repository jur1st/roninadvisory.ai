# [Plan Title]

**Scope:** [one sentence on what this plan accomplishes and what it explicitly does NOT.]

**Out of scope (deferred):**
- [item]
- [item]

---

## Current ground truth

[What exists. What's absent. Cite files, paths, recent commits. Anchor the plan in observable state, not recollection.]

---

## Step N — [Name]

[Steps as needed. Be concrete.]

---

## Pi Mirror

**REQUIRED section.** If this plan adds or modifies any primitive under `.claude/`, describe the Pi-side analog shape and the expected `mirror_status` in `pi-agents.yaml` after the plan lands.

For each CC primitive introduced or modified:
- **Name:** [primitive name]
- **Pi shape:** [what the Pi analog looks like — same YAML entry, a separate script, nothing, etc.]
- **Expected `mirror_status` after this plan:** [shipped / pending / not-applicable]
- **Justification** (required when `not-applicable`): [why Pi has no analog]

If this plan adds or modifies no primitive under `.claude/`, write: *N/A — this plan modifies no primitive under `.claude/`.*

---

## Acceptance criteria

- [ ] [concrete check]
- [ ] [concrete check]
- [ ] `pi-agents.yaml` entries reflect the expected `mirror_status` above
- [ ] `## Pi Mirror` section present and accurate (enforced by `/rag-web-close`)

---

## Decisions (resolved [YYYY-MM-DD])

1. **[Decision name]** — [resolution]
