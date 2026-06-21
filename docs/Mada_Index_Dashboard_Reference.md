# Mada Index — Dashboard Technical Reference

**Version 1.1 · June 2026**
**Codebase:** `~/mada_index/`
**Block ID:** `blkc9G4qPWFhyCsoF` · **Base:** `appr8MnuDG2NjwMQf`

How the dashboard frontend is built, how it reads data, what every file does, and how to change things safely. Written for a developer or AI assistant resuming work cold.

---

## 1. What this is

An **Airtable Custom Extension** (interface-alpha SDK) — a React SPA that renders natively inside Airtable's Interface Designer, not in an iframe. It reads live data directly from the Airtable base via `@airtable/blocks` SDK hooks. No backend, no REST API calls in production.

The extension entry point is `initializeBlock({ interface: () => <MadaIndex /> })` — the `{ interface: ... }` key (not `{ render: ... }`) is what makes this an Interface Extension rather than the older sidebar Block SDK.

**Five views:** Overview · Stories · Content · Platforms · Team (internally `ContributorsView`).
**One secondary action:** Reports (generates a printable HTML report in a new tab).

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | `^5.0.0` |
| UI | React | `^19.1.0` |
| SDK | `@airtable/blocks@interface-alpha` | Interface Extension SDK — distinct from the older sidebar Blocks SDK |
| Charts | Recharts | `^3.8.1` |
| Icons | `@phosphor-icons/react` (`weight="fill"` throughout) | `^2.1.10` |
| Fonts | Newsreader (display) · Noto Naskh Arabic (Arabic display) · IBM Plex Sans + IBM Plex Sans Arabic (UI) | `@fontsource` |
| Styling | CSS custom properties (design tokens) + Tailwind v4 (pre-built as `mada.css`) | |
| Build / deploy | Airtable block CLI (`block run` / `block release`) | No Vite in production build |

**Never add:** shadcn, Material UI, any Airtable SDK UI components, any component library.

---

## 3. Repository layout

```
mada_index/                        ← git root (github.com/tarekshalaby/mada-index)
├── CLAUDE.md                      ← quick orientation for Claude Code sessions
├── block.json                     ← { "frontendEntry": "./frontend/index.tsx" }
├── .block/
│   └── remote.json                ← { "blockId": "blkc9G4qPWFhyCsoF", "baseId": "NONE" }
├── package.json                   ← root dependencies (no Vite — webpack via block CLI)
├── eslint.config.mjs
├── docs/
│   ├── IMPLEMENTATION.md          ← deep technical reference (the original dev doc)
│   ├── Mada_Index_Dashboard_Reference.md  ← this file
│   ├── Mada_Index_Pipeline_Reference.md
│   ├── Mada_Index_Decision_Log.md
│   ├── Mada_Index_User_Guide.md
│   ├── Mada_Index_Runbook.md
│   ├── Mada_Index_Docs_Index.md
│   ├── Mada_Index_Design_Language.md
│   └── blueprints/                ← Make.com scenario blueprint JSONs
└── frontend/
    ├── index.tsx                  ← extension entry: initializeBlock({ interface: ... })
    ├── mada.css                   ← pre-built Tailwind v4 CSS (do NOT regenerate)
    └── src/
        ├── App.tsx                ← root component: nav, period state, view routing
        ├── index.css              ← design tokens (CSS vars) + print styles
        ├── data/
        │   ├── types.ts           ← all TypeScript interfaces (Content, Story, Contributor, …)
        │   ├── adapter.ts         ← the data contract: buildSdkCache() + all public functions
        │   ├── SdkProvider.tsx    ← the ONLY file that imports @airtable/blocks
        │   └── sample.ts          ← static fallback data
        ├── components/
        │   ├── Button.tsx
        │   ├── Card.tsx
        │   ├── Chip.tsx
        │   ├── DateRangeControl.tsx    ← Period selector + PeriodBar
        │   ├── EmptyState.tsx
        │   ├── ErrorState.tsx
        │   ├── FilterChip.tsx
        │   ├── FilterDropdown.tsx
        │   ├── HonestyLabel.tsx
        │   ├── KpiTile.tsx
        │   ├── PercentileBadge.tsx
        │   ├── PlatformBadge.tsx       ← PLATFORM_CONFIG, JOURNEY_PLATFORM_ORDER
        │   ├── Skeleton.tsx
        │   ├── Tabs.tsx
        │   ├── Tag.tsx
        │   ├── Toggle.tsx
        │   ├── Tooltip.tsx
        │   ├── index.ts                ← re-exports all components
        │   └── charts/
        │       ├── CadenceHeatmap.tsx
        │       ├── FollowerGrowthChart.tsx
        │       ├── FormatPerformanceChart.tsx
        │       ├── VelocityChart.tsx
        │       └── WarmTooltip.tsx
        ├── lib/
        │   ├── metrics.ts          ← pure metric functions + formatters
        │   ├── chartData.ts        ← pure chart data builders (Recharts input)
        │   ├── labels.ts           ← human-readable label maps + formatters
        │   ├── printReport.ts      ← builds standalone HTML for the print/PDF tab
        │   └── metrics.test.ts     ← Vitest unit tests
        └── views/
            ├── OverviewView.tsx
            ├── StoriesView.tsx
            ├── StoryDetail.tsx
            ├── ContentView.tsx
            ├── ContentDetail.tsx
            ├── PlatformsView.tsx
            ├── ContributorsView.tsx    ← "Team" view
            ├── ContributorDetail.tsx
            ├── HeadlinesView.tsx       ← "Reports" secondary action
            └── ComponentGallery.tsx    ← dev utility (not user-facing)
```

**Note on `mada.css`:** This is a pre-built Tailwind v4 output that includes font `@font-face` declarations referencing `/assets/...` paths. Do not regenerate it by running a Vite build — the paths won't resolve on Airtable's CDN and the fonts would break. Leave it as-is.

---

## 4. Architecture — the three hard boundaries

These must not be broken. Breaking them makes the codebase harder to maintain and potentially incompatible with a future Vercel migration.

**Boundary 1 — One SDK file.** `src/data/SdkProvider.tsx` is the *only* file that imports from `@airtable/blocks`. All `useRecords()` and `useBase()` calls live here. Nothing else touches the SDK.

**Boundary 2 — One data module.** `src/data/adapter.ts` is the only file other code imports for data. Views call its exported functions (`getPeriodContent`, `getStories`, etc.); they never reach into the cache or the SDK directly.

**Boundary 3 — Pure lib functions.** `src/lib/metrics.ts` and `src/lib/chartData.ts` have zero side effects and import nothing from React or Airtable. They take typed inputs and return derived values. Unit-testable independently of the app.

---

## 5. Data flow end-to-end

```
Airtable base
  │  (13 tables — useRecords() per table)
  ▼
SdkProvider.tsx  (SdkProviderInner)
  │  buildSdkCache(rawStories, rawContent, rawWp, rawContribs, rawFollowers,
  │                rawFb, rawIgPosts, rawIgStories, rawX, rawLi,
  │                rawYt, rawMc, rawPod)
  │  setCache(cache)  → writes to module-level _sdkCache in adapter.ts
  ▼
adapter.ts  (module-level _sdkCache)
  │  exported functions: getPeriodContent(), getStoriesForPeriod(), getAllContributorStats(), …
  ▼
Views / chartData.ts
  │  call adapter functions, compute display-ready values
  ▼
Recharts / inline JSX
```

**The cache is populated synchronously during React render** in `SdkProviderInner` — `setCache()` is called inside the render body, before children paint. Child views always see current data without needing Context or a loading state inside the views.

**Sample data fallback:** every exported adapter function falls back to `SAMPLE_*` constants from `sample.ts` when `_sdkCache` is null. This keeps the app renderable during development without Airtable credentials (run `block run`, connect to Airtable, but the standalone Vite dev build can render on sample data too).

---

## 6. The adapter (`src/data/adapter.ts`)

The adapter (~800 lines) is the heart of the system. It contains the cache builder, all field helpers, and every public data function.

### 6.1 Field helper functions

| Function | Purpose |
|---|---|
| `ss(r, field)` | Text / URL / formula / single-select → trimmed string |
| `sn(r, field)` | Number field → number (0 when absent) |
| `sl(r, field)` | Linked-record field → `string[]` of linked record IDs |
| `sa(r, field)` | Attachment field → first attachment URL or undefined |
| `sla(r, field)` | Lookup field → raw `unknown[]` array |

All five helpers call `r.getCellValue(field)` internally wrapped in try/catch. In the interface-alpha SDK, `getCellValue` throws (not returns null) if the field is not visible in Interface Designer — hence all calls go through these wrappers.

### 6.2 `buildSdkCache()`

Takes 13 arrays of raw SDK records, returns a `Cache` object. Five build steps in order:

1. **Contributors** — builds `contribById` map. Reads `Full Name`, `Slug`, `Bio`, `URL`, `Photo`.
2. **Story ↔ Content linkage** — iterates Stories, maps each linked Content ID → its parent Story ID.
3. **WP Article by Content ID** — maps Content row IDs to their WordPress Article records.
4. **Content items** (the big step) — for each raw Content record: derives `type`, `platform`, `language`; joins WP Article fields (contributors, categories, tags, format); reads platform-specific linked records (Facebook Post, IG Post, etc.); assembles the `ContentMetrics` object with fallbacks (`weightedEngagement` from formula field first, computed from components if absent).
5. **Stories** — builds Story objects from rawStories, resolving member Content via the reverse-link map from step 2. Reads rollup fields (`Impressions`, `Weighted Engagement`, `Interactions`, `Site Clicks`, `Attention (total)`, `Platform count`, etc.) from the Story record directly.
6. **Followers** — reads `Platform`, `Snapshot Date`, `Follower Count` from each row.
7. **Contributor Monthly** — computed from the content cache (no separate table). Groups Content by author × month for the Team view trend charts.

### 6.3 Public data accessor functions

All functions read from `_sdkCache` with `?? SAMPLE_*` fallback:

| Function | Returns |
|---|---|
| `getPeriodContent(period)` | `Content[]` filtered to the period's date range |
| `getStoriesForPeriod(period)` | `Story[]` whose content falls in the period |
| `getContentByStory(storyId)` | `Content[]` for one story |
| `getStoryById(id)` | `Story \| undefined` |
| `getContributorById(id)` | `Contributor \| undefined` |
| `getContributorStats(id)` | `ContributorStats` (articles, impressions, WE, platforms, topStory) |
| `getAllContributorStats()` | All contributors with stats, sorted by impressions |
| `getContributorMonthly(id)` | `ContributorMonthly[]` for trend charts |
| `getCurrentPeriodTotals(period)` | `PeriodTotals` (impressions, WE, attention, followers, platform map) |
| `getPreviousPeriodTotals(period)` | Same, for the preceding equivalent period |
| `getTopicSummaries(limit, period)` | `TopicSummary[]` ranked by WE — uses story.topics (from WP Tags) |
| `getLatestFollowersByPlatform()` | `Platform → latest follower count` |
| `getLatestFollowerTotal()` | Sum of latest follower counts across all platforms |
| `getFollowersHistory()` | `FollowersSnapshot[]` — all rows, for the growth chart |
| `isLiveData()` | `boolean` — true when SDK cache is populated |

---

## 7. SdkProvider.tsx — how live data enters

`SdkDataProvider` (the exported component) wraps the app in `frontend/index.tsx`. It:

1. Calls `useBase()` to get the base.
2. Checks that all 13 required tables are present. If any are missing, renders a diagnostic screen listing the missing tables — **this is the first thing to check if the dashboard shows a blank screen with a list of tables**.
3. Mounts `SdkProviderInner` only when all tables are confirmed.

`SdkProviderInner`:
1. Calls `useRecords()` for all 13 tables unconditionally (same order every render — hooks rules).
2. Calls `buildSdkCache()` via `useMemo` when any record array changes.
3. Calls `setCache(cache)` synchronously during render.
4. Reads `(table as any).fields` (undocumented SDK property) to enumerate accessible field names.
5. Logs `console.info('[MadaIndex]', { ... })` with record counts and missing field names.
6. Shows `⚠️` warning banners inside the dashboard if critical Content fields are missing.

**Required tables** (all 13 must be accessible):
Stories · Content · WordPress Articles · Contributors · Followers · Facebook Posts · Instagram Posts · Instagram Stories · X Posts · LinkedIn Posts · YouTube Videos · MailChimp Emails · Podcast Episodes

---

## 8. Field visibility — the most common source of silent data errors

**The `interface-alpha` SDK restricts `getCellValue()` to fields that are configured as visible in Interface Designer.** Calling it on a hidden field throws an exception. The `ss/sn/sl/sa/sla` helpers catch this and return a safe empty value (0, '', [], undefined). The result: the data appears to load (record count is correct) but all metrics for that field show zero.

**How to diagnose:** if a metric shows 0 across all records when it shouldn't, check whether the field is enabled in Interface Designer → ⚙️ (settings) → Fields → find the relevant table → toggle the field on. Also check `SdkProvider.tsx`'s `console.info` output in the browser console — it lists `missingCritical` field names.

**Required fields by table** (enable all fields to be safe):

**Content:** Published · Type · Language · Title · URL · Impressions · Reactions · Comments · Shares · Saves · Clicks · Video Views · Attention · Weighted Engagement · Interactions · Site Clicks · Engagement Quality Rate · Attention (avg) · Image · Facebook Post · Instagram Post · Instagram Story · X Post · LinkedIn Post · YouTube Video · Newsletter · Podcast Episode · Story

**WordPress Articles:** Content (link) · Contributors (link) · Title · Thumbnail · WP Categories · WP Tags · Post Type · Sessions · Unique Visitors · Engagement Rate · Bounce Rate · Avg Engagement Time (sec)

**Contributors:** Full Name · Slug · Bio · URL · Photo

**Stories:** Content (link) · Article Title · Images · First Published · Last Published · Format · Impressions · Weighted Engagement · Interactions · Site Clicks · Attention (total) · Platform count · Engagement Quality Rate

**Followers:** Snapshot Date · Platform · Follower Count

**Facebook Posts:** Reaction: Like · Reaction: Love · Reaction: Haha · Reaction: Wow · Reaction: Sorry · Reaction: Anger

**Instagram Posts:** Views

**Instagram Stories:** Reach · Profile Visits

**X Posts:** Quote Tweets

**LinkedIn Posts:** Engagement Rate

**YouTube Videos:** Average View Duration (seconds) · Average View Percentage · Subscribers Gained · Duration (seconds) · Retention at 50% · Retention at 75% · Retention at 95%

**MailChimp Emails:** Emails Sent · Unique Opens · Open Rate · Click Rate · Unsubscribed

**Podcast Episodes:** Duration (seconds) · Median Completion (seconds) · Retention at 25% · Retention at 100%

---

## 9. Data types — `src/data/types.ts`

The canonical type definitions. Everything in the codebase flows through these.

**`ContentType`** — 9 values: `article` · `facebook-post` · `ig-post` · `ig-story` · `x-post` · `linkedin-post` · `youtube-video` · `newsletter` · `podcast-episode`. Maps to Airtable Content.Type field values.

**`Platform`** — 8 values: `website` · `facebook` · `instagram` · `x` · `youtube` · `linkedin` · `newsletter` · `podcast`. Both `ig-post` and `ig-story` map to `instagram`. The internal type for MailChimp is `newsletter` — only the display label says "MailChimp".

**`Language`** — `'ar'` · `'en'` · `'both'` · `'na'`. Derived in `adapter.ts` from the Content.Language field: starts with 'A' → `'ar'`, else `'en'`.

**`ContentMetrics`** — the unified metric bag on every `Content` item. Key fields:
- `impressions`, `reactions`, `comments`, `shares`, `saves`, `clicks`, `videoViews`, `watchReadMinutes` — raw
- `weightedEngagement`, `engagementQualityRate`, `interactions`, `attentionAvg` — read from Airtable formula fields (with client-side computation as fallback)
- `siteClicks` — resolves `'Site Clicks'` formula first, then `'Site Clicks: Total'`, then `'Site Clicks (received)'`
- GA4 extras (`sessions`, `uniqueVisitors`, `engagementRate`, `bounceRate`, `avgEngagementTimeSec`) — articles only
- Platform extras (`reactionLike`, `avgViewDurationSec`, `retentionAt50`, etc.) — where the source table has them

**`Story`** — groups Content members. Has a `rollup` sub-object with story-level aggregates (impressions, weightedEngagement, etc.) that come directly from Airtable rollup fields on the Stories table.

**`FollowersSnapshot`** — a snapshot for one platform: `platform`, `snapshotDate`, `followerCount`.

**`Period`** (defined in `DateRangeControl.tsx`):
```typescript
type Period = '7d' | '30d' | '90d' |
              'may-26' | 'apr-26' | 'mar-26' |
              'q1-26' | 'q2-26' | 'h1-26' | 'year-26'
```

---

## 10. Period filtering — `periodToRange()` and `getPeriodContent()`

`App.tsx` manages a `Period` state string (default `'30d'` — last 30 days from today). It is passed as a prop to every view. The adapter converts it to a date range via `periodToRange()`.

**Supported period keys:**

| Key | Range |
|---|---|
| `'may-26'` | May 2026 |
| `'apr-26'` | April 2026 |
| `'mar-26'` | March 2026 |
| `'q1-26'` | Jan–Mar 2026 |
| `'q2-26'` | Apr–Jun 2026 |
| `'h1-26'` | Jan–Jun 2026 |
| `'year-26'` | Full year 2026 |
| `'7d'` · `'30d'` · `'90d'` | Rolling — anchored to latest `publishedAt` in the cache |

**Adding a new period:** add the key to `Period` type in `DateRangeControl.tsx`, add it to `PERIOD_LABELS` in `HeadlinesView.tsx`, add it to `periodToRange()` in `adapter.ts`. Rolling periods (`7d`, `30d`, `90d`) always anchor to today and need no changes to `App.tsx`; calendar periods need their date range added to `periodToRange()`.

---

## 11. Views

### Overview (`OverviewView.tsx`)
Props: `period?`, `onSelectStory?`, `onSelectPlatform?`.

Five sections: KPI tiles (Impressions, Weighted Engagement, Site Clicks, Total Audience, Attention) with delta chips vs. previous period · Top Stories list (click → navigates to Stories view) · Top Topics card (ranked by WE, neutral ink bars) · Format Performance chart · Publishing Velocity chart.

### Stories (`StoriesView.tsx`)
Props: `period`, `initialStoryId` (for deep-link navigation from Overview), `onBack`.

A paginated list of stories filtered to the period, sortable by Date / Engagement / Impressions / Site Clicks. Filters: Format, Section, Language. Clicking a row opens `StoryDetail` inline. `StoryDetail` shows the platform journey (unique platforms in canonical order), story-level metrics, member content tiles, topics, and contributors.

### Content (`ContentView.tsx`)
Props: `period`, `onSelectStory?`.

A sortable, filterable table of all content rows in the period. Columns: thumbnail · type badge · title · Impressions · Engagement (WE) · EQR · Site Clicks · Exposure percentile · Quality percentile. Percentile badges compute within-type ranks in real time via `computePercentileRank()`. Clicking a row opens `ContentDetail`.

### Platforms (`PlatformsView.tsx`)
Props: `period`.

Three sub-tabs managed by `SubTab` state (`'performance'` | `'audience'` | `'publishing'`):

- **Performance** (default) — horizontal ranked bars for all platforms by a switchable metric (Impressions / Engagement / Quality / Site Clicks). Language filter (All / Arabic / English). Aggregates computed by `usePlatformAggregates()` hook. Clicking a platform row opens that platform's deep-dive with native metrics.
- **Audience** — Follower Growth line chart (`FollowerGrowthChart`) + latest follower tiles per platform.
- **Publishing** — Cadence Heatmap (`CadenceHeatmap`) showing week × day-of-week publishing density or engagement weight; switchable mode (publishing count / engagement WE). Plus per-platform post lists scrollable inline.

### Team (`ContributorsView.tsx`)
Props: `period`.

Team output trend (AreaChart) · Top-10 ranked bars · Performance scatter (ScatterChart — articles published vs. weighted EQR, dots coloured by editorial section). IQR-based outlier exclusion keeps extreme-output contributors (e.g. the editorial "Mada Masr" account) out of the scatter while keeping them in ranked lists and cards. Clicking a contributor card opens `ContributorDetail`.

### Reports (`HeadlinesView.tsx`)
Props: `period`, `onSelectStory?`.

A print-optimised view with a "Generate PDF" button that calls `buildPrintHTML()` from `lib/printReport.ts` and opens the result in a new browser tab (not `window.print()` — that would print all of Airtable's chrome). The new tab is a fully self-contained HTML document. Print styles in `index.css` (`@media print`) also support browser-level printing.

**Important:** `HeadlinesView.tsx` (screen) and `lib/printReport.ts` (print tab) are separate implementations of the same report. Adding a new section to the view requires manually updating `printReport.ts` too.

---

## 12. Components

**`PlatformBadge`** — platform icon + optional label. `PLATFORM_CONFIG` maps each `Platform` to its colour, icon, and label. The display label for `newsletter` is "MailChimp" (the internal Platform type remains `newsletter`). `JOURNEY_PLATFORM_ORDER` defines the canonical dissemination order used in story journey displays.

**`KpiTile`** — large metric display: value (formatted), label, optional delta chip (benchmarkState + deltaPct), optional tooltip.

**`Card`** — white (`--color-raised`) rounded container.

**`Chip`** — delta percentage badge. `current / previous` → `+12%` (green) or `-8%` (red) or `—`. Polarity configurable (`good-up` / `good-down`).

**`Tag`** — small pill for topics, sections, formats.

**`FilterChip`** / **`FilterDropdown`** — filter controls.

**`Tabs`** — horizontal tab strip for sub-views.

**`Toggle`** — segmented button for display options (e.g. Publishing / Engagement in the cadence heatmap).

**`PercentileBadge`** — coloured band indicator (`top` / `middle` / `bottom`). Used in Content view Exposure and Quality columns.

**`HonestyLabel`** — a small explanatory note attached to a metric that clarifies its scope or limitations (e.g. "story-level · de-duped").

**`Skeleton`** — shimmer placeholder for loading states.

**`EmptyState`** / **`ErrorState`** — empty and error state screens.

**`Tooltip`** / **`MetricTip`** — hover tooltip. `MetricTip` is a pre-built tooltip body for metric definitions.

**`DateRangeControl`** / **`PeriodBar`** — `DateRangeControl` is a dropdown with grouped period options. `PeriodBar` is the full-width sticky sub-header in the main layout.

---

## 13. Charts

All charts are Recharts wrappers in `src/components/charts/`. All data preparation is in `src/lib/chartData.ts` (pure functions — no React).

**`FormatPerformanceChart`** — grouped bar chart, Format × Platform, average metric per piece. Switchable metric (WE / Impressions / Site Clicks) and language filter. Data: `getFormatPerformanceData()`.

**`VelocityChart`** — line chart, weekly publishing counts. Data: `getVelocityData()`.

**`FollowerGrowthChart`** — multi-line `LineChart`, one line per platform, weekly snapshots. Requires ≥2 rows per platform to draw a trend line. Data: `getFollowerGrowthData()`.

**`CadenceHeatmap`** — custom SVG grid (week × day-of-week). Each cell is a coloured square on the teal sequential ramp. Toggle: publishing count or WE sum. Data: `getCadenceData()`. Renders as pure HTML/SVG, not a Recharts component.

**`WarmTooltip`** — shared Recharts `<Tooltip content={...}>` component with warm-paper styling. Used inside the Recharts chart components.

---

## 14. Lib functions

### `src/lib/metrics.ts`

Pure functions. No imports beyond TypeScript types.

| Function | Purpose |
|---|---|
| `WE_WEIGHTS` | Weight constants: `{ clicks: 5, saves: 4, comments: 3, shares: 2, reactions: 1, watchReadMin: 0.5 }` |
| `computeWeightedEngagement(raw)` | Applies the WE formula |
| `computeEQR(we, impressions)` | `(we / impressions) × 100`. Can exceed 100 |
| `computeInteractions(raw)` | `reactions + comments + shares + saves + clicks` |
| `computePercentileRank(value, allValues)` | Client-side within-type percentile (% of peers this beats) |
| `getPercentileBand(percentile)` | Returns `'top'` (≥75) / `'middle'` / `'bottom'` (≤25) |
| `computeBenchmarkState(current, previous, polarity)` | Returns `'good'` / `'bad'` / `'neutral'`. Dead-band: <1% change → neutral |
| `computeDeltaPct(current, previous)` | Returns `null` when previous is 0 |
| `formatCompact(n)` | `1.2K` / `3.4M` display formatting |
| `formatMinutes(totalMinutes)` | Minutes → `"12 min"` / `"1.4h"` |
| `formatPct(n, decimals?)` | Appends `%` |
| `formatDelta(deltaPct)` | `"+12%"` / `"-5%"` / `"—"` when null |

### `src/lib/chartData.ts`

Pure functions that return typed data arrays ready for Recharts. Imports from `adapter` (read-only). All four chart data builders: `getFormatPerformanceData()`, `getVelocityData()`, `getCadenceData()`, `getFollowerGrowthData()`.

### `src/lib/labels.ts`

Human-readable label maps (`FORMAT_LABELS`, `SECTION_LABELS`, `CONTENT_TYPE_LABELS`, `METRIC_INFO`), plus date formatting helpers (`formatDateShort`, `formatDateSpan`). `METRIC_INFO` drives tooltip content for every metric.

### `src/lib/printReport.ts`

Generates a self-contained HTML document string for the Reports print tab. Called by `HeadlinesView.tsx` when the print button is clicked. The output is written to a new browser tab via `window.open` + `document.write`. Includes embedded CSS with `@page` print settings and Google Fonts CDN for Newsreader. **Must be kept in sync with `HeadlinesView.tsx`** — they are separate implementations of the same report.

---

## 15. Design system — `src/index.css`

All design tokens are CSS custom properties defined in `@theme {}`. Three colour roles, strictly separated:

- **Neutrals** — `--color-paper`, `--color-raised`, `--color-tile`, `--color-border`, `--color-border-strong`, `--color-ink`, `--color-muted`, `--color-faint`, `--color-fainter` — chrome, text, structure.
- **Platform** — `--color-platform-facebook` etc. — identity only (charts, badges, legends). Never used for meaning.
- **Benchmark** — `--color-good-*`, `--color-bad-*`, `--color-neutral-*` — meaning only (delta chips, percentile bands). Never used for identity.
- **Teal ramp** — `--color-teal-1` through `--color-teal-6` — sequential scale for heatmap and velocity charts.

Typography: `--font-display` (Newsreader + Noto Naskh Arabic serif) for display headings; `--font-ui` (IBM Plex Sans + IBM Plex Sans Arabic sans-serif) for all UI text.

**CSS approach:** no Tailwind utility classes in component JSX. All component styling uses inline `style` props with CSS variable references. The `mada.css` file (pre-built Tailwind v4) provides the `@theme {}` token injection, `@font-face` declarations, and base reset — it is imported in `frontend/index.tsx`, not used for utility classes in components.

---

## 16. Development workflow

### Prerequisites

- Node.js (LTS)
- Airtable block CLI: `npm install -g @airtable/blocks-cli`
- Access to the Mada Index Airtable base (base ID: `appr8MnuDG2NjwMQf`)
- The `.block/remote.json` file (block ID: `blkc9G4qPWFhyCsoF`) — already in the repo

### Day-to-day development

```bash
# 1. Navigate to the repo
cd ~/mada_index

# 2. Start local dev server
block run
# → serves https://localhost:9002 with a self-signed cert

# 3. In Airtable Interface Designer:
#    - Open the Dashboard interface
#    - Click ⚙️ next to the Mada Index block element
#    - Toggle "Develop locally" on
#    - Enter: https://localhost:9002
#    - Accept the self-signed cert warning in Chrome
#      (navigate to https://localhost:9002 directly → Advanced → Proceed anyway)

# 4. Make code changes — hot reload in the designer

# 5. When satisfied, release to production:
echo "describe what changed" | block release
```

**Note:** The `block release` CLI takes the release comment via stdin (pipe), not a `-m` flag.

### After releasing

Turn off "Develop locally" in Interface Designer. The interface then loads the CDN version. The "Not Secure" warning may persist for the rest of that browser session (Chrome remembers the cert exception) — a fresh tab resolves it.

### Git workflow

```bash
git -C ~/mada_index add frontend/src/views/SomeView.tsx  # stage specific files
git -C ~/mada_index commit -m "clear description"
git -C ~/mada_index push
```

Commit at the end of every meaningful change set. Never use `git add -A` blindly — it could accidentally stage the `node_modules` or other large directories.

### Build commands summary

| Command | What it does |
|---|---|
| `block run` | Local dev server on `https://localhost:9002` |
| `echo "…" \| block release` | Deploys to Airtable CDN (production) |
| `npm run lint` | ESLint (from `~/mada_index/` root) |
| `vitest run` | Unit tests (run from `~/mada_index/frontend/` or root) |

---

## 17. Known issues

**Fonts in extension.** `mada.css` references font files at `/assets/...` absolute paths that don't resolve on Airtable's CDN after release. The dashboard falls back to Georgia / system-ui. This is cosmetic, not functional. Fix: host font files on an external CDN and update `@font-face` URLs, or load display fonts via Google Fonts `<link>` in `frontend/index.tsx`.

**Default period.** `App.tsx` initialises `period` state as `'30d'` (last 30 days from today). Rolling periods anchor to the current date at page load — no monthly update needed.

**`printReport.ts` out-of-sync risk.** `HeadlinesView.tsx` and `src/lib/printReport.ts` are separate implementations of the same report. Adding a new section to the view requires manually updating `printReport.ts` too.

**Follower growth chart requires ≥2 rows per platform.** With only one snapshot row per platform, the chart has nothing to connect and renders empty. Add historical monthly snapshots to the Followers table to populate it.

**Topics section.** The Overview "Top Topics" card reads from `story.topics`, which is derived from WP Tags (comma-split strings). It will be empty until WP Tags are consistently populated in the WordPress Articles table, or the Topics table is properly linked to Content.

**`extension.tsx` and `main.tsx` legacy files.** These are unused files from early development. Safe to delete during a future cleanup pass.

---

## 18. How to resume after a break

If you are an AI assistant (Claude Code or otherwise):

1. Read `CLAUDE.md` in the repo root — quick commands and working rules.
2. Read `docs/IMPLEMENTATION.md` for the authoritative deep-dive on the codebase.
3. Read this file for the structured handover reference.
4. Run `git -C ~/mada_index log --oneline` to see what was last committed.
5. Read `src/data/adapter.ts` — this is the system's core.
6. Read `src/data/SdkProvider.tsx` — this is where live data enters.
7. Read `src/data/types.ts` — these are the data contracts.
8. Before any change: confirm it respects the three boundaries in §4.
9. After any change: `echo "description" | block release`, then commit and push.

If you are a human developer:
1. `cd ~/mada_index && npm install`
2. `block run`
3. Enable "Develop locally" in Interface Designer → `https://localhost:9002`
4. Make changes
5. `echo "description" | block release`
6. Disable "Develop locally"

---

*End of Dashboard Technical Reference (v1.1).*
