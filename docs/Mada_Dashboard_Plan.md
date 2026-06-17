# Mada Index — Dashboard Plan (persona coverage → per-view brief)

*Planning & Architecture → Frontend · the single current source of truth for the dashboard build.*
*Consolidates the Persona Map, Question Map, Metrics Spec, and Visualization Spec, plus every decision taken through low-fi wireframing.*
*Status: all five views wireframed (low-fi), June 5 2026. Next: one hi-fi design-language pass, then build in Claude Code.*

> **What changed in this revision (post-wireframe consolidation):**
> - **Build target switched from Next.js/Vercel to a single Airtable Interface Extension** (decision A1). This supersedes the stack line in the Visualization Spec.
> - Locked a **visual-first design language** (V1), a **minimal-controls** principle (V2), and a dashboard-wide **platform palette** (P1).
> - Per-view refinements from wireframing — **Overview**: a five-tile KPI set, area-by-day velocity, and a new *Top topics & series* card. **Content**: a one-tap *Articles* entry, a Table/Gallery toggle, and a fixed column set (no column picker). **Platforms**: split into *Comparison / Audience / Treatments* sub-tabs, with a *Posts* metric, an AR/EN segment, a socials→newsletter read, and a Website→articles drill (incl. main vs mirror). **Headlines**: stripped to a period selector, export, and one topic filter.

---

## 0. Decisions ledger (what we settled)

| ID | Decision |
|---|---|
| **F1** | **No Supabase per-piece history this phase.** Content/Stories are lifetime-only. The *only* genuine time-series is the weekly `Followers` table (+ D3 subscriber flow). Everything else "over time" is a **publish cohort**. No per-piece sparklines. A Story's "trend" is the publish-date sequence of its members (the journey timeline), not a metric-over-time line. (The `URL Path` / `Video ID` join keys stay wired for a later phase.) |
| **F2** | **Operations and Topic governance stay in Airtable**, not in the dashboard. Link-confirmation (`Content.Story Match`) and Topic approval (`Topics.Status` Pending→Active) are saved grid views, the ~5-min/week ambient workflow. No dashboard surface in v1. |
| **D1** | **Add editorial-cut lookups on Content** (via the `Story` link): Format, Section, Geography, Series, Topics. The cuts are canonical on Stories; Content needs them locally so the Content page and the global filter bar can read them per-piece. Content with no Story is unclassified (expected). |
| **D2** | **Add `Counts Toward Story Total` (checkbox, default true) on Content**; rebuild Story rollups to sum only where true. Newsletters/roundups = false. **Newsletters join each story they reference as members with Counts=false** ("mentioned in"), auto-derived from `Links.Destination Story` — they appear in the email leg of every story journey they touched without inflating any story's totals. This also clears the deferred MailChimp-multi-story edge. |
| **D3** | **New `Newsletter Audience` table** — per list (AR/EN), per week: subscriber count + new + unsubscribed + net. **Aggregate only — no individual identities or emails** (the Security & Data commitment to Mada). Feeds FR-2 and the AN-2 acquisition curve. |
| **①** | **Format-across-platforms is a first-class hero component** ("Format performance across platforms") on Overview — **per-piece averages** by Format × platform, with a website overlay line. Mada's signature monthly chart. Fully explorable via the Format filter elsewhere. |
| **②** | **Topics and Series stay filters, not nav views — but a filter yields an aggregate.** When a Topic/Series/Section cut is active (Stories + Headlines), render an aggregate header (Σ for the cut + member/platform counts) above the ranked list. Series also gets a cohort-over-time read for launch/wind-down. |
| **③** | **AR/EN is a global filter + a segment toggle** on the comparison charts (format-across-platforms, velocity, channel comparison, follower growth). No dedicated language view. |
| **AN-clicks** | **Site Clicks live at the platform-group level**, never summed per-post (shared links double-count). Story totals use the article's *received* clicks (accurate). In the journey, each platform group shows its accurate click total with contributing posts listed beneath; every other metric is per-post. Partial-attribution platforms (Instagram link-in-bio, pending) are labeled, not shown as a true zero. |
| **AN-4** | Show **both** EQR (weighted, headline) and the raw `Interactions ÷ Impressions` rate. |
| **AN-5** | Treatment dimensions **in v1**: rank by EQR / Site Clicks / save-rate, sliceable by Media Type, **plus a publish-cadence heatmap** (week × day-of-week). |
| **FR-1 rule** | Headlines totals sum **over Content rows, each piece once** (a newsletter contributes its own opens once — not double-counting article pageviews), with the **by-Type mix always visible**; never a single conflated "reach." `Counts Toward Story Total` governs the *story* rollups so no individual story inflates. The funder-defensible posture. |
| **Export** | v1 = **CSV download + a print-friendly layout** (browser "print → PDF"). No server-side PDF generation in v1. |
| **A1** | **Build inside Airtable Interface Extensions — not Next.js/Vercel.** The whole dashboard is **one SPA-style custom extension**: internal routing across the five views + a shared global filter/date state (this is what makes filters persist across views). Built with Claude Code, auto-released to the base on git push. The SDK reads the base directly (`useRecords`/`useBase`) — no PAT, no REST client, no caching layer, no hosting, no auth to build. **Portability boundaries, so a later jump to Vercel stays a thin rewrite rather than a rebuild: (1)** every Airtable-SDK call lives in one **data-adapter** module; **(2)** all metric/transform logic — percentiles, journey assembly, cohort grouping, de-dup — sits in **pure, framework-agnostic functions**; **(3)** UI uses **plain React + Tailwind + Recharts**, not Airtable's SDK UI kit. **Mobile:** custom extensions don't render in the Airtable mobile app, so v1 is desktop-first; native Airtable interface pages can be added later for phone. **Access:** everyone signs in with one shared Airtable login — nothing hidden, so there is no per-user auth to build (the old "single-password via Vercel" task is removed). |
| **V1** | **Visual-first design language.** Lean on photos/thumbnails, colourful charts that carry the story, and benchmark cues that read **green/red (good/bad) at a glance** — tied to good-vs-bad, not merely up-vs-down (EQR up = green; "pieces published, down" is *not* red). Simple, minimalist icons throughout. |
| **V2** | **Minimal controls.** Keep every page calm. Scope filters earn their place (date, topic, type), but **no piles of display toggles** — they crowd the page and complicate the experience. The user is explicitly not interested in giving lots of control over how data is displayed. Design-phase trim candidates flagged during wireframing: the Content **Table/Gallery toggle** and the **per-chart metric toggles**. |
| **P1** | **Platform palette, dashboard-wide.** Facebook `#378ADD` · Website `#1D9E75` · X `#BA7517` · Instagram `#D4537E` · YouTube `#C0392B` · LinkedIn `#2C7BB6` · Newsletter `#888780` · Podcast `#534AB7`. Applied consistently to every bar, line, segment, and legend. |

---

## 1. Foundations

- **Five views are locked**: Overview, Stories, Content, Platforms, Headlines — all now wireframed (low-fi). We are not re-choosing views; every persona need has a home inside them.
- **Build target: one Airtable Interface Extension** (A1), not a Next.js/Vercel app. The frontend reads the base directly through the SDK; it does not compute the core metrics.
- **Two primary personas drive the design** — Managing Editor and Social/Audience Analyst. **Two secondary** — Business/Commercial and Fundraising — are served by Headlines + filtered Content, no dedicated build.
- **The metric layer is live and built.** Content carries every standardized metric (Weighted Engagement, EQR, Interactions, Attention + avg, Penetration Rate, Potential Audience) plus a granular Site Clicks system (per-platform splits, a Total, and a *received* rollup). Stories carries all rollups (Impressions, WE, Interactions, Site Clicks, Attention total, Platform count, First/Last Published, story EQR, story Attention avg). `Links`, `Followers`, `Topics`, `Contributors` are real.
- **Honesty labels are part of the design**: EQR is an index (can exceed 100); Penetration can exceed 100; follower/subscriber overlays are *correlation, not attribution*; trend/period cuts are *publish cohort*; partial click attribution (IG link-in-bio) is labeled.
- **Visual-first and minimal (V1, V2)** govern the look: photos, colourful story-telling charts, green/red benchmark cues, simple icons — with few controls so pages stay calm.

---

## 2. Persona coverage matrices

### 2.1 Managing Editor — primary

| Q | Wants | Live field(s) | Viz | View | Honesty |
|---|---|---|---|---|---|
| ME-1 | Did this story land across its whole journey? | `Stories`: Impressions, WE, Site Clicks, Attention (total), Platform count, First/Last Published + member rows | Totals header + per-platform member cards on a publish-date timeline | Stories detail | "trend" = the dissemination timeline, not a metric-over-time line (F1) |
| ME-2 | Which formats pull their weight, across platforms? | Story metrics **averaged per piece** by `Format` × Type + website overlay | Grouped bar (format × platform) + ranking — **hero (①)** | Overview (+ Format filter) | — |
| ME-3 | How much did we publish, by format, this period? | count of Content × `Format` over publish-periods | **Stacked area by day** (day/week/month toggle) | Overview | publish cohort |
| ME-4 | Top / bottom performers this period? | Stories/Content ranked by WE / EQR / Impressions; Content percentile badges | Ranking list + sortable table | Overview + Content | — |
| ME-5 | This period vs last? | same metrics, two publish cohorts | KPI cards + delta | Global | publish cohort, not same-content delta |
| ME-6 | Which Topics / Series / Formats show demand? | Story rollups grouped by `Topics` / `Series` / `Format` | Aggregating filter (②) **+ Overview *Top topics & series* card** | Stories + Overview | — |
| ME-7 | Which Series to launch / wind down? | Series-grouped rollups + supporting metrics; cohort over time | Comparison + ranking, supporting-metric adjacency | Stories (Series cut) | "why" is enabled by adjacency, not computed |

### 2.2 Social / Audience Analyst — primary

| Q | Wants | Live field(s) | Viz | View | Honesty |
|---|---|---|---|---|---|
| AN-1 | Are socials driving site traffic, by platform? | `Content.Site Clicks: Total` + per-platform splits; `Links` referrer splits | Ranking bar by platform (group-level) + cohort trend | Platforms · Comparison | IG partial (link-in-bio pending) — labeled; group-level only |
| AN-2 | Are socials driving newsletter signups? | `Newsletter Audience` (D3) new-subscriber flow; signup-CTA clicks from `Links` (External) if wrapped | Signup-CTA-clicks bar (Platforms) + subscriber line (Headlines) | Platforms · Comparison / Headlines | correlation, not attribution — no signup-source funnel |
| AN-3 | How is content performing per platform? | `Content`: Impressions, WE, EQR, Site Clicks, **Posts** by Type; native richness in platform tables | Channel comparison (metric toggle) → drill to native | Platforms · Comparison | **Website drills to the article layer** (top articles, reading time, main vs mirror) |
| AN-4 | Are we converting views into interactions? | `Content.Engagement Quality Rate` + raw `Interactions ÷ Impressions` | EQR option on the channel-comparison toggle + raw rate | Platforms · Comparison | EQR is an index (can exceed 100) |
| AN-5 | Which treatments convert best? | rank social `Content` by EQR / `Site Clicks: Total` / save-rate; slice by `Media Type`, timing | Ranking (filterable) + **publish-cadence heatmap** | Platforms · Treatments / Audience | — |
| AN-6 | Which stories drove follower growth, where? | `Followers` weekly counts overlaid on the story timeline | Follower line + story-date overlay | Platforms · Audience | correlation, not attribution |
| AN-7 | How is the follower base growing? | `Followers.Follower Count` by `Snapshot Date` × `Platform` | Line over time + breakdown | Platforms · Audience + Headlines | clean — account-level |

### 2.3 Business / Commercial — secondary (Headlines + filtered Content; no dedicated build)

| Q | Wants | Live field(s) | Viz | View |
|---|---|---|---|---|
| BC-1 | Overall engagement + audience footprint this period | Σ `Content` Impressions / WE / Attention (hrs); follower total (`Followers`) | KPI big-numbers + Type mix | Headlines |
| BC-2 | Which content / topics carry the most engaged audiences | `Content`/`Stories` ranked by EQR, Topic-grouped | Ranking + topic aggregate | Headlines + Content (Topic filter, EQR sort) |

### 2.4 Fundraising — secondary (Headlines, exportable; no dedicated build)

| Q | Wants | Live field(s) | Viz | View |
|---|---|---|---|---|
| FR-1 | Total reach + engagement this quarter / half-year | Σ over `Content`, each once, Impressions / WE / Attention (hrs); Type mix; de-duped | Big numbers, quarter/half selector, export | Headlines |
| FR-2 | Audience growth across platforms | `Followers` (social/streaming) + newsletter subscribers (`Newsletter Audience`, D3) | Line over time | Headlines |
| FR-3 | A given topic / campaign in aggregate | Topic-filtered Σ (aggregating filter, ②) | Big number + by-platform breakdown | Headlines + Stories (Topic cut) |

**Fundraising hard requirement:** totals are defensible — de-duped per the FR-1 rule, no invented attribution. Every correlational/cohort number is labeled.

---

## 3. Per-view inventory (the wireframe brief)

### 3.0 Global shell (every view)
- **Nav:** Overview · Stories · Content · Platforms · Headlines.
- **Date range + "vs previous period" toggle.** Publish-cohort semantics — label explicitly (e.g. "Published May 1–31"), never read as a same-content delta.
- **Global filters (persist across views):** Language (AR / EN / Both) + **AR/EN segment toggle (③)** on comparison charts; Section; Geography; Format; Series; Topic; Type. Read from Content via the D1 lookups (and from Stories).
- **Honesty labels (global):** EQR index; Penetration >100; correlation overlays; publish-cohort; partial click attribution.
- **Auth:** one shared Airtable login (A1) — no per-user accounts, nothing hidden.
- **Mobile:** desktop-first. Custom Interface Extensions don't render in the Airtable mobile app, so phone access (if needed) comes later via native Airtable interface pages for the phone-critical views (Overview + Stories).
- **Controls (V2):** minimal — scope filters only, no display-toggle piles.

### 3.1 Overview — landing *(ME primary, Analyst)*
- **Hero KPI tiles (big number + green/red benchmark delta, V1):** Σ Impressions, Σ Weighted Engagement, Σ Site Clicks, follower total, **Attention total (hours — "time spent with our work")**. Five tiles; delta colour tied to good/bad, not up/down. Row could become user-selectable later; fixed for v1. *(ME-5, BC-1)* → click-through to the relevant view.
- **Format performance across platforms (hero, ①):** grouped bar, per-piece **averages** by Format × platform (FB/IG/X/LinkedIn/YouTube), with a website overlay line and an AR/EN toggle. *(ME-2)*
- **Publishing velocity:** **stacked area by day**, segmented by Format, with a **day / week / month** toggle (default weekly; area smooths daily noise; monthly can switch to a stacked bar). Publish-date based — clean, not a metric snapshot. *(ME-3)* → click a band → Content filtered to that Format + period.
- **Top topics & series this period (NEW):** compact ranking of the top 3–5 Topics and Series by Weighted Engagement, each with a green/red benchmark vs its own prior period. Puts ME-6's generative "what to commission / what Series to start" signal on the landing. *(ME-6)*
- **Top performers:** ranking list (Stories/Content by WE or EQR), thumbnail-led. *(ME-4)* → click → Stories detail.
- **Recent highlights:** compact cards with thumbnails — top movers / notable pieces, each with a benchmark cue. *(ME-4)*

### 3.2 Stories — the priority view *(ME primary, Analyst)*
- **Story list:** ranking by Story Weighted Engagement / Impressions / Site Clicks (sortable). Each row: title, date span (First→Last Published), platform-count badges, headline totals. Filterable by the editorial cuts.
- **Aggregating filter (②):** when a Topic / Series / Section cut is active, an **aggregate header** (Σ Impressions / WE / Site Clicks + member & platform counts) sits above the list. Series additionally: cohort-over-time (this period vs prior). This is where ME-6 and ME-7 are read.
- **Story detail (drill) — the journey** *(the single most important element in the product)*:
  - **Totals header:** Story Impressions, WE, Site Clicks, Attention (total), platform count, date span. *(ME-1)* De-duped via Counts Toward Story Total.
  - **Per-platform journey:** members grouped by platform on a publish-date timeline (website → socials → email). **Site Clicks shown at the platform-group level** (accurate, received-based; contributing posts listed beneath); every other metric (Impressions / WE / EQR / saves) per-post on each card. Newsletters appear in the email leg as members with Counts=false (D2) — visible, not counted. Partial-attribution platforms (IG) labeled.
  - **"Why" adjacency:** save-rate, Site Clicks, EQR beside the totals.

### 3.3 Content — the filterable list *(Analyst power user, ME)*
- **One-tap Type entry (NEW):** a segmented control — **All content · Articles · Social · Newsletters · Podcasts** — with **Articles the prominent default**, because articles are the core content type. Replaces a buried Type filter; this is where articles are *seen, navigated, interacted with*.
- **Table / Gallery toggle (V2 trim candidate):** Table for scanning/sorting; Gallery (thumbnail grid) for browsing.
- **Fixed, important columns only — no column picker:** Name, Type, Published, Impressions (labelled **Views** when Articles is active), WE, EQR, Site Clicks, + Exposure / Quality **percentile badges** (within Type, client-side — the green/red benchmark). Everything else lives in the row detail. Filter by all global dimensions + Author (`Contributors`); sort by any column. *(ME-4; AN-5; BC-2 via Topic filter + EQR sort)*
- **Drill:** row → piece detail — full metric set, parent Story link; for **articles**, the native GA strip (Engagement Rate, Avg Reading Time, Bounce Rate) that no other type has; Penetration Rate shown here, labelled index.

### 3.4 Platforms — cross-platform comparison *(Analyst primary)*
**Three sub-tabs to keep the densest view calm (V2): Comparison · Audience · Treatments.**

**Comparison**
- **Channel comparison:** ranking bars across Types; metric toggle **Impressions / WE / EQR / Site clicks / Posts** (Posts = volume per channel; EQR = the AN-4 views→interactions read, with the raw `Interactions ÷ Impressions` rate alongside). **AR/EN segment toggle (③).** P1 colours; green/red period deltas. *(AN-3, AN-4)*
- **Socials → site:** ranking bar by platform — Site Clicks (group-level, received-based). IG labelled partial (link-in-bio pending). *(AN-1)*
- **Socials → newsletter (NEW):** signup-CTA clicks by platform; the subscriber-*growth* curve lives on Headlines. Both correlational, labelled. *(AN-2)*
- **Website → articles drill (NEW — closes the gap that the spec defined no Website drill):** top articles by pageviews, avg reading time, and the **main vs mirror split** (the mirror is what socials link to, so mirror pageviews are the socials-driven-traffic signal). Confirm GA4 feeds main and mirror distinctly. Full article *browsing* stays in Content.

**Audience**
- **Follower growth (the one genuine time-series, anchors this tab):** weekly `Followers`, multi-line, **log scale** so platforms of very different size are comparable; optional story-timeline overlay (labelled correlation). *(AN-7, AN-6)*
- **Publishing-cadence heatmap:** week × day-of-week, with a Publishing / Engagement toggle. *(AN-5 timing)*

**Treatments**
- **Best treatments:** ranking, filterable by platform — EQR / Site Clicks / save-rate; sliceable by `Media Type`, with a green/red benchmark vs the platform median. *(AN-5)*

- **Native per-platform drills:** FB reaction mix (Like/Love/Haha/Wow/Sorry/Anger); IG saves + media type; YouTube retention curve + 10/50/75/95; Podcast retention 25/50/75/100; X retweet vs quote; **Website = the articles drill above.**

### 3.5 Headlines — aggregates for grant reports *(Fundraising + Business, secondary)*
**The sparest screen (V2): period selector + export + one topic filter, no display toggles.**
- **Controls:** period selector (quarter / half-year / year) + **export (CSV + print-friendly layout)** + a single **Topic / campaign filter**.
- **Footprint totals:** three big de-duped numbers — Σ Impressions, Σ Weighted Engagement, **Σ Attention (hours) = "time spent with our work"** — each piece counted once (FR-1), with the **impression-mix bar always visible** beneath so it's never one conflated "reach." Each carries a green/red delta vs the prior period. *(FR-1, BC-1)*
- **Audience growth:** account-level over the period — total social/streaming followers + total newsletter subscribers (AR + EN). Clean, not correlational. *(FR-2)*
- **Topic / campaign aggregate:** Topic-filtered Σ (Impressions / WE / pieces) + by-platform breakdown. De-duped, export-ready. *(FR-3, BC-2)*

---

## 4. Database prerequisites (before / alongside the build)

These three Airtable adds gate the page builds.

- **D1 — Content editorial-cut lookups.** On `Content`, add lookups via the `Story` link: Format, Section, Geography, Series, Topics. *Gates:* Content page filters, global filter bar, AN-5 Format slicing.
- **D2 — Story-total de-dup + newsletter membership.** On `Content`, add `Counts Toward Story Total` (checkbox, default true). Rebuild every Story rollup to sum only members where true. Wire a Make step that links each newsletter Content row to the stories of the articles it references (from `Links.Destination Story`), with Counts=false. *Gates:* Stories totals, Headlines footprint, the email leg of the journey.
- **D3 — Newsletter Audience table.** New table — per list (AR/EN), per week: subscriber count, new subscribers, unsubscribes, net. **Aggregate only, no PII.** *Gates:* Headlines audience growth, AN-2 acquisition curve.
- *Not in this phase:* Supabase per-piece history (F1). Ops/link-confirm + Topic governance stay in Airtable (F2).

---

## 5. Implementation pipeline (how we build it)

1. **Wireframes (low-fi)** — done, in chat. All five views.
2. **Hi-fi design-language pass** — one fully-styled mockup (Overview or Stories) to lock palette / chart style / photo treatment / benchmark-cue language before any code. In chat. *(Not Claude Design — for a React extension a canvas mock would only add a design→code step.)*
3. **Build — Claude Code**, in the Interface Extensions SDK repo: scaffold the project → the data adapter → the pure metric functions → the five views with Recharts → push to GitHub for auto-release into the Mada Index base. (The Airtable records/schema access is for D1/D2/D3, not the extension code.)

**Build order (tracker):** SDK project setup → design system (Tailwind + tokens, **portable React — no shadcn**) → data adapter → nav/shell + shared filter state → Overview / Stories / Content / Platforms / Headlines → global filter + date-range UI → QA.
**Gating:** land **D1** before Content/Platforms filters, **D2** before Stories/Headlines totals, **D3** before Headlines audience-growth + AN-2.

---

## 6. Coverage audit

| Q | Answered by | Status |
|---|---|---|
| ME-1 story across platforms | Story rollups + per-platform member timeline | ✓ |
| ME-2 format across platforms | Format hero (per-piece averages) | ✓ |
| ME-3 velocity by format | stacked area by day (day/week/month) | ⚠ publish cohort |
| ME-4 top/bottom performers | rankings + percentile badges | ✓ |
| ME-5 period vs period | KPI deltas | ⚠ publish cohort |
| ME-6 demand by cut | aggregating filter on Stories + Overview *Top topics & series* | ✓ |
| ME-7 Series launch/wind-down | Series cut + adjacency + cohort | ✓ (why = enabled) |
| AN-1 socials → site | Site Clicks by platform | ⚠ cohort trend; IG partial |
| AN-2 socials → signups | signup-CTA clicks + subscriber growth | ⚠ correlational |
| AN-3 per-platform performance | channel comparison (incl. Posts) + native drill | ✓ |
| AN-4 views → interactions | EQR + raw rate | ✓ |
| AN-5 best treatments | rankings + media-type + cadence heatmap | ✓ |
| AN-6 stories → followers | follower line + story overlay | ⚠ correlational |
| AN-7 follower growth | weekly Followers | ✓ |
| BC-1 footprint | Headlines sums | ✓ |
| BC-2 engaged topics | Topic-grouped EQR | ✓ |
| FR-1 total reach/engagement | Content sums, de-duped, Type mix | ✓ |
| FR-2 audience growth | Followers + Newsletter Audience | ✓ |
| FR-3 topic/campaign aggregate | Topic-filtered sums | ✓ |

Every question has a home. The five ⚠ are cohort-based or correlational by deliberate decision (lifetime-only → cohorts; no per-post attribution → correlational overlays) and are labeled as such in the UI.

---

## 7. Carry-forward to the build

- **The Story journey is the thing to nail.** Per-platform timeline, group-level Site Clicks, per-post metrics on each card, the newsletter email leg. Mada's #1 frustration and a phone-critical view — build it first and in the most detail.
- **Give the generative surfaces room:** the Format hero (①), the aggregating filters (②), and the new Overview *Top topics & series* card are where the Managing Editor's "what to commission / what Series to start" decisions are read.
- **Build portably (A1):** data access in one adapter, metrics in pure functions, UI in plain React + Tailwind + Recharts — so the exit to Vercel stays cheap, and the SPA-style structure is what gives the persistent cross-view filter.
- **Visual-first, minimal (V1, V2):** photos/thumbnails, colourful story-telling charts, green/red benchmark cues, simple icons; few controls. Table/Gallery and per-chart metric toggles are design-phase trim candidates.
- **Platform palette (P1)** is locked dashboard-wide.
- **Articles get their due in Content + Stories**, not Platforms; Platforms gives article *depth* via the Website drill (incl. main vs mirror), not article browsing.
- **Compute split:** percentiles and the per-platform story breakdown are computed client-side within Type; totals come from Airtable rollups.
- **Honesty labels are design elements** — render EQR and Penetration as indices (not capped % bars), label correlation overlays and cohort cuts.
- **Mobile** later, via native Airtable interface pages for Overview + Stories.

---

*End of document.*
