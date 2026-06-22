# Mada Index — Decision Log

**Version 1.2 · Last updated June 2026**

An append-only record of the decisions behind Mada Index — *why* things are built the way they are, and the alternatives considered and rejected. Its job is to stop anyone (a future developer, a future you, or an AI assistant) from "fixing" something that was deliberate.

Read it when a choice looks odd, before changing a metric or a data rule, or when scoping a new phase. The technical references say *how* the system works; this says *why*.

---

## A · How this log works

### 1. Purpose & how to use it

- **Append-only.** Add new decisions; don't rewrite history. If a decision is reversed, add a *new* entry that supersedes the old one, and mark the old one `Superseded`.
- **Stable IDs.** Each decision has an ID (DL-01, DL-02 …) so the other docs can link straight to it.
- **Grouped by domain**, so "what did we decide about X" is a direct lookup.
- This log owns the *why*; the implementation detail lives in the Pipeline and Dashboard references, which point back here.

### 2. Entry format

Every entry follows the same shape:

- **Decision** — what was chosen.
- **Why** — the reasoning.
- **Rejected** — alternatives considered, and why they lost (where relevant).
- **Caveats / lives in** — consequences to know, and where it's implemented.
- **Status** — Active / Deferred / Superseded, with date.

---

## B · The decisions

### 3 · Metric & measurement

#### DL-01 · Weighted Engagement formula & weights
- **Decision:** Weighted Engagement (WE) = Clicks×5 + Saves×4 + Comments×3 + Shares×2 + Reactions×1 + Watch/Read-minutes×0.5.
- **Why:** one comparable "how did this do" score that weights more intentional actions higher; time-spent is included so depth of attention counts, not just taps.
- **Rejected:** dropping the time term (proposed, then overruled — time is a real engagement signal); raw unweighted interaction counts (loses the "a click means more than a like" distinction — that count is kept separately as *Interactions*).
- **Caveats / lives in:** the weights are an editorial judgement — revisit if priorities change. `metrics.ts` (`computeWeightedEngagement`) and the Content/Story formula fields; surfaced on-screen in Platforms → Engagement mix.
- **Status:** Active · 2026-05.

#### DL-02 · Rates are ratios of summed components, never averages
- **Decision:** every rate metric (Engagement Quality Rate, Attention avg, Penetration) is computed by dividing the *summed* numerator by the *summed* denominator — e.g. EQR = ΣWE ÷ ΣImpressions × 100. Never an `AVERAGE` rollup of per-piece rates.
- **Why:** averaging per-piece rates lets a tiny post swing the aggregate; the summed ratio reflects true overall quality.
- **Rejected:** `AVERAGE` rollups over per-piece rates.
- **Caveats / lives in:** formula fields on Content/Stories; `metrics.ts`.
- **Status:** Active · 2026-05.

#### DL-03 · "Impressions" over "Reach"
- **Decision:** use **Impressions** as the headline exposure term, not "Reach."
- **Why:** "reach" implies *unique people*, which the platforms don't report consistently; "impressions" is the honest label for times-shown.
- **Caveats / lives in:** labels throughout the dashboard.
- **Status:** Active · 2026-05.

#### DL-04 · Penetration Rate denominators (frozen at publish, per channel)
- **Decision:** Penetration = Impressions ÷ Potential Audience × 100, where **Potential Audience is frozen at publish time** and sourced per channel:
  - Social five (Facebook / Instagram / Instagram Story / X / LinkedIn / YouTube) → follower (or subscriber) count at publish week.
  - Articles → all-time **top-10 average** article pageviews **per language** (from GA4; Arabic and English ceilings computed separately).
  - Newsletter → Emails Sent (so penetration = opens ÷ sent = open rate).
  - **Podcast → none** — no Penetration Rate is computed.
- **Why:** freezing the denominator at publish week keeps penetration comparable across the whole archive — followers grow, so using today's count would unfairly penalise an old post against a base it never had. The per-language article ceiling reflects demonstrated reach. Penetration can exceed 100% — read it as an index, not a capped percentage. **Podcast followers are tracked as a general reference (shown in Platforms → Audience) but deliberately excluded from penetration** — Spotify listens come from well beyond followers, so the follower count isn't an accurate or applicable denominator.
- **Rejected:** today's follower count as the denominator (distorts the archive); a single global article peak (replaced by the per-language top-10 average).
- **Caveats / lives in:** no historical follower snapshots exist, so posts published before the first snapshot fall back to a near-current denominator (accepted drift). `Content.Potential Audience` (Make-written, once, at creation) + the `Penetration Rate` formula.
- **Status:** Active · 2026-06.

#### DL-05 · Benchmark colour = good-vs-bad, polarity per metric
- **Decision:** the green / amber / red system encodes good / neutral / bad *against a benchmark*, with the "good" direction assigned per metric — colour is decoupled from up/down.
- **Why:** prevents misreading — a rising unsubscribe rate shouldn't look "green" just because the number went up. Platform colours stay separate (identity only, never meaning).
- **Caveats / lives in:** `metrics.ts` (`computeBenchmarkState`); the `Chip` polarity prop.
- **Status:** Active · 2026-05.

#### DL-06 · Native clicks kept only where they are link clicks
- **Decision:** retain a native "Clicks" metric for Instagram Stories, LinkedIn, and Newsletter only; Facebook's native click metric was removed.
- **Why:** Facebook's figure counts generic interaction clicks, not link clicks — not comparable to the others, and misleading inside WE.
- **Caveats / lives in:** Make mappings; the FB column was emptied in Content.
- **Status:** Active · 2026-05.

### 4 · Data-integrity & de-duplication

#### DL-07 · Site Clicks anchored to the destination, not the origin
- **Decision:** Site Clicks are counted at the **destination article** (Inbound Links), never at the origin post (Outbound).
- **Why:** when several posts link to the same article, counting at the origin double-counts those clicks; counting at the destination single-counts them structurally.
- **Caveats / lives in:** structural — Inbound Links on the article record.
- **Status:** Active · 2026-05.

#### DL-08 · Story-level de-duplication and the Story Count = 1 gate
- **Decision:** a story published on N platforms counts **once** at the story level (the cadence heatmap and story rollups dedupe by `storyId`); and every engagement sum is gated by `Story Count = 1`.
- **Why:** the gate means a future item belonging to several stories (e.g. a newsletter covering multiple stories) can't inflate all of them at once. Both guards are automatic — no manual upkeep.
- **Caveats / lives in:** dedup in the adapter/charts; the `Story Count = 1` formula gate.
- **Status:** Active · 2026-05.

#### DL-09 · Defensible aggregates for funder reporting
- **Decision:** the Reports totals must be de-duplicated across the Content↔Stories layers and carry no invented attribution.
- **Why:** grant and donor numbers have to survive external scrutiny; a story on five platforms must count once, and nothing is attributed without basis.
- **Caveats / lives in:** Reports view, resting on DL-07 and DL-08.
- **Status:** Active · 2026-05.

#### DL-10 · Lifetime-only values; no per-content time-series
- **Decision:** v1 stores **lifetime (current) values only**, not per-content history; comparisons use publish cohorts. A per-content history store (Supabase) was killed for v1.
- **Why:** cost and complexity, and the platform sources are lifetime-only anyway.
- **Caveats / lives in:** **there is no per-piece "over time" trend** — any "Impressions Over Time"-style chart would be fabricated and must not be shown. The weekly Followers table is retained, but only for follower-growth trending and for the penetration denominators (DL-04).
- **Status:** Active · 2026-05.

### 5 · Editorial & classification

#### DL-11 · Classification is canonical on Stories
- **Decision:** Section, Geography, Series, Topics and Format live on the **Stories** table as canonical; Content members read them via lookup through the Content→Story link.
- **Why:** one editorial truth per story, no per-post drift.
- **Caveats / lives in:** Stories table fields; Content lookup fields.
- **Status:** Active · 2026-05.

#### DL-12 · AR/EN translation pairs share one Story
- **Decision:** an Arabic piece and its English translation join a **single Story record** (create-or-join).
- **Why:** they're one piece of journalism — grouping them avoids double-counting and shows the unified cross-language journey.
- **Caveats / lives in:** the deterministic WP-translations path links new pairs; existing pairs are retro-linked. (Contributor-level AR/EN unification is separate and deferred — DL-25.)
- **Status:** Active · 2026-06.

#### DL-13 · Topics come from WP Tags (for now)
- **Decision:** dashboard topics are derived from the WordPress **Tags** field (comma-split), not the Topics table.
- **Why:** WP Tags are populated today; the Topics taxonomy isn't signed off yet.
- **Caveats / lives in:** the adapter splits WP Tags into topics. Consequence: the Topic × Platform heatmap and the AI-classification topic work are gated on taxonomy sign-off (DL-29).
- **Status:** Active · 2026-05.

### 6 · Integration & platform

> Recipes and exact endpoints live in the **Pipeline & Integrations Reference**. This section records the *decision*, not the configuration.

#### DL-14 · Forced tool_choice for AI topic classification
- **Decision:** the Make → Anthropic API classification call pins the model to a tool (forced `tool_choice`); the result is read at `body.content[1].input`.
- **Why:** guarantees structured output and skips JSON parsing entirely (no inline `parseJSON`).
- **Caveats / lives in:** the AI classification scenario; the legacy "return JSON" instruction was removed from the system prompt once forced tool use was in.
- **Status:** Active · 2026-06.

#### DL-15 · Two scenario copies accepted (Make has no route convergence)
- **Decision:** the 8-module classification block is cloned after *each* of the two Create Story modules rather than converging the routes.
- **Why:** Make can't merge two routes back into one; duplicating the block is the pragmatic cost of that limitation.
- **Caveats / lives in:** keep the two copies in sync when editing. Make.
- **Status:** Active · 2026-06.

#### DL-16 · Spotify token chain self-refreshes
- **Decision:** the Spotify scenarios refresh their own OAuth token via a module chain rather than relying on a manual token.
- **Why:** Spotify access tokens expire quickly; self-refresh avoids routine manual re-auth.
- **Caveats / lives in:** the followers scenario (token modules); detailed in the Pipeline reference.
- **Status:** Active · 2026-05.

#### DL-17 · LinkedIn followers via the unversioned /v2/networkSizes endpoint
- **Decision:** pull LinkedIn organisation followers from `/v2/networkSizes/urn:li:organization:…` (unversioned, raw colons in the URN, `edgeType=COMPANY_FOLLOWED_BY_MEMBER`), reading `firstDegreeSize`.
- **Why:** the follower-statistics endpoint returns only demographic facets, not a usable total; and versioned `/rest/` path-URN calls are structurally unreachable through the available Make module.
- **Caveats / lives in:** the LinkedIn worker; full recipe and the versioning trap are in the Pipeline reference.
- **Status:** Active · 2026-05.

#### DL-18 · Facebook reactions figure
- **Decision:** `Content.Reactions` uses the reaction total the Facebook API provides, as-is.
- **Why:** reshare-*exclusive* reaction counts can't be obtained from the Facebook API — the conclusion reached after comparing the edge total (`reactions.summary`) and the insights total (`post_reactions_by_type_total`), which differ (the gap can be large). With no way to cleanly isolate the post's own reactions, the available total is used without adjustment.
- **Caveats / lives in:** the FB worker; the exact field/figure is verified in the Pipeline reference. Related: per-reaction-type breakdown capture (DL-27).
- **Status:** Active (settled) · 2026-06.

### 7 · Architecture & portability

#### DL-19 · Airtable Interface Extension over a standalone app
- **Decision:** build the dashboard as a native Airtable Interface Extension, not a separately-hosted web app.
- **Why:** all the data already lives in Airtable; an extension reads it live via the SDK with no REST calls, no token management, and no hosting to run.
- **Caveats / lives in:** the whole frontend; see Dashboard Reference §1.
- **Status:** Active · 2026-05.

#### DL-20 · Portability boundary: one SDK file / one adapter / pure functions / plain UI
- **Decision:** isolate every Airtable SDK call in one provider and one data adapter; keep all metric and transform logic in pure functions; build the UI in plain React + Tailwind + Recharts with no component library.
- **Why:** clean seams. If the dashboard ever moves off Airtable (e.g. to Vercel), only the data layer has to be swapped — the metrics and UI come along untouched.
- **Caveats / lives in:** `SdkProvider` / `adapter` / `metrics` / `chartData` boundaries; Dashboard Reference §4. (Never add shadcn or any other component library.)
- **Status:** Active · 2026-05.

#### DL-21 · Percentiles computed client-side at render
- **Decision:** percentile and rank-band values are computed in the dashboard at render time, not stored as Airtable fields.
- **Why:** Airtable formulas can't rank a value across records.
- **Caveats / lives in:** `metrics.ts` (`computePercentileRank`, `getPercentileBand`).
- **Status:** Active · 2026-05.

#### DL-22 · Extend existing Make scenarios over building new ones
- **Decision:** prefer extending an established scenario to standing up a new one.
- **Why:** consistency, a smaller maintenance surface, and reuse of patterns already proven against each platform's quirks.
- **Caveats / lives in:** a working practice rather than a single artifact.
- **Status:** Active · 2026-05.

### 8 · Scope & deferral

> What was intentionally left out of v1, and *why* — so it isn't mistaken for an oversight.

#### DL-23 · Contributor attribution is article-only (accepted limitation)
- **Decision:** contributor credit exists only for WordPress articles; social, newsletter, video and podcast content is not attributed to individual people.
- **Why:** those platforms don't carry reliable per-person attribution data.
- **Caveats:** the Team view therefore measures *article output specifically*, not a person's full contribution. Stated plainly in the User Guide.
- **Status:** Active (accepted) · 2026-06.

#### DL-24 · Per-contributor ranking retained in the Team view
- **Decision:** keep the per-contributor view with ranking, despite the usual concerns about leaderboard dynamics.
- **Why:** owner's call — the editorial value was judged to outweigh the concern. (Quality is shown as a weighted rate so a single small piece can't swing it; ranking bars use neutral ink.)
- **Caveats:** read alongside DL-23 (article-only). Not to be re-litigated.
- **Status:** Active · 2026-06.

#### DL-25 · AR/EN contributor identity unification — deferred
- **Decision:** the ~28+ Arabic↔English contributor pairs that exist as separate Contributor records are left un-unified for v1.
- **Why:** not blocking; byline-level grouping is enough for now. Partly an operational ask (retro-link the pairs) rather than a pure build.
- **Status:** Deferred (Wishlist) · 2026-06.

#### DL-26 · Newsletter backfill — parked
- **Decision:** the ~250 newsletters older than the scenario's 14-day window are not backfilled yet.
- **Why:** awaiting go-ahead; not blocking v1.
- **Status:** Deferred · 2026-06.

#### DL-27 · Per-reaction-type Meta capture — deferred
- **Decision:** capturing the reaction-type breakdown from the Meta API is deferred.
- **Why:** a data-side enhancement, not blocking. Tied to DL-18.
- **Status:** Deferred (Wishlist) · 2026-06.

#### DL-28 · YouTube description links → Links integration — deferred
- **Decision:** wiring YouTube description links into Links Analytics is deferred.
- **Why:** wishlist; not blocking. Tracked in the Project Tracker.
- **Status:** Deferred (Wishlist) · 2026-06.

#### DL-29 · Topic × Platform heatmap — gated on taxonomy sign-off
- **Decision:** the Topic × Platform heatmap is not built until Mada signs off a Topics taxonomy.
- **Why:** it needs a stable, agreed taxonomy to be meaningful (see DL-13).
- **Status:** Deferred (blocked on sign-off) · 2026-06.

### 9 · Labelling & display

#### DL-30 · Newsletter platform is labelled "MailChimp" everywhere in the dashboard
- **Decision:** the internal `Platform` type for the newsletter channel remains `'newsletter'` in code and Airtable field values, but the dashboard displays it as **"MailChimp"** in all UI labels — platform badges, filter chips, chart legends, the Platforms view, and the User Guide glossary.
- **Why:** "MailChimp" is what the Mada team calls it and what maps to their mental model. The internal type is `'newsletter'` to keep code stable (renaming it would break adapter logic and Airtable formula fields), but the label the team sees should match the tool they use.
- **Caveats / lives in:** `PLATFORM_CONFIG` in `PlatformBadge.tsx` (display label); `labels.ts` (`CONTENT_TYPE_LABELS`, `PLATFORM_LABELS`). If the newsletter provider ever changes, update the display label only — the internal type `'newsletter'` should not change.
- **Status:** Active · 2026-06.

### 10 · Link tracking

> Decisions about the Links table, Bitly click refresh, MailChimp click attribution, and Caption Links ingestion.

#### DL-31 · Dedicated Bitly click-refresh scenario, separate from link discovery
- **Decision:** Bitly click counts are refreshed by a dedicated **Bitly Links Analytics** scenario (C14) that iterates over existing Links rows. They are not refreshed inside the Links Analytics discovery scenario (C13).
- **Why:** Links Analytics is post-driven — once a post gets an Outbound Link it exits the discovery filter permanently. That means click counts freeze at first touch. The only way to un-freeze them is a separate, links-driven scenario that repeatedly re-fetches referrers. Mixing click refresh into discovery would require post-driven looping over already-resolved links, which is wasteful and architecturally incorrect.
- **Rejected:** refreshing clicks inside C13 (adds per-post Make credit consumption to a scenario optimised for set-once writes); a scheduled Airtable automation (insufficient access to the Bitly API without Make as a bridge).
- **Caveats:** MailChimp click refresh *stays* in C13 because MailChimp's click API is per-campaign — one call returns all of a campaign's links — so campaign-windowing is the correct granularity. t.co and other mirror links resolved via the All-Links route are not tracked separately; their site-click attribution comes through GA4 sessions. Known limitation: Bitly's referrer window is bounded (~141 days); Total Clicks for very old links reflects the window, not all-time.
- **Status:** Active · 2026-06.

#### DL-32 · Content.Caption Links field, dual-type Discovery filter, and X expanded_url mapping
- **Decision:** three coordinated changes — (1) add a `Caption Links` multilineText field (`fldWVde2oQXfJX0gb`) to the Content table to store fully-resolved destination URLs from a post's caption; (2) update the Links Analytics discovery filter to admit both Bitly links *and* year-path mirror URLs (the `FIND("/" & YEAR(TODAY()) & "/", ...)` clauses); (3) map `Caption Links` in the X Posts worker from `entities.urls[].expanded_url` on both Create and Update steps.
- **Why:** X (Twitter) posts use t.co URL shortener and also embed the expanded URL in the tweet's entity metadata. By writing the expanded URL to `Caption Links`, the Links Analytics filter can pick up the mirror URL directly (e.g. `madamasr.com/2026/...`) without any bit.ly involved — matching articles published in the current or previous year. Without this, X post-to-article attribution was entirely absent. The dual-type filter handles both the X (mirror) and FB/LinkedIn (bit.ly) cases at the same entry point.
- **Rejected:** resolving t.co URLs at query time inside Make (requires additional HTTP calls per post, expensive); a separate discovery branch just for mirror URLs (more complex; duplicates the resolution and linking logic).
- **Caveats / lives in:** `Content` table (`fldWVde2oQXfJX0gb`, multilineText); X Posts worker (Create Content #18, Update Content #20); Links Analytics `Search Articles with Links` filter formula.
- **Status:** Active · 2026-06.

#### DL-33 · MailChimp recency window reduced from 150 days to 7 days
- **Decision:** the `Search for Emails` step in Links Analytics now fetches MailChimp campaigns sent within the last **7 days**, not 150.
- **Why:** MailChimp email click counts saturate within ~48 hours of a send and are effectively frozen by ~7 days. Running a 150-day window was consuming ~2,460 Make operations per run (6× scenario budget) while refreshing counts that haven't moved. A 7-day window reduces this to ~381 ops/run and covers the only period where the numbers actually change. Credits freed benefit the Bitly Analytics runs.
- **Rejected:** keeping 150 days (wasteful; the marginal data quality gain after day 7 is nil); 30-day window (still over-fetches frozen data with no benefit).
- **Caveats:** older campaigns' click counts in the dashboard are now frozen at their last-updated value (captured within the 7-day window around the send date). This is accurate — email click attribution doesn't meaningfully grow after ~7 days. Documented in Runbook §6.
- **Status:** Active · 2026-06.

#### DL-34 · Links Discovery dispatch changed to Daily-only
- **Decision:** the Links Analytics Sync Settings rows were reduced to a single **Daily** dispatch (Max Items 20). The Weekly (Max 50) and Monthly (Max 100) rows were removed.
- **Why:** Links Analytics is post-driven and set-once — a post drops out of the discovery filter permanently as soon as it gets any Outbound Link. There is no reason to re-process the same window with a larger batch; the Weekly and Monthly rows only consumed credits without surfacing new work. Daily at Max 20 covers ~7 newly-linked posts/day with headroom. (Click refresh is now handled by the separate Bitly Analytics scenario with its own tiered cadence — see DL-31.)
- **Rejected:** keeping tiered rows "for safety" (adds zero value once the post-driven nature is understood); merging Links Analytics and Bitly Analytics into a single scenario (different trigger logic, different cadence needs).
- **Caveats / lives in:** Sync Settings table — confirm only one active "Links Discovery" row remains.
- **Status:** Active · 2026-06.

---

*End of Decision Log (v1.2).*
