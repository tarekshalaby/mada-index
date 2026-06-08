# Mada Index — Implementation Reference

Comprehensive technical reference for the Mada Index Airtable Interface Extension.
Written to be complete enough for any engineer or LLM to resume work cold.

**Last updated:** June 2026 · **Current release:** block `blkc9G4qPWFhyCsoF`

---

## Table of contents

1. [What was built and why](#1-what-was-built-and-why)
2. [Repository layout](#2-repository-layout)
3. [Architecture decisions](#3-architecture-decisions)
4. [Data flow end-to-end](#4-data-flow-end-to-end)
5. [The SDK layer](#5-the-sdk-layer)
6. [The adapter (data contract)](#6-the-adapter-data-contract)
7. [Data types](#7-data-types)
8. [Views](#8-views)
9. [Components](#9-components)
10. [Charts](#10-charts)
11. [Lib functions](#11-lib-functions)
12. [Print / PDF pipeline](#12-print--pdf-pipeline)
13. [Design system](#13-design-system)
14. [Airtable backend — tables and fields](#14-airtable-backend--tables-and-fields)
15. [Development workflow](#15-development-workflow)
16. [Known issues and TODO](#16-known-issues-and-todo)
17. [How to resume after a break](#17-how-to-resume-after-a-break)

---

## 1. What was built and why

**Mada Index** is a cross-platform content analytics dashboard for
[Mada Masr](https://www.madamasr.com), an independent Egyptian newsroom.
Their content is published across nine channels — website, Facebook, Instagram,
X (Twitter), LinkedIn, YouTube, a newsletter (Mailchimp), and a podcast (Spotify).
The challenge: no single tool showed all channels together, with editorial
de-duplication (a "story" covering one event may have ten platform variants).

The dashboard gives their editorial, social, business, and fundraising teams
one calm view with five tabs: Overview · Stories · Content · Platforms · Team.
Plus a printable Reports page for donor/grant reporting.

### Why an Airtable Interface Extension (not a standalone app)

Mada Masr already collects all metrics into an Airtable base — one table per
platform, one "Content" unified table linking them, a "Stories" table grouping
related pieces. Building outside Airtable would require duplicating that data
pipeline. An **Interface Extension** renders natively inside Airtable's
Interface Designer: it reads live data directly via SDK hooks, no REST API
calls, no token management, no hosting.

The extension uses `@airtable/blocks@interface-alpha` — the Interface Extension
SDK, distinct from the older sidebar/blocks SDK. Key difference: it renders
natively (not in an iframe), and the entry point is
`initializeBlock({ interface: () => <App /> })`.

---

## 2. Repository layout

```
mada_index/                  ← git root
├── CLAUDE.md                ← quick orientation for Claude Code sessions
├── block.json               ← block manifest: { "frontendEntry": "./frontend/index.tsx" }
├── package.json             ← dependencies (see §15)
├── eslint.config.mjs
├── .block/
│   └── remote.json          ← { "blockId": "blkc9G4qPWFhyCsoF", "baseId": "NONE" }
├── docs/
│   └── IMPLEMENTATION.md    ← this file
└── frontend/
    ├── index.tsx            ← extension entry point
    ├── mada.css             ← pre-built Tailwind v4 CSS (do not regenerate)
    └── src/
        ├── App.tsx          ← root component
        ├── extension.tsx    ← (unused legacy file)
        ├── index.css        ← design tokens + base + print styles
        ├── main.tsx         ← (unused legacy Vite entry)
        ├── data/
        │   ├── types.ts
        │   ├── adapter.ts
        │   ├── sample.ts
        │   └── SdkProvider.tsx
        ├── components/
        │   ├── Button.tsx
        │   ├── Card.tsx
        │   ├── Chip.tsx
        │   ├── DateRangeControl.tsx
        │   ├── EmptyState.tsx
        │   ├── ErrorState.tsx
        │   ├── FilterChip.tsx
        │   ├── FilterDropdown.tsx
        │   ├── HonestyLabel.tsx
        │   ├── KpiTile.tsx
        │   ├── PercentileBadge.tsx
        │   ├── PlatformBadge.tsx
        │   ├── Skeleton.tsx
        │   ├── Tabs.tsx
        │   ├── Tag.tsx
        │   ├── Toggle.tsx
        │   ├── Tooltip.tsx
        │   ├── index.ts
        │   └── charts/
        │       ├── CadenceHeatmap.tsx
        │       ├── FollowerGrowthChart.tsx
        │       ├── FormatPerformanceChart.tsx
        │       ├── VelocityChart.tsx
        │       └── WarmTooltip.tsx
        ├── lib/
        │   ├── chartData.ts
        │   ├── labels.ts
        │   ├── metrics.ts
        │   ├── metrics.test.ts
        │   └── printReport.ts
        └── views/
            ├── ComponentGallery.tsx
            ├── ContentDetail.tsx
            ├── ContentView.tsx
            ├── ContributorDetail.tsx
            ├── ContributorsView.tsx
            ├── HeadlinesView.tsx
            ├── OverviewView.tsx
            ├── PlatformsView.tsx
            ├── StoriesView.tsx
            └── StoryDetail.tsx
```

---

## 3. Architecture decisions

### 3.1 Three hard boundaries

These were set at project start and must not be broken:

| Boundary | Rule |
|---|---|
| **One SDK file** | `SdkProvider.tsx` is the only file that imports from `@airtable/blocks`. All `useRecords()` calls live here. |
| **One data module** | `adapter.ts` owns all data access. Views call its exported functions; they never reach into the cache or SDK. |
| **Pure lib functions** | `metrics.ts` and `chartData.ts` have zero side effects and no framework imports. Easy to unit-test, safe to call anywhere. |

### 3.2 Module-level cache

`adapter.ts` holds a module-level variable `let _sdkCache: Cache | null = null`.

`SdkProvider.tsx` calls `setCache(cache)` after rebuilding it from the SDK hooks.
Because this happens synchronously during render (before children paint), all
child views always see current data. No Context API needed — the module cache
acts as a simple shared singleton.

### 3.3 Sample-data fallback

Every public adapter function has the pattern:
```typescript
const all = _sdkCache?.content ?? SAMPLE_CONTENT
```
When `_sdkCache` is null (no SDK connection, or during initial load), the app
renders sample data transparently. This also means the Vite dev build
(`mada-index/`) still works without Airtable credentials.

### 3.4 Field visibility restriction

This is the single most important operational gotcha.

In the `interface-alpha` SDK, `record.getCellValue(fieldName)` **throws** — not
returns null — if the field is not listed in Interface Designer's "Fields: N visible"
configuration (⚙️ icon in the right panel). It does not gracefully degrade.

Every `getCellValue` call in `adapter.ts` is wrapped in try/catch. The helpers
`ss()`, `sn()`, `sl()`, `sa()`, `sla()` all swallow the exception and return a
safe empty value. The `pNum()` / `pPct()` inline closures also wrap in try/catch.

**Consequence:** if a field is not in the visible configuration, its value
silently becomes 0 / '' / []. The data appears to load (record count is correct)
but all metrics for that field show zero.

**Diagnosis:** `SdkProvider.tsx` reads `(table as any).fields` (an undocumented
SDK property) to enumerate accessible field names and logs a `console.info` with
`missingCritical`. It also shows a visible warning banner inside the dashboard
if critical Content fields are missing.

### 3.5 Period filtering

The global period is a `Period` string (e.g. `'may-26'`, `'q2-26'`) managed in
`App.tsx` state. It is passed as a prop to every view and down to `PeriodBar`.

`adapter.ts` converts it to a `{ start, end }` ISO date range via
`periodToRange()`. `getPeriodContent(period)` filters `_sdkCache.content` by
`publishedAt` falling in that range.

The default period is `'may-26'` (May 2026), hardcoded in `App.tsx useState`.
Change this when moving to a new month.

### 3.6 Story de-duplication

A single editorial story is published on multiple platforms — each gets a row in
the Content table, linked to the same Story row. The "Story" is the canonical
unit; raw content is the platform-level evidence.

Key functions:
- `getStoriesForPeriod(period)` — stories whose content falls in the period
- `getContentByStory(storyId)` — all platform posts for one story
- `getPeriodContent(period)` — all content rows (used for per-platform breakdowns)

The cadence heatmap's global view deduplicates by `storyId` so a story
published on 5 platforms counts once. The per-channel view filters by platform.

---

## 4. Data flow end-to-end

```
Airtable Base (13 tables)
        │
        │  useRecords() — one hook per table, unconditional, same order every render
        ▼
SdkProvider.tsx  (SdkProviderInner)
        │
        │  buildSdkCache(rawStories, rawContent, rawWp, rawContribs, rawFollowers,
        │                rawFb, rawIgPosts, rawIgStories, rawX, rawLi,
        │                rawYt, rawMc, rawPod)
        ▼
adapter.ts  →  _sdkCache: Cache
        │         .content[]
        │         .stories[]
        │         .contributors[]
        │         .followers[]
        │         .contributorMonthly[]
        │
        │  setCache(cache)  ← called synchronously during render
        │
        │  getPeriodContent(period)
        │  getStoriesForPeriod(period)
        │  getLatestFollowersByPlatform()
        │  getCurrentPeriodTotals(period)
        │  …etc (30+ exported functions)
        ▼
Views (OverviewView, StoriesView, ContentView, PlatformsView, ContributorsView, HeadlinesView)
        │
        │  chartData.ts functions (getCadenceData, getFollowerGrowthData, …)
        ▼
Chart components (CadenceHeatmap, FormatPerformanceChart, VelocityChart, FollowerGrowthChart)
        │
        ▼
Recharts (BarChart, LineChart, etc.)
```

---

## 5. The SDK layer

### `frontend/index.tsx`

```typescript
import { initializeBlock } from '@airtable/blocks/interface/ui'
initializeBlock({ interface: () => <MadaIndex /> })
```

The `{ interface: ... }` key (not `{ render: ... }` from the old SDK) is what
makes this an Interface Extension rather than a sidebar Block.

### `src/data/SdkProvider.tsx`

**Outer shell (`SdkDataProvider`):**
- Calls `useBase()`
- Checks that all 13 required tables exist by name
- If any are missing, renders an error list instead of the app
- If all present, renders `SdkProviderInner`

**Inner shell (`SdkProviderInner`):**
- Runs 13 `useRecords()` calls in fixed, unconditional order (hooks rule)
- Passes all records to `buildSdkCache()`
- Calls `setCache(cache)` synchronously during render
- Reads `(table as any).fields` to detect missing fields (undocumented SDK property)
- Logs `console.info('[MadaIndex]', {...})` with counts and field names
- Shows `⚠️` warning banners if critical Content fields are missing

**Why `useRecords()` hooks must be unconditional and same-order:**
React's rules of hooks. `SdkProviderInner` only mounts after the outer shell
confirms all tables exist, so there is no risk of a missing table at hook call
time — the outer shell handles that before inner mounts.

---

## 6. The adapter (data contract)

`src/data/adapter.ts` (~800 lines) is the heart of the system.

### Field helpers

| Helper | Input | Returns | Notes |
|---|---|---|---|
| `ss(r, f)` | record, field name | `string` | Handles string, Date, single-select object, null → '' |
| `sn(r, f)` | record, field name | `number` | null/missing → 0 |
| `sl(r, f)` | record, field name | `string[]` | Linked records → array of IDs |
| `sa(r, f)` | record, field name | `string \| undefined` | Attachment → first attachment URL |
| `sla(r, f)` | record, field name | `unknown[]` | Lookup → underlying array |

All helpers catch exceptions silently. A field not in the visible configuration
throws; the helpers return safe empty values.

### `buildSdkCache()`

This is the core transformation. It takes 13 arrays of raw SDK records and
returns a `Cache` object. Five build steps in order:

**Step 1 — Contributors** (`rawContribs → contribById Map`)
Reads `Full Name` (with `Name` primary field as fallback), `Slug`, `Bio`, `URL`,
`Photo`. Skips rows with no name.

**Step 2 — Story ↔ Content linkage** (`rawStories → contentToStoryId Map`)
Iterates Stories, reads the `Content` linked-record field, maps each content ID
to its parent story ID.

**Step 3 — WP Article by Content ID** (`rawWp → wpByContentId Map`)
Each WordPress Article links to its Content row(s). Maps content ID → WP record
for fast lookup in step 4.

**Step 4 — Content items** (the big one)
For each raw Content record:
- Derives `type` (article, facebook-post, ig-post, etc.) from the `Type` field
- Derives `platform` from type via `mapPlatform()`
- Looks up the linked WP Article (for articles only)
- Reads `Contributors` from the WP Article → maps to contributor IDs → `authorIds`
- Reads `WP Categories` → `section` (via `mapSection()`)
- Reads `WP Tags` → `topics[]` (comma-split)
- Reads `Post Type` → `format` (via `mapFormat()`)
- Reads platform-specific linked records (Facebook Post, IG Post, etc.)
- Assembles `metrics` object with all available fields, with fallbacks:
  - `weightedEngagement`: uses the formula field first, falls back to
    `Clicks×5 + Saves×4 + Comments×3 + Shares×2 + Reactions + Attention×0.5`
  - `interactions`: formula first, falls back to sum of components
  - `siteClicks`: tries `'Site Clicks'` (formula), then `'Site Clicks: Total'`,
    then `'Site Clicks (received)'`
  - All platform-native extras (FB reaction breakdown, YT retention, etc.) use
    `pNum()` / `pPct()` (try/catch wrappers)
- Filters out any record where `Published` field is empty string (date filter
  runs later)

**Step 5 — Stories**
Builds Story objects from `rawStories`. Each story:
- Resolves its member Content objects from `contentById`
- Skips if no members resolved (story has no accessible content)
- Picks the anchor (website/article content, or first member)
- Reads `Article Title` (lookup array) with `Name` primary field as fallback
- Reads `Images` (lookup of attachments) for thumbnail
- Aggregates topics from all members
- Reads rollup fields from the Story row (`Impressions`, `Weighted Engagement`,
  `Interactions`, `Site Clicks`, `Attention (total)`, `Platform count`, etc.)

**Step 6 — Followers**
Simple: reads `Platform`, `Snapshot Date`, `Follower Count` from each row.
Requires at least 2 rows per platform to show a growth chart.

**Step 7 — Contributor Monthly**
Computed from the content cache (not from a separate table). For each content
item with `authorIds`, aggregates articles, impressions, and WE by contributor
and month.

### Public data accessor functions

All functions read from `_sdkCache` with `?? SAMPLE_*` fallback:

| Function | Returns |
|---|---|
| `getPeriodContent(period)` | Content[] filtered to the period's date range |
| `getStoriesForPeriod(period)` | Story[] whose content falls in the period |
| `getContentByStory(storyId)` | Content[] for one story |
| `getStoryById(id)` | Story \| undefined |
| `getContributorById(id)` | Contributor \| undefined |
| `getContributorStats(id)` | ContributorStats (articles, impressions, WE, platforms, topStory) |
| `getAllContributorStats()` | All contributors with their stats, sorted by impressions |
| `getContributorMonthly(id)` | ContributorMonthly[] for trend charts |
| `getCurrentPeriodTotals(period)` | PeriodTotals (impressions, WE, attention, followers, platform map) |
| `getPreviousPeriodTotals(period)` | Same, for the preceding equivalent period |
| `getTopicSummaries(limit, period)` | TopicSummary[] ranked by WE — uses story.topics (from WP Tags) |
| `getLatestFollowersByPlatform()` | Platform → latest follower count |
| `getLatestFollowerTotal()` | Sum of latest follower counts across all platforms |
| `getFollowersHistory()` | FollowersSnapshot[] — all rows, for the growth chart |
| `isLiveData()` | boolean — true when SDK cache is populated |

---

## 7. Data types

Defined in `src/data/types.ts`. Key interfaces:

### `Content`
The atomic unit. One row in the Airtable Content table.
- `id`, `type`, `platform`, `language` (`'ar' | 'en'`)
- `publishedAt` — ISO date string (from the `Published` field)
- `title`, `thumbnailUrl`, `url`
- `storyId?` — link to parent Story (if grouped)
- `authorIds?` — contributor IDs (from WP Articles → Contributors link)
- `format?` — editorial format (breaking-news, investigation, explainer, etc.)
- `section?` — editorial section (politics, economy, culture, etc.)
- `topics?` — array of WP Tag strings
- `metrics: ContentMetrics` — all numeric signals

### `ContentMetrics`
~30 fields covering:
- Universal: `impressions`, `reactions`, `comments`, `shares`, `saves`, `clicks`,
  `weightedEngagement`, `interactions`, `engagementQualityRate`, `siteClicks`,
  `watchReadMinutes` (Attention), `attentionAvg`
- Article GA4: `sessions`, `uniqueVisitors`, `engagementRate`, `bounceRate`,
  `avgEngagementTimeSec`
- Facebook: `reactionLike/Love/Haha/Wow/Sorry/Anger`
- Instagram: `igReach`, `igProfileVisits`, `igPlays`
- YouTube: `avgViewDurationSec`, `avgViewPct`, `subscribersGained`,
  `retentionAt50/75/95`
- Podcast: `durationSec`, `medianCompletionSec`, `retentionAt25/100`
- Newsletter: `emailsSent`, `uniqueOpens`, `openRate`, `clickRate`, `unsubscribes`
- X: `xQuotes`
- LinkedIn: `liEngagementRate`

### `Story`
Grouped set of Content items covering one editorial event across platforms.
- `id`, `title`, `thumbnailUrl`
- `anchorContentId` — the primary/website version
- `memberIds[]` — all linked Content row IDs
- `publishedFirst`, `publishedLast` — ISO dates
- `format?`, `section?`, `topics?[]`
- `rollup: StoryRollup` — aggregated metrics from the Airtable rollup fields

### `StoryRollup`
- `impressions`, `weightedEngagement`, `interactions`, `siteClicks`
- `attentionTotalMinutes`
- `platformCount` — number of distinct platforms (from Airtable rollup)
- `memberCount` — count of linked Content rows (computed locally)
- `eqr` — engagement quality rate at story level

### `Contributor`
- `id`, `name`, `slug?`, `bio?`, `url?`, `photoUrl?`

### `FollowersSnapshot`
- `id`, `platform`, `snapshotDate` (ISO), `followerCount`
- One row per platform per date in the Followers table
- Requires ≥2 rows per platform for the growth chart

### `Period` (in `DateRangeControl.tsx`)
```typescript
type Period = '7d' | '30d' | '90d' |
              'may-26' | 'apr-26' | 'mar-26' |
              'q2-26' | 'q1-26' | 'h1-26' | 'year-26'
```
Adding a new month requires adding it to this type, to `PERIOD_LABELS` in
`HeadlinesView.tsx`, and to `periodToRange()` in `adapter.ts`.

---

## 8. Views

### `App.tsx`
Root component. Manages:
- `activeView` state — which tab is showing
- `period` state — global date filter (default: `'may-26'`)
- `pendingStoryId` — cross-view navigation (Overview → Stories deep-link)
- `initAdapter()` call on mount (no-op in the extension, which uses SDK)
- Loading screen (shown until `dataReady`)
- Top nav bar with five tabs + Reports button
- `PeriodBar` (full-width sub-header date filter)

### `OverviewView`
Summary dashboard. Shows:
- Five KPI tiles: Impressions, Weighted Engagement, Site Clicks, Total Followers, Attention
- Format performance chart (Recharts BarChart — WE per format per platform)
- Publishing velocity chart (Recharts LineChart — pieces/week)
- Top 5 stories by WE (ranked list with thumbnails)
- Top topics by WE (from story.topics / WP Tags)
- Platform follower snapshot

### `StoriesView` + `StoryDetail`
Stories list: ranked by WE for the period. Each story shows title, thumbnail,
platform journey timeline (which platforms it ran on, in order), and rollup KPIs.

StoryDetail: per-story drill-down. Shows platform journey with individual
platform cards, each showing that platform's metrics. Includes honesty labels
("story-level · de-duped") to be transparent about what's being counted.

### `ContentView` + `ContentDetail`
Full table of all Content items for the period. Sortable, filterable by platform,
format, language. Pagination. ContentDetail shows per-piece platform-native metrics.

### `PlatformsView`
Two sub-sections via an internal toggle:

**Audience tab:**
- Follower counts per platform (latest snapshot)
- Follower growth chart (Recharts LineChart) — requires multiple Follower rows
- Publishing cadence heatmap (global — deduped by storyId)
- Format performance chart

**Channels tab:**
- Platform selection bar (click any platform icon)
- Per-platform breakdown: post count, impressions, engagement, site clicks, avg per post
- Per-platform cadence heatmap (filtered to selected platform only)
- Per-post impressions trend (Recharts LineChart, weekly)
- Platform-native metrics table (e.g. reaction breakdown for Facebook, retention for YouTube)
- Paginated content list for the selected platform

### `ContributorsView` + `ContributorDetail`
Team page. Lists contributors who have published content in the period.
Data comes from `getAllContributorStats()` — contributors with linked WP Articles
that have Content in the period. ContributorDetail shows per-contributor article
list, monthly trend, top stories.

**Requires:** `Contributors` field in WordPress Articles must be visible in
Interface Designer. Without it, `authorIds` is empty on all Content and no
contributors appear.

### `HeadlinesView` (Reports)
Funder-ready, printable summary. Sections:
1. Reach & Engagement — 3 KPIs + impression mix bar
2. Top 5 stories (ranked by WE, with thumbnails)
3. Platform breakdown table
4. Content mix bar chart
5. Audience — total followers + per-platform
6. Campaign performance — topic filter → aggregate numbers for grant narrative

Print button → opens a clean standalone tab via `buildPrintHTML()` (see §12).
CSV export button → downloads a CSV of all period content.

---

## 9. Components

### `PlatformBadge`
Exports `PLATFORM_CONFIG` (Record<Platform, { label, color, Icon }>) and
`JOURNEY_PLATFORM_ORDER` (canonical platform sort order). Used everywhere that
needs platform colours or labels.

Platform colours (from design language doc):
- Website: `#2F7D63` (dark teal)
- Facebook: `#1877F2` (blue)
- Instagram: `#E1306C` (pink)
- X: `#000000` (black)
- LinkedIn: `#0077B5` (LinkedIn blue)
- YouTube: `#FF0000` (red)
- Newsletter: `#F9A825` (amber)
- Podcast: `#6D4C41` (brown)

### `Chip`
Delta percentage badge. `current / previous` → shows `+12%` (green) or
`−8%` (red) or `—`. Polarity is configurable (`good-up` / `good-down`).

### `HonestyLabel`
Small inline badge: "story-level · de-duped", "platform counts separately", etc.
Used to be transparent about what aggregation method produced the number.

### `KpiTile`
Full metric card with label, large value, optional trend chip, optional
percentile badge, tooltip.

### `PercentileBadge`
Shows a rank band (Top / Middle / Bottom) based on a value's position among
all values of the same metric. Computed via `computePercentileRank()`.

### `DateRangeControl` + `PeriodBar`
`DateRangeControl` is a dropdown with grouped period options. `PeriodBar` is
the full-width sticky sub-header in the main layout that wraps it.

### `FilterDropdown`
Generic single-select dropdown. Used in Reports for the topic/campaign filter.

### `Toggle`
Segmented button for mode switching (e.g. Publishing / Engagement in the
cadence heatmap, Audience / Channels in PlatformsView).

### `Tooltip` + `MetricTip`
Hover tooltip wrapping any element. `MetricTip` is a pre-formatted metric
name + description tooltip used on KPI labels.

---

## 10. Charts

All charts are Recharts components wrapped to match the design system.
Data is supplied by `lib/chartData.ts`, never fetched inside the component.

### `CadenceHeatmap`
Week × day-of-week grid. Colour: sequential teal ramp (TEAL_RAMP constant).
Props: `period?`, `platform?`.
- With `platform`: filters content to that platform (per-channel use)
- Without `platform`: deduplicates by storyId (global Audience use)

Toggle: Publishing (count) / Engagement (WE sum).

### `FormatPerformanceChart`
Recharts BarChart. X-axis: editorial format. Bars: WE per format per platform.
Optional language filter (AR / EN / both).

### `VelocityChart`
Recharts LineChart. X-axis: weeks. Y-axis: pieces published per week.
Shows publishing velocity trend for the period.

### `FollowerGrowthChart`
Recharts LineChart. One line per platform. X-axis: snapshot date.
**Requires at least 2 Follower rows per platform** — with only 1 row there is
nothing to connect and the chart renders empty. This is a data issue, not a bug.

---

## 11. Lib functions

### `metrics.ts`

Pure functions. No imports beyond TypeScript types.

| Function | Purpose |
|---|---|
| `computeWeightedEngagement(raw)` | `Clicks×5 + Saves×4 + Comments×3 + Shares×2 + Reactions + Attention×0.5` |
| `computeEQR(we, impressions)` | EQR = WE / Impressions × 100 |
| `computeInteractions(raw)` | Sum of Reactions + Comments + Shares + Saves + Clicks |
| `computePercentileRank(value, allValues)` | 0–100 rank among the distribution |
| `getPercentileBand(percentile)` | `'top' | 'middle' | 'bottom'` |
| `computeBenchmarkState(value, benchmarks)` | `'good' | 'bad' | 'neutral'` |
| `computeDeltaPct(current, previous)` | `((current - previous) / previous) × 100` |
| `platformForType(type)` | ContentType → Platform |
| `formatCompact(n)` | `1234567 → "1.2M"`, `55000 → "55.0K"` |
| `formatMinutes(totalMinutes)` | `562 → "562h"`, `90 → "1h 30m"` |
| `formatPct(n)` | `0.123 → "12.3%"` |
| `formatDelta(deltaPct)` | `12.3 → "+12.3%"`, null → "—" |

`WE_WEIGHTS` constant exports the weights for documentation/reference.

### `chartData.ts`

Pure functions. Imports from `adapter.ts` (read-only) and `types.ts`.

| Function | Returns |
|---|---|
| `getFormatPerformanceData(period, lang?)` | Data for FormatPerformanceChart |
| `getVelocityData(period)` | Week-by-week publishing counts |
| `getFollowerGrowthData()` | Date-series data for FollowerGrowthChart |
| `getCadenceData(mode, period?, platform?)` | Week × day grid for CadenceHeatmap |

### `labels.ts`

Maps and formatters for human-readable display:
- `FORMAT_LABELS`: Format → display string (e.g. `'investigation' → 'Investigation'`)
- `METRIC_INFO`: metric key → `{ name, description }` for Tooltip content
- `formatDateSpan(first, last)`: date range display (e.g. "1–15 May 2026")

---

## 12. Print / PDF pipeline

Clicking the print icon in Reports does **not** call `window.print()` on the
Airtable page (which would print all of Airtable's chrome). Instead:

1. Collects all computed report data from the component's local state
2. Calls `buildPrintHTML(data, generatedDate)` from `lib/printReport.ts`
3. Opens a new browser tab via `window.open('', '_blank')`
4. Writes the HTML into the new tab via `win.document.write(html)`

The new tab is a fully self-contained HTML document with:
- Embedded CSS (no external stylesheets except Google Fonts CDN for Newsreader)
- `@page { size: A4; margin: 22mm 20mm 20mm; }`
- `print-color-adjust: exact` so platform colours render in print
- A "Save as PDF" button (visible on screen, hidden in print)
- Sections: document header · Reach & Engagement · Top stories (with thumbnails)
  · Platform breakdown table · Content mix + Audience (two-column) · Campaign
  performance (only if a topic was selected before clicking print) · Footer

When extending the Reports view, **also update `printReport.ts`** to include
any new section — the screen view and print output are separate codebases.

---

## 13. Design system

### Tokens (`src/index.css`)

All design tokens are CSS variables declared in `@theme {}` (Tailwind v4 format).
Key tokens:

```css
/* Colour — neutrals */
--color-ink:         /* near-black body text */
--color-muted:       /* secondary text */
--color-faint:       /* tertiary text */
--color-fainter:     /* labels, captions */
--color-paper:       /* page background */
--color-raised:      /* card background */
--color-tile:        /* KPI tile background */
--color-border:      /* hairline */
--color-border-strong:

/* Colour — benchmark trio (meaning only, never identity) */
--color-good:        /* green */
--color-bad:         /* red */
--color-neutral:     /* amber */

/* Typography */
--font-display:      /* 'Newsreader', Georgia, serif */
--font-ui:           /* 'IBM Plex Sans', system-ui, sans-serif */
--text-display-xl:   /* 48px — hero KPI */
--text-display-l:    /* 32px — large KPI */
--text-title-page:   /* 24px — page heading */
--text-title-section:/* 18px — section heading */
--text-title-item:   /* 15px — card heading */
--text-title-row:    /* 13px — table row title */
--text-body:         /* 13px */
--text-label:        /* 12px — nav, button */
--text-caption:      /* 11px — meta, captions */

/* Spacing / radius */
--radius-card:       /* 8px */
--radius-btn:        /* 5px */
```

### Colour rules

Three roles — kept strictly apart:
- **Neutrals** — chrome, text, structure (CSS variables above)
- **Platform palette** — identity only (charts, badges, legends). Never used
  for meaning (good/bad/neutral)
- **Benchmark trio** — meaning only (good/bad/neutral). Never used for identity

### Typography

- **Newsreader** — display/serif font for numbers, headlines, story titles
- **IBM Plex Sans** — UI font for labels, body, captions
- Arabic fallbacks: Noto Naskh Arabic (display), IBM Plex Sans Arabic (UI)
- `dir="auto"` on any container that may show Arabic text

### CSS approach

No Tailwind utility classes in component JSX. All component styling uses
inline `style` props with CSS variable references. The `mada.css` file
(pre-built Tailwind v4) provides the `@theme {}` token injection, `@font-face`
declarations, and base reset — it is not used for utility classes.

**Do not regenerate `mada.css`** by running a Vite build. The font file paths
in it reference `/assets/...` which only exist in the original Vite build
output. Regeneration without the matching font files would break the reference.

---

## 14. Airtable backend — tables and fields

### Base ID: `appr8MnuDG2NjwMQf`

### Tables used

| Table | ID | Role |
|---|---|---|
| Content | `tbl3e8lSE5xjb5itB` | Unified content — one row per platform post |
| WordPress Articles | `tblFRfZsMggiHMM49` | Article-level GA4 data + taxonomy |
| Stories | *(linked via Content)* | Editorial grouping of cross-platform coverage |
| Contributors | *(linked via WP Articles)* | Author profiles |
| Followers | *(separate table)* | Snapshot of follower counts per platform per date |
| Facebook Posts | *(linked from Content)* | Facebook-native metrics |
| Instagram Posts | `tbltR2zTFIHXmcwnj` | IG post metrics |
| Instagram Stories | `tbl4n49HpN1gug1IM` | IG story metrics |
| X Posts | `tblWcqtGqrWybdWqoi` | X/Twitter metrics |
| LinkedIn Posts | `tblD2un05DQTP68hA` | LinkedIn metrics |
| YouTube Videos | `tblrG95tupOZxDW4m` | YouTube metrics |
| MailChimp Emails | `tblcpHtXiU0pLywRo` | Newsletter metrics |
| Podcast Episodes | `tblJ3LcxlQg5HFBXJ` | Podcast metrics |
| Topics | `tbluHUm54HljOYtAE` | Editorial topic taxonomy (currently empty) |

### Field visibility requirement

ALL fields read by the extension must be enabled in Interface Designer:
⚙️ (settings icon near top-right) → Fields → find each table → enable all fields.

**Critical fields per table** (minimum for each section to work):

**Content:** Published · Type · Language · Title · URL · Impressions ·
Reactions · Comments · Shares · Saves · Clicks · Video Views · Attention ·
Weighted Engagement · Interactions · Site Clicks · Engagement Quality Rate ·
Attention (avg) · Image · Facebook Post · Instagram Post · Instagram Story ·
X Post · LinkedIn Post · YouTube Video · Newsletter · Podcast Episode

**WordPress Articles:** Content (link) · Contributors (link) · Title ·
Thumbnail · WP Categories · WP Tags · Post Type · Sessions · Unique Visitors ·
Engagement Rate · Bounce Rate · Avg Engagement Time (sec)

**Contributors:** Full Name · Slug · Bio · URL · Photo

**Stories:** Content (link) · Article Title · Images · First Published ·
Last Published · Format · Impressions · Weighted Engagement · Interactions ·
Site Clicks · Attention (total) · Platform count · Engagement Quality Rate

**Followers:** Snapshot Date · Platform · Follower Count

**Facebook Posts:** Reaction: Like · Reaction: Love · Reaction: Haha ·
Reaction: Wow · Reaction: Sorry · Reaction: Anger

**Instagram Posts:** Views

**Instagram Stories:** Reach · Profile Visits

**X Posts:** Quote Tweets

**LinkedIn Posts:** Engagement Rate

**YouTube Videos:** Average View Duration (seconds) · Average View Percentage ·
Subscribers Gained · Duration (seconds) · Retention at 50% · Retention at 75% ·
Retention at 95%

**MailChimp Emails:** Emails Sent · Unique Opens · Open Rate · Click Rate ·
Unsubscribed

**Podcast Episodes:** Duration (seconds) · Median Completion (seconds) ·
Retention at 25% · Retention at 100%

### Topics

The `Topics` Airtable table is not currently used by the dashboard.
Dashboard topics come from the **WP Tags field** in WordPress Articles —
comma-separated strings split and stored on each Content/Story item.

---

## 15. Development workflow

### Prerequisites

- Node.js (any recent LTS)
- Airtable block CLI: `npm install -g @airtable/blocks-cli`
- Access to the Mada Index Airtable base
- The `.block/remote.json` file (block ID: `blkc9G4qPWFhyCsoF`)

### Day-to-day development

```bash
# 1. Navigate to the repo
cd ~/mada_index

# 2. Start local dev server
block run
# → serves https://localhost:9002 with self-signed cert

# 3. In Airtable Interface Designer:
#    - Open the Dashboard interface
#    - Click ⚙️ next to "Mada Index" block element
#    - Toggle "Develop locally" on
#    - Enter: https://localhost:9002

# 4. Make code changes — hot reload in the designer
# 5. When satisfied, release:
echo "describe what changed" | block release
```

### The self-signed certificate warning

`block run` creates an HTTPS server with a self-signed cert. Chrome shows
"Not Secure" warnings. First time: navigate directly to `https://localhost:9002`
and click "Advanced → Proceed anyway" to accept the cert. The Interface
Designer will then load it.

After `block release`, turn off "Develop locally" in the designer. The
"Not Secure" warning persists for the rest of that browser session (Chrome
remembers the cert exception). A fresh tab resolves it.

### Releasing to production

```bash
echo "your change description" | block release
```
The CLI has no `-m` flag — the comment must be piped via echo or heredoc.

After release, turn off "Develop locally" in Interface Designer. The interface
then loads the CDN version.

### Git workflow

```bash
# Stage specific files (never git add -A blindly)
git -C ~/mada_index add frontend/src/...
git -C ~/mada_index commit -m "clear description"
```

Commit at the end of every meaningful change set. The repo has 3 commits as
of Phase 7 completion. Push to a private GitHub repository for team access.

### Adding a new period

1. Add the key to `Period` type in `DateRangeControl.tsx`
2. Add it to `PERIOD_LABELS` in `HeadlinesView.tsx`
3. Add it to `periodToRange()` in `adapter.ts`
4. Change the default `useState<Period>('may-26')` in `App.tsx` if needed

### Adding a new view

1. Create `src/views/NewView.tsx`
2. Add nav item to `NAV_ITEMS` in `App.tsx`
3. Add the view to the `View` union type in `App.tsx`
4. Add the `{activeView === 'new' && <NewView period={period} />}` render

---

## 16. Known issues and TODO

### Data

- **Follower growth chart empty**: The Followers table has only one row per
  platform (current snapshot). The chart requires ≥2 rows per platform to
  draw a trend line. Solution: add historical monthly snapshots.
- **Topics section empty**: Will populate once WP Tags are consistently filled
  in WordPress Articles, or the Topics table is linked to Content.
- **Platform tables incomplete**: Facebook Posts, Instagram, etc. may have
  zero metrics if their respective fields are not in the Interface Designer's
  visible configuration.

### UI / UX

- **Fonts 404 in extension**: The `mada.css` file references font files at
  `/assets/...` absolute paths that don't exist on Airtable's CDN. The fonts
  fall back to Georgia / system-ui. Could be fixed by hosting fonts on a CDN
  and updating the @font-face URLs, or by loading Newsreader via Google Fonts
  in the main index.tsx.
- **Print PDF and screen are separate codebases**: `HeadlinesView.tsx` and
  `printReport.ts` must be kept in sync manually when adding new report sections.
- **Default period**: hardcoded to `'may-26'` in `App.tsx`. Should be updated
  monthly, or made dynamic (current month auto-detection).

### Architecture

- **Diagnostic banners**: `SdkProvider.tsx` still shows `⚠️` banners if
  critical fields are missing. Once all fields are configured, these banners
  will never appear. Consider removing the banner code once the base is fully
  configured.
- **`extension.tsx` and `main.tsx`**: Legacy files not used by the block build.
  Safe to delete if the repo is cleaned up.

---

## 17. How to resume after a break

### If you are Claude Code opening this project

1. Read `CLAUDE.md` in this repo root — it has the working rules and quick commands.
2. Read this file for deep context on any specific area.
3. Run `git -C ~/mada_index log --oneline` to see what was last committed.
4. The current live version is the last `block release` commit.

### If you are a human developer

1. Clone the repo (or navigate to `~/mada_index/`)
2. `npm install` inside `~/mada_index/`
3. `block run` to start dev server
4. In Airtable Interface Designer, enable "Develop locally" → `https://localhost:9002`
5. Read this document and `CLAUDE.md` for context
6. Make changes, `block release`, commit

### If you are a different LLM

1. Read `CLAUDE.md` (project rules, commands, architecture overview)
2. Read `src/data/adapter.ts` — this is the system's core
3. Read `src/data/SdkProvider.tsx` — this is where live data enters
4. Read `src/data/types.ts` — these are the data contracts everything else uses
5. The views are in `src/views/` — each is largely self-contained
6. Before making changes: check that the change respects the three
   architecture boundaries in §3.1 of this document
7. After changes: `echo "description" | block release` to deploy

### Sharing this codebase

- Push to a private GitHub repository: `git remote add origin <url> && git push -u origin main`
- The `CLAUDE.md` and `docs/IMPLEMENTATION.md` travel with the repo
- New Claude Code sessions automatically read `CLAUDE.md` when the project
  directory is opened
- For other LLMs: share the repo URL and point to this file as the starting reference
