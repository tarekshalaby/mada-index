# Mada Index — Persona Map

*Planning & Architecture · anchors Question Mapping → Metrics → Visualization*
*Method: working backwards from users, not forwards from data.*

Four stakeholder groups, two tiers. The brief named four co-equal audiences; v0.2 and Mada's own input both narrow that. Every priority question and the single biggest frustration Mada stated come from an editorial or audience-growth lens — there is no fundraiser-voiced question anywhere in their input. So **two personas drive the design** and **two are served almost entirely by one view (Headlines)**.

Each persona records who they are, the decisions they make with the dashboard, what they need from it, and the frustration it relieves. Decisions split into two modes:

- **Retrospective** — "how did this do?"
- **Generative** — "what should we do next?"

The generative mode is the highest-value use and the easiest to under-serve. It is called out explicitly wherever it lives.

---

## Tier 1 — Primary (drive the design)

### 1. Managing Editor

**Who:** Runs editorial. Opens the dashboard on a phone and wants the picture in seconds. Not a data analyst — wants answers, not a query tool.

**Decisions**
- *Retrospective:* Did this story land across its full journey (site → socials → email)? Which formats are pulling their weight? What's working, what isn't.
- *Generative:* What to commission next, read off demonstrated audience demand by Topic / Series / Format. Which Series are worth launching. Which to wind down.

**Needs:** Story-level cross-platform rollups; format-vs-format and Series-vs-Series comparison; performance sliceable by the editorial cuts (Topic, Series, Format, Section) so demand patterns are legible at a glance.

**Frustration relieved:** There is no single place today to see a story's full publication journey across website, socials, and email. This is Mada's stated #1 frustration, verbatim.

**Anchors:** Priority Q1 (story / format across platforms). Primary views: Overview, Stories.

### 2. Social / Audience Analyst

*(represents the social/audience team)*

**Who:** The person who today hand-builds the monthly performance spreadsheets — velocity-by-format, format-across-platforms, socials-driven traffic. The dashboard replaces that manual compilation. The closest thing Mada has to a power user.

**Decisions**
- *Retrospective:* What resonated per platform, and why? Which social treatments converted views into interactions, site visits, and signups? Which stories drove follower growth, on which platforms?
- *Generative:* Where to put social effort next; which treatments to repeat.

**Needs:** Per-platform native detail; socials→site conversion (Bitly / t.co) and socials→newsletter conversion (Mailchimp link clicks); views→interactions ratios; story-grouped reach; audience-acquisition signal (follower growth) shown alongside content.

**Frustration relieved:** The monthly manual stitch-together across disconnected analytics tools disappears; cross-platform and story-grouped numbers exist without spreadsheet labor.

**Anchors:** Priority Q2 (socials → site / newsletter) and Q3 (views → interactions; using existing audience to build audience). Primary views: Platforms, Stories, Overview.

---

## Tier 2 — Secondary (served by Headlines + filtered access)

### 3. Business / Commercial

- **Who:** Consumes; does not operate the dashboard daily.
- **Decisions:** Where audience engagement and composition signal commercial opportunity.
- **Needs:** Aggregate engagement and audience numbers; occasional deeper cuts pulled from Content / Stories.
- **Served by:** Headlines view, plus filter access to Content. No dedicated build.

### 4. Fundraising

- **Who:** Pulls numbers for grant reports — periodically, not daily.
- **Decisions:** What reach-and-impact story to tell funders.
- **Needs:** Clean, authoritative, exportable aggregate totals — reach, engagement, follower growth — over quarters and half-years.
- **Served by:** Headlines view, exportable. One hard requirement: totals must be **defensible** — no double-counting across the Content↔Stories layers, no invented attribution.

---

## Carry-forward into the next tasks

Decisions made here that constrain Question Mapping, Metrics, and Visualization:

1. **Performance must be sliceable by the editorial cuts** (Topic / Series / Format / Section), not just presented as a flat content list. The Managing Editor's generative questions ("what to cover / what Series to start") are unanswerable otherwise. → Drives both metric grouping and view design.

2. **Follower growth is correlational, not attributive.** No reliable per-post "earned N followers" signal exists across our platforms; Followers History gives daily *account-level* counts only (and its scheduler is currently Blocked). "Which stories drove followers" is answered by overlaying follower growth on the content timeline and reading coincidence — the same epistemics as Mada's own socials-driven-traffic exercise. Be explicit with Mada that it is correlation. → Metrics task must not define a per-story follower metric; viz task shows trend-with-timeline.

3. **"Why" is enabled, not computed.** Several questions end in "why / how." The dashboard cannot compute why; it supports the inference by placing the right comparison next to the headline number (this Series won on higher save-rates and more site visits). → Viz-task concern: adjacency of supporting metrics.

4. **Defensible aggregates for the secondary tier.** Fundraising numbers must survive external scrutiny — clean de-duplication across layers, no fictional attribution. → Constrains the Stories rollup definitions in the Metrics task (the multi-story-member / newsletter double-counting guardrail already flagged).
