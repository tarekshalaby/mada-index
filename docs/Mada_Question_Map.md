# Mada Index — Question Map

*Planning & Architecture · sits on the Persona Map, feeds the Metrics spec*
*Every question the dashboard must answer, by persona, tagged with the shape of its answer.*

Anchored on Mada's three stated priority questions (PDF p.9):

1. How did **X story** perform across dissemination platforms? How is **X format** performing across platforms?
2. Is our content on socials **attracting readers to the website and/or newsletter signups**?
3. How successfully are we **demonstrating the value of our stories on socials** — turning views into interactions, and using existing audience to build audience?

### Answer shapes

- **Single number** — one headline figure, usually with a period delta
- **Breakdown** — composition of a whole (by platform, format, type, topic)
- **Trend** — change over time
- **Comparison** — two or more things, or two periods, side by side
- **Ranking** — ordered list, top / bottom N

Compound answers (e.g. *single number + breakdown*) are tagged where a question genuinely needs more than one.

---

## Tier 1 — Primary

### Managing Editor

| # | Question | Answer shape | Source / note |
|---|----------|--------------|---------------|
| ME-1 | How did this story perform across every platform it appeared on? | Single number + breakdown (by platform) + trend | **The story-journey question.** Mada frustration #1; Priority Q1. |
| ME-2 | How is each format performing across platforms? | Comparison + ranking | Priority Q1 (second half). |
| ME-3 | How much did we publish, by format, over this period? | Trend + breakdown | Publishing velocity — Mada already tracks this manually. |
| ME-4 | Which stories are the top (and bottom) performers this period? | Ranking | |
| ME-5 | How does this period compare to the previous one? | Comparison (period delta) | Applies across all headline metrics. |
| ME-6 | Which Topics / Series / Formats show the strongest audience demand? | Ranking + breakdown | **Generative core** — what to commission. Covers "what to cover next" and "what Series to start." |
| ME-7 | Which Series are performing well — and which to launch or wind down? | Comparison + ranking | Explicit Mada question. "Why" answered by supporting-metric adjacency (viz). |

### Social / Audience Analyst

| # | Question | Answer shape | Source / note |
|---|----------|--------------|---------------|
| AN-1 | Are our socials driving readers to the website? | Trend + single number + breakdown (by platform) | Priority Q2 (site half). Bitly / t.co clicks. |
| AN-2 | Are our socials driving newsletter signups? | Trend + single number | Priority Q2 (newsletter half). ⚠ Attribution weak — see flags. |
| AN-3 | How is our content performing per platform? | Breakdown + comparison | Platforms view core. |
| AN-4 | Are we converting views into interactions? | Single number (rate) + trend | Priority Q3. Engagement per impression. |
| AN-5 | Which social treatments convert best — to interactions, site visits, signups? | Ranking + comparison | |
| AN-6 | Which stories drove follower growth, on which platforms? | Trend (timeline overlay) | ⚠ Correlational, not attributive — see flags. Priority Q3; explicit Mada question. |
| AN-7 | How is our follower base growing across platforms over time? | Trend + breakdown | Account-level — clean. |

---

## Tier 2 — Secondary (served by Headlines + filtered access)

### Business / Commercial

| # | Question | Answer shape | Source / note |
|---|----------|--------------|---------------|
| BC-1 | What's our overall engagement and audience footprint this period? | Single number + breakdown | Headlines. |
| BC-2 | Which content / topics carry the most engaged audiences? | Ranking | Commercial signal; pulled from Content. |

### Fundraising

| # | Question | Answer shape | Source / note |
|---|----------|--------------|---------------|
| FR-1 | What's our total reach and engagement this quarter / half-year? | Single number + trend | Headlines, exportable. Must be de-duped. |
| FR-2 | How has our audience grown across all platforms? | Trend + single number (delta) | Follower growth, account-level — clean. |
| FR-3 | How did [a given topic / campaign] perform in aggregate? | Single number + breakdown (by platform) | Topic-filtered aggregate for grant reports. |

---

## Data-honesty flags (resolve in the Metrics task)

1. **Follower growth is correlational only (AN-6).** No per-story follower-attribution signal exists across our platforms. Answer by overlaying account-level follower trend (Followers History) on the content timeline and reading coincidence. Do **not** define a per-story follower metric. Account-level growth trend (AN-7, FR-2) is clean and unaffected.

2. **Newsletter-signup conversion has weak attribution (AN-2).** Socials→site is measurable by Bitly / t.co click. Socials→newsletter-*signup* is softer: we have Mailchimp link clicks and subscriber-count trend, but no signup-source funnel tying a new subscriber to a specific post. Treatment: signup-CTA clicks where wrapped, plus subscriber-growth trend overlaid on campaigns — correlational. Decide in Metrics whether Q2's newsletter half gets a real metric or a correlational read. (Socials→site, AN-1, is solid.)

3. **"Why / how" questions (ME-7, AN-6) are enabled, not computed.** The dashboard supports the inference by placing the right comparison next to the headline number; it does not compute causation. Viz-task concern (supporting-metric adjacency).
