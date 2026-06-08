# Mada Index — Extension CLAUDE.md

Working rules and orientation for any Claude Code session on this repo.
For full technical detail see **`docs/IMPLEMENTATION.md`**.

---

## What this repo is

An **Airtable Interface Extension** — a native React dashboard embedded directly
inside Airtable's Interface Designer. It renders Mada Masr's cross-platform
content analytics in one place: five views (Overview, Stories, Content,
Platforms, Team) plus a printable Reports page.

It is **not** a standalone web app and **not** an Airtable sidebar Block.
It uses `@airtable/blocks@interface-alpha` and renders natively (no iframe).

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | TypeScript · React 19 · inline styles (design tokens as CSS variables) |
| Charts | Recharts |
| Icons | `@phosphor-icons/react` (`weight="fill"` throughout) |
| Fonts | Newsreader + Noto Naskh Arabic (display) · IBM Plex Sans + IBM Plex Sans Arabic (UI) |
| SDK | `@airtable/blocks@interface-alpha` — import from `@airtable/blocks/interface/ui` |
| Bundler | Airtable block CLI (`block run` / `block release`) |
| Style | Tailwind v4 pre-built CSS (`frontend/mada.css`) — **do not regenerate** |

**Never add:** shadcn, Material UI, any component library, Airtable SDK UI components.

---

## Development commands

```bash
# Dev server — live reload inside Interface Designer "Develop" mode
cd ~/mada_index && block run
# Serves HTTPS at https://localhost:9002 with a self-signed cert.
# In Interface Designer: toggle "Develop" on, enter https://localhost:9002.

# Release to Airtable CDN (production)
cd ~/mada_index && echo "your change description" | block release
# The CLI has no -m flag — pipe the comment via echo.

# Type-check (no separate tsconfig — block CLI owns compilation)
# Look for errors in block run / block release output.

# Git
git -C ~/mada_index add <files> && git -C ~/mada_index commit -m "..."
```

---

## Architecture — the three non-negotiable boundaries

### 1. One SDK file
`src/data/SdkProvider.tsx` is the **only** file that imports from
`@airtable/blocks`. It runs all `useRecords()` hooks and calls
`buildSdkCache()` + `setCache()`. Nothing else touches the SDK.

### 2. One data-adapter module
`src/data/adapter.ts` owns all data access. It exports typed functions
(`getPeriodContent`, `getStoriesForPeriod`, etc.). Views call these;
they never reach into the SDK or the cache directly.

### 3. Pure lib functions
`src/lib/metrics.ts` and `src/lib/chartData.ts` are zero-dependency
(no React, no Airtable). They take typed objects and return derived data.

---

## Critical gotcha — field visibility

The interface-alpha SDK restricts `record.getCellValue(fieldName)` to
fields configured as **visible** in the Interface Designer's Fields panel
(⚙️ icon → Fields: N visible).

Calling `getCellValue` on a non-visible field **throws** — it does not
return null. Every `getCellValue` call in `adapter.ts` is wrapped in
try/catch for this reason.

**When data shows as 0 or missing**: open Interface Designer → ⚙️ Fields
→ find the relevant table → enable all fields. See `docs/IMPLEMENTATION.md`
for the full field checklist.

---

## File map (quick orientation)

```
frontend/
  index.tsx               Entry point — initializeBlock({ interface: () => <MadaIndex /> })
  mada.css                Pre-built Tailwind v4 — do not regenerate
  src/
    App.tsx               Nav tabs, period state, view routing
    index.css             CSS variables (design tokens) + print styles
    data/
      types.ts            All TypeScript interfaces
      adapter.ts          Cache builder + all public data accessors (~800 lines)
      sample.ts           Fallback sample data (used when SDK cache is null)
      SdkProvider.tsx     SDK hooks + field diagnostics + setCache()
    components/           Reusable UI (Button, Chip, KpiTile, PlatformBadge, …)
      charts/             Recharts wrappers (CadenceHeatmap, FormatPerformance, …)
    lib/
      metrics.ts          Pure metric functions + formatters
      chartData.ts        Pure data functions for Recharts components
      labels.ts           Human-readable label maps
      printReport.ts      Standalone HTML generator for PDF export
    views/                One file per tab (OverviewView, StoriesView, …)
      HeadlinesView.tsx   Reports + print button (calls printReport.ts)
```

---

## Airtable coordinates

| Resource | ID |
|---|---|
| Base "Mada Index" | `appr8MnuDG2NjwMQf` |
| Block ID | `blkc9G4qPWFhyCsoF` |
| Content (unified) | `tbl3e8lSE5xjb5itB` |
| WordPress Articles | `tblFRfZsMggiHMM49` |
| Stories | *(linked via Content table)* |
| Instagram Posts | `tbltR2zTFIHXmcwnj` · Stories: `tbl4n49HpN1gug1IM` |
| LinkedIn Posts | `tblD2un05DQTP68hA` · X Posts: `tblWcqtGqrWybdWqoi` |
| YouTube Videos | `tblrG95tupOZxDW4m` · MailChimp: `tblcpHtXiU0pLywRo` |
| Podcast Episodes | `tblJ3LcxlQg5HFBXJ` · Topics: `tbluHUm54HljOYtAE` |

---

## Phase status

| Phase | Description | Status |
|---|---|---|
| 0 | Scaffold, design tokens, app shell | ✅ done |
| 1 | Base components, sample data, metric functions | ✅ done |
| 2 | Stories view | ✅ done |
| 3 | Overview, Content, Platforms, Team, Reports views | ✅ done |
| 4 | Recharts components | ✅ done |
| 5 | States, polish, accessibility | ✅ done |
| 6 | Live data via Airtable REST API | *(superseded by Phase 7)* |
| 7 | Airtable Interface Extension — SDK-first, live data, production release | ✅ done |

**Current work:** backfilling historical data, iterative feedback on dashboard views.

---

## Working rules (apply in every session)

1. Explain each step in 1–2 plain sentences — what and why.
2. One phase / one concern at a time. Stop and wait for "go."
3. Minimal — only what the current change needs.
4. No secrets in code. No API tokens in source.
5. Git commit at the end of every meaningful change.
6. `block release` after every change that needs testing in production.
7. See `docs/IMPLEMENTATION.md` for the authoritative technical reference.
