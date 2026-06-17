# Mada Index — Visualization Spec (Dashboard)

*Planning & Architecture → Frontend · consumes Persona Map + Question Map + Metrics Spec*
*Output: per-view build spec. Implementation lives in the Frontend & Dashboard tasks.*

Five views. Two primary personas drive the design (Managing Editor, Social/Audience Analyst); the two secondary personas (Business, Fundraising) are served by Headlines plus filtered Content. Every component names the question(s) it answers and the metric(s) it reads, so the chain from persona → question → metric → pixel stays intact.

**Stack:** Next.js + Tailwind + shadcn/ui + Recharts on Vercel; single shared password; mobile-responsive (Overview + Stories are the phone-critical views — the Managing Editor opens on a phone).

---

## 0. Global shell (every view)

- **Navigation:** Overview · Stories · Content · Platforms · Headlines.
- **Date range + compare-to-previous:** global range picker with an optional "vs previous period" toggle. **Period semantics (critical):** metrics are lifetime-only, so a date range means *content published in that range* (publish cohort), not metric-as-of-date. Label it explicitly — e.g. "Published May 1–31" — so it's never misread as a same-content delta.
- **Global filters:** Language (AR / EN / Both), Section, Geography, Format, Series, Topic, Platform/Type. Apply across views, persist on navigation.
- **Honesty labels (from the Metrics Spec):** EQR is an index (can exceed 100, not a capped %); Penetration can exceed 100% (out-reached base — meaningful); follower-overlay charts labelled "correlation, not attribution"; trend/period charts labelled as publish-cohort.

---

## 1. Overview — landing
*Managing Editor (primary), Analyst. At a glance: is the operation healthy, what's hot, are we publishing consistently.*

| Component | Viz | Reads | Answers |
|---|---|---|---|
| Hero KPI cards | Big number + period delta | Σ Impressions, Σ Weighted Engagement, Σ Site Clicks, follower total | ME-5, BC-1 |
| Publishing velocity | Stacked bar by Format over publish-periods | count of Content × Format | ME-3 |
| Top performers this period | Ranking list | Stories / Content by WE or EQR | ME-4 |
| Recent highlights | Compact cards | top movers, notable pieces | ME-4 |

Interactions: period toggle (deltas on KPIs); click a top story → Stories detail; click a velocity segment → Content filtered to that Format.

---

## 2. Stories — the priority view
*Managing Editor (primary), Analyst. Mada's #1 frustration answered: a story's full journey across website → socials → email. At a glance: which stories landed; on drill: the whole journey.*

**Story list:** ranking by Story Weighted Engagement / Story Impressions / Story Site Clicks (sortable). Each row: title, date span, platform-count badges, headline totals.

**Story detail (drill-down) — the journey:**
- **Totals header:** Story Impressions, WE, Site Clicks, Attention, platform count, date span. (ME-1.)
- **Per-platform journey:** member expansion — the anchor article + every promoting post / newsletter / video, each a card with its own Impressions / WE / EQR / Site Clicks, laid out on a **publish-date timeline** so the dissemination sequence (website → socials → email) is visible. Computed client-side from member rows; totals come from Airtable rollups.
- **"Why" adjacency:** save-rate, Site Clicks, EQR beside the totals so the ME can infer *why* it worked.

Interactions: filter the story list by the editorial cuts (Section / Geography / Format / Series / Topic) — this is where ME-6 (demand by cut) and ME-7 (Series performance, launch/wind-down) are read, by grouping and ranking stories along a cut.

---

## 3. Content — the filterable list
*Analyst (power user), ME. At a glance: nothing — this is the query surface; on drill: any single piece's full performance.*

Filterable, sortable **table** of every piece. Columns: Name, Type, Published, Impressions, WE, EQR, Site Clicks, Attention, + Exposure / Quality **percentile badges** (within Type, client-side). Filter by all global dimensions + author; sort by any metric. (ME-4; AN-5; BC-2 via Topic filter + EQR sort.)

Drill: row → piece detail (full metric set, parent Story link, native GA detail for articles).

---

## 4. Platforms — cross-platform comparison
*Analyst (primary). At a glance: which channels pull weight, are socials driving the site; on drill: native per-platform richness.*

| Component | Viz | Reads | Answers |
|---|---|---|---|
| Channel comparison | Grouped bar across Types | Impressions, WE, EQR, Site Clicks | AN-3 |
| Socials → site | Ranking bar by platform | Site Clicks | AN-1 |
| Views → interactions | Bar by platform | EQR | AN-4 |
| Best treatments | Ranking, filterable by platform | EQR / Site Clicks / save-rate | AN-5 |
| Follower growth | **Line over time (weekly)** + optional content-timeline overlay | Followers table | AN-7, AN-6 (correlational) |

The follower line is the **one genuine time-series** in the product (weekly snapshots). The AN-6 overlay (which stories coincided with follower jumps) is labelled correlation. Drill: click a platform → native deep-dive (FB reaction breakdown, IG saves, YouTube retention) from the platform tables.

---

## 5. Headlines — aggregates for grant reports
*Fundraising + Business (secondary). At a glance: the big defensible numbers; export for funders.*

| Component | Viz | Reads | Answers |
|---|---|---|---|
| Footprint totals | Big number, quarter / half-year | Σ Impressions, Σ WE, Σ Attention (hours) — de-duped via Counts Toward Story Total | FR-1, BC-1 |
| Impression mix | Stacked bar by Type | Impressions by Type | keeps the mix visible |
| Audience growth | Line over time | weekly Followers + newsletter subscriber growth (campaign send sizes) | FR-2 |
| Topic / campaign aggregate | Big number + by-platform breakdown, Topic-filtered | Topic-filtered sums | FR-3, BC-2 |

Interactions: quarter / half-year selector; Topic / campaign filter; **export (CSV / PDF)**. Defensible-aggregates rule enforced (no double-counting across Content↔Stories).

---

## 6. Chart-type rationale (answer shape → viz)

- **Single number** → KPI card (+ delta). Totals, footprint, period deltas.
- **Breakdown** → stacked / grouped bar. Avoid pie except trivial 2–3-part splits.
- **Comparison** → grouped bar, or side-by-side with deltas.
- **Ranking** → ordered list / bar. Top-bottom performers, best treatments, demand-by-cut.
- **Trend** → line / area **only for the genuine time-series (follower growth, weekly)**; everything else "over time" is a **publish-cohort** bar/line over publish-periods, labelled as such. **Sparklines** limited to real series (followers, cohort velocity) — no per-piece metric sparklines, since there's no daily history.
- **Heatmap (optional)** → Topic × Platform coverage ("where is each topic being pushed"), or publish cadence (week × day-of-week).
- **Interactive comparison** → period-vs-period toggle; AR / EN language segment toggle.

---

## 7. Honesty in the UI

- EQR: index, can exceed 100 — label; don't render as a 0–100% capped bar.
- Penetration: can exceed 100% (out-reached base) — meaningful; label.
- Follower overlays: "correlation, not attribution."
- Period / trend: "publish cohort," not same-content deltas.

---

## 8. Carry-forward to the build

- Maps onto the existing Frontend tasks: Overview / Stories / Content / Platforms / Headlines pages, global filter + date-range UI, Airtable fetch + caching, navigation + responsive shell.
- **Percentiles** computed client-side within Type on render (Metrics Spec §5).
- **Stories per-platform breakdown** = member expansion, computed client-side; totals from Airtable rollups.
- Recharts for charts; shadcn/ui for tables / cards / filters.
- Mobile priority: Overview + Stories must work on a phone; Content / Platforms / Headlines can be desktop-first / denser.
