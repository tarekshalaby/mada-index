# Mada Index — Design Language

*The single styling source of truth for the Mada Index dashboard.*
*Build target: one Airtable Interface Extension — plain React + Tailwind + Recharts, desktop-first.*
*Status: locked in design session. Anchored by the hi-fi Stories mockup.*

---

## 0. Thesis

**Their data, given back to them, told like a story.** The spine is editorial/print — serif display type on warm paper, type-led, calm — carrying a visual layer of photography and bold, colourful charts. The chrome stays quiet so photos and data carry the colour. The look is *editorial, not corporate*, and is **fully independent of Mada's own logo and brand colours**.

Two governing principles run through everything:

- **V1 — Visual-first.** Lean on photos/thumbnails, colourful charts that carry the story, and benchmark cues that read green/red (good/bad) at a glance. Simple, minimalist icons.
- **V2 — Minimal controls.** Pages stay calm. Scope filters earn their place; no piles of display toggles.

---

## 1. Surface

- **Light only** for v1. A warm "night edition" dark mode is deferred as a later token-swap (build portably so it stays cheap).
- **One canonical surface — warm paper.** Warm neutrals throughout; never cool grey.

| Token | Hex | Use |
|---|---|---|
| Page / paper | `#FAF6EE` | The canvas behind everything |
| Raised / cards | `#FFFDF7` | Cards, panels, inputs, overlays |
| Tile fill | `#F3EEE3` | KPI/quiet tiles, table header, group header, skeletons |
| Hairline border | `#E9E0CF` | Default separation (card edges, row dividers) |
| Stronger border | `#D6CABA` | Emphasis, selected edge, secondary-button border |
| Text — ink | `#241F18` | Primary text, headings, active state, interface accent |
| Text — muted | `#6B6253` | Secondary text |
| Text — faint | `#8E826B` | Tertiary / labels / captions |
| Text — fainter | `#A99C84` | Axis numbers, disabled |

---

## 2. Colour system

**Three colour roles, kept strictly apart.** This separation is the backbone of the whole palette — never let one role borrow another's hue.

1. **Neutrals** (warm ink + greys on paper) — all chrome, text, structure.
2. **Platform palette** — *identity only* (chart series, badges, legends). Never chrome, never meaning.
3. **Benchmark trio** — *meaning only* (good / bad / neutral).

**Interface accent = ink.** No chromatic chrome accent; active states, links, and primary buttons use ink. Links are underlined. Every hue is claimed by a platform or a benchmark, so the colour budget is spent on charts and photos.

### 2.1 Platform palette

Each starts from the platform's true brand colour, nudged only where needed to avoid collisions or to survive the cream surface. Applied consistently to every bar, line, segment, legend, badge, and journey node.

| Platform | Hex | Note |
|---|---|---|
| Facebook | `#1877F2` | True brand azure |
| Website (GA) | `#E37400` | Google Analytics orange — mnemonic for the data source |
| X | `#15181C` | Near-black |
| Instagram — posts | `#8A3AB9` | Violet |
| Instagram — stories | `#D4537E` | Pink (separate data table → separate series) |
| YouTube | `#C0392B` | Brand red |
| LinkedIn | `#08538D` | Deepened from `#0A66C2` to separate from FB azure |
| Newsletter | `#E0A526` | MailChimp gold, deepened from `#FFE01B` (vanishes on cream) |
| Podcast | `#1DB954` | Spotify green |

Instagram is two series; per chart, decide whether to split posts/stories or aggregate to a single "Instagram."

### 2.2 Benchmark trio — encodes good-vs-bad, **not** up-vs-down

| State | Background | Text / icon | Solid accent |
|---|---|---|---|
| Good | `#EAF3DE` | `#27500A` | `#3B6D11` (olive/leaf — deliberately clear of Spotify emerald) |
| Bad | `#FCEBEB` | `#A32D2D` | — |
| Neutral / flat | `#F1EFE8` | `#5F5E5A` | — |

Benchmark cues live on KPIs and labels — **never floating inside a chart plot**.

---

## 3. Typography

All typefaces are OFL/free (zero licensing).

- **Display:** Newsreader (Latin serif) + Noto Naskh Arabic (Arabic). *Markazi Text is an optional warmer-Arabic swap.*
- **Data / UI:** IBM Plex Sans (Latin) + IBM Plex Sans Arabic (Arabic).
- **Content/story titles stay in the serif even inside tables** — a row's title is its headline. Sans owns all other data, chrome, and numbers.

### 3.1 Scale

| Token | px / weight | Use |
|---|---|---|
| display-xl | 40 / 600 | Hero KPI number |
| display-l | 30 / 600 | Secondary big number, story rollups |
| title-page | 26 / 500 | View heading (h1) |
| title-section | 20 / 500 | Section heading (h2) |
| title-item | 17 / 500 | Story & card headline (Arabic 18, extra leading) |
| title-row | 14 / 500 | Table title cell (Arabic 15) |
| body | 14 / 400 | Prose |
| data | 13 / 500 | Tabular numbers |
| label | 12 / 500 | Column headers, axis, small muted |
| caption | 11 / 400 | Honesty labels, footnotes |

### 3.2 Rules

- **3 weights per family** — Newsreader 400/500/600; Plex 400/500/600. Nothing heavier.
- **Figures = tabular lining everywhere a number appears** (columns align; no width-shift on data refresh). Integers for counts, 1 decimal for rates/EQR, hours for Attention.
- **Arabic tuning:** +1px and extra line-height vs the matching Latin token. Never letter-space Arabic. No synthetic italic on Arabic (emphasis via weight/colour; Newsreader italic is Latin-only).
- Pairing principle: Latin serif ↔ Arabic Naskh (display); Latin sans ↔ Arabic sans (data/UI).

---

## 4. Bilingual / RTL

- **English LTR interface chrome + Arabic content fully rendered RTL.** Per-string `dir="auto"`: Arabic is right-aligned in cards/headlines; in dense tables the title column keeps a consistent edge with auto-direction. *Not* a mirrored Arabic UI.
- **Numerals: Latin 0–9 everywhere** for metric values, including dates (e.g. "12 مايو"). Never Eastern Arabic-Indic.
- Content-bidi is built day one. UI strings are externalized so a future Arabic translation is a language file — but full RTL layout mirroring later is real rework, not a cheap swap.

---

## 5. Iconography

- **Phosphor, Fill weight, all-solid** (`@phosphor-icons/react`, `weight="fill"`).
- **Sizes:** 16 inline/table · 20 nav/buttons/chips · 24 standalone/empty-state. Never below 16 for interactive icons.
- **Colour follows the 3-role rule:** icons inherit text colour (ink active / muted secondary). Exceptions: platform-identity glyphs carry the platform colour (brand logos; `ph-globe` in GA-orange = Website; `ph-envelope-simple` in gold = Newsletter); benchmark direction arrows carry green/red.
- Icons **earn their place** — no decorating every label or column.
- Headlines view glyph = `ph-trophy` (provisional, swappable).

---

## 6. Charts

Recharts in build; specimens were hand-built SVG on `#FAF6EE`.

### 6.1 Bars (core)

- Solid platform fills, flat, **subtle 3px rounded corners**.
- **Gridlines:** none by default; a few barely-there faint horizontals (`#EFE8D8`) only on dense charts; **no verticals ever**.
- **Axes:** no y-axis line/ticks (faint `#A99C84` number labels only where needed); a single hairline baseline (`#D6CABA`); muted category labels.
- **Titles:** serif (Newsreader); muted sans caption/units beneath. Generous header spacing (title → subtitle → plot).
- **Labels:** direct value labels by default (sparse charts); light-axis fallback for dense/grouped charts, keeping the focus series labelled.

### 6.2 Colour-mapping rule

Series colour depends on **what the category is**:

- Categories = platforms → **platform palette**.
- Categories = stories / topics / a single series → **neutral ink**.
- **Website** = the thin overlay **line** when a chart mixes units (e.g. interaction bars vs pageviews); a normal **bar** when the metric is shared (e.g. channel comparison).

**Website overlay line:** 1.5px, small round dots (r2.5), orange `#E37400`, on its own right/secondary axis, with labelled points, sitting on top of the bars.

### 6.3 Lines / areas

- **Follower growth** (the one genuine time-series): thin 1.75px lines in platform colours, straight segments, **log scale** (labelled), **direct endpoint labels** (e.g. "Facebook 435k") instead of a legend. Hover tooltip = small warm card. Optional story-timeline correlation overlay (labelled).
- **Velocity** (stacked by Format — formats are *not* platforms): single-hue **teal sequential ramp**, long tail folded to "Other," day/week/month toggle (daily = smooth stacked area; weekly/monthly = stacked columns).

### 6.4 Heatmap

- Publishing-cadence (week × day-of-week) uses the **same teal sequential ramp** as velocity — one editorial-intensity family.
- Ramp (light → dark): `#E4F2EC → #BFE0D2 → #8FCBB5 → #5FB498 → #2F7D63 → #1C4A3B`. Darker = more; empty = faintest.
- Day/week labels; a less→more legend; Publishing / Engagement toggle.

### 6.5 Tooltips & legends

- **Tooltip:** small warm card (`#FFFDF7`, hairline, muted label + tabular value).
- **Legend:** compact rounded-square swatch + label. Prefer direct labels (endpoint/value) over legends where possible.

### 6.6 Honesty in charts

Consistent **muted caption tags** (`#F3EEE3` bg, `#8E826B` text, pill): `publish cohort` · `correlation, not attribution` · `partial attribution (IG)` · `index · can exceed 100`.

**EQR and Penetration render as an index, never a bar capped at 100%** — a quiet indicator with a "100" reference mark that the value extends *past* (e.g. EQR 132, Penetration 118%). "We out-reached the baseline" stays truthful instead of being clipped.

---

## 7. Photos & thumbnails

The engine of V1.

- **Where imagery lives:** story cards (leading hero), story-detail hero, Overview top-performers/highlights, Content gallery, platform member cards. Content **table** = optional tiny thumb or none (keep dense).
- **Ratios:** 3:2 landscape for editorial heroes/story cards (photojournalism ratio); 1:1 square for dense gallery/small thumbs. `object-fit: cover`. Native portrait preserved only where it's the point (e.g. an IG Story).
- **Corners:** subtle rounding to match the system; full-bleed-in-card = rounded **top** corners only. (Square is the print alternative.)
- **No text-over-image scrims** — titles sit below/beside the image in serif (more newspaper, avoids gradients).
- **Source badge:** a small platform-glyph chip on the media (corner, platform colour) ties the image to its source.
- **Frame:** a subtle hairline border (`#E9E0CF`) so light images sit cleanly. Photos stay **natural — no duotone**.
- **Fallback (no image):** a typographic/glyph tile — warm tone (`#F1EAD9`), hairline, muted format/platform glyph + optional small serif title. A missing image becomes a designed editorial placeholder, never a broken box. Newsletters/podcasts use their own art where available.

---

## 8. Benchmark cues

Colours are in §2.2; this is the form and logic.

**The one rule: colour encodes good-vs-bad, never direction.** The arrow shows which way it moved; the colour shows whether that's good. Decoupled.

- **Polarity per metric:**
  - *Good-up* (default): Impressions, Weighted Engagement, EQR, Site Clicks, Attention, followers, saves → up green, down red.
  - *Good-down*: Bounce rate, Unsubscribes → **down is green** (improvement).
  - *Neutral*: Pieces published (volume) → grey, never red. A publishing dip is not failure.
- **Dead-band:** tiny period changes render flat/grey (the minus glyph) so noise never flashes colour.
- **Percentile bands (within Type):** top quartile green · middle neutral · bottom quartile red. "vs platform median" cues use the same trio.
- **Forms — one vocabulary:**
  - **Delta chip** (arrow + value) on KPIs and cards.
  - **Percentile badge** (number + mini-bar) in the Content table.
- Cues sit on numbers/labels, never inside a chart plot, and earn their place (not on every figure).

---

## 9. Layout, elevation & spacing

- **Elevation — flat content, shadow only on things that float.** Cards, tiles, and tables are set apart by warm fill tone + a hairline; **no drop shadows**. The only shadow in the system is a soft warm one on transient overlays (dropdowns, tooltips, date popover, modals): `0 8px 26px rgba(74,58,38,.14), 0 2px 5px rgba(74,58,38,.08)`.
- **Borders:** hairline `#E9E0CF` for structure; stronger `#D6CABA` only for emphasis/selected. Thin, warm — never heavy grey rules.
- **Radii:** 6 inputs · 10 buttons & thumbs · 12 cards · 16 large sections · 999 pills/chips · 3 chart bars.
- **Spacing:** 4px base, deliberately generous rhythm — card padding 20, section gap 32, chart subtitle → plot 20.
- **Density — two only:** **comfortable** by default (Overview, Stories breathe); **compact** for the data tables (Content, Platforms) — same tokens, just tighter row height. Comfortable is the hero; compact is a gentle tightening, never cramped.
- **Grid:** 12-column, ~1240 max width, 24 gutters, 28–32 page padding. Desktop-first (the extension panel).

---

## 10. Components

### 10.1 Buttons
- **Primary** = ink fill (`#241F18`), paper text — used sparingly.
- **Secondary** = warm outline (`#FFFDF7` + `#D6CABA`), ink text. Export = secondary + `ph-download-simple`.
- **Ghost** = text-only, muted, for low-stakes actions.
- **Icon** = square hairline, 20px glyph.
- Radius 10; sans 13/500. Links: ink, underlined.

### 10.2 Switching — two distinct patterns
- **Underline tabs** for sub-navigation (Platforms' Comparison/Audience/Treatments; Content's type entry): active = ink text + 2px ink underline; inactive = muted.
- **Filled pill toggle** for display options (day/week/month; AR/EN segment): track `#F3EEE3` + hairline, active segment = ink fill + paper text.

### 10.3 Filters & search
- **Filter chip:** outline + caret when empty; ink-tinted (`#ECE6D9` + `#D6CABA`) with a clear-✕ when a value is set — the bar shows what's active at a glance.
- **Dropdown:** the floating-overlay style (soft shadow), olive check (`#3B6D11`) on the selection.
- **Search:** warm input (`#FFFDF7`, hairline, radius 8), `ph-magnifying-glass`, muted placeholder.

### 10.4 Category tags (Format / Section / Series)
Neutral pills (`#F1EFE8` bg, `#ECE4D4` border, `#6B6253` text). Never coloured — colour stays reserved for platform identity and benchmark meaning.

### 10.5 KPI tile
Muted label (with a quiet anchor glyph) → serif big number (tabular) → benchmark delta chip. **No sparklines** (no daily history; cohort tiles stay clean and honest).

### 10.6 Ranking lists — two flavours
- **Thumbnail-led** (top performers/stories): small thumb, serif title, platform dots, metric on the right.
- **Compact bar ranking** (topics & series): rank number, name, value, neutral ink bar (topics aren't platforms).

### 10.7 Content table
Serif title cells; sorted column carries the caret; tabular sans numbers; the **percentile badge** (number + mini-bar) in its own column does the green/neutral/red work. Compact density.

### 10.8 Stories journey card
- **Platform group header** carries the group's **site-click total** + post count.
- **Member cards** beneath show per-post metrics (Views / WE / EQR / saves).
- Group-level clicks, per-post everything else: shared links can't be summed per-post. Partial-attribution platforms (IG link-in-bio) labelled, not shown as a true zero. Newsletters appear in the email leg as "mentioned in · not counted."

---

## 11. Per-view treatment

**Global shell (every view):** top nav (Overview · Stories · Content · Platforms · Headlines, underline tabs) + a date-range control with a "vs previous period" toggle (publish-cohort semantics, labelled explicitly) + persistent global filters (Language + AR/EN segment, Section, Geography, Format, Series, Topic, Type). One shared Airtable login — no per-user auth. Honesty labels are global design elements.

- **Overview** *(ME primary, Analyst)* — five-tile KPI row (cohort deltas); the **Format-across-platforms hero** (grouped platform bars + thin website overlay line, AR/EN toggle); **velocity** stacked area (teal, day/week/month); **Top topics & series** card; thumbnail-led **Top performers**; recent highlights.
- **Stories** *(the priority view — see the hi-fi mockup)* — story list ranked by Story WE / Impressions / Site Clicks, filterable by editorial cut, with an aggregate header when a Topic/Series/Section cut is active. Story detail = de-duped totals header + "why" adjacency (save-rate, EQR) + the **per-platform journey** on a publish-date timeline (website → socials → email). Phone-critical (later, via native Airtable interface pages).
- **Content** *(Analyst power user, ME)* — type **segmented entry** (Articles default); the dense Content **table** (serif titles, percentile badges) with a Table/Gallery toggle; all global filters + Author + search; row → piece detail with the articles-only GA strip (engagement rate, reading time, bounce).
- **Platforms** *(Analyst primary)* — three underline sub-tabs. *Comparison*: channel bars + metric toggle + AR/EN segment; socials→site ranking (IG partial); Website→articles drill (main vs mirror). *Audience*: follower growth (log-scale line, endpoint labels) + cadence heatmap (teal). *Treatments*: best-treatment rankings vs platform median. Native drills per platform.
- **Headlines** *(Fundraising + Business, secondary)* — sparest screen: period selector + export (CSV + print-friendly) + one topic filter. Three big **de-duped** numbers + impression-mix bar; account-level audience growth; topic/campaign aggregate. Funder-defensible — no conflated reach.

---

## 12. States, motion, accessibility

- **Empty:** typographic/glyph treatment (matches the photo fallback) — e.g. "No stories in this period" with a muted 24px glyph. Never a blank void.
- **Loading:** warm skeletons (tile/row placeholders in `#F3EEE3`) with a faint shimmer; spinners only inline for actions, never full-page.
- **Error:** a calm inline card (muted, `ph-warning`, a Retry). Red is reserved for genuinely destructive confirmations, not "fetch failed."
- **Motion:** minimal — 120–160ms ease on hovers/expands; a single grow-in on a chart's first render; no parallax, no bounce.
- **Accessibility:** ink-on-paper passes AA; muted tones used only at sizes where they still pass; **benchmark never relies on colour alone** (always an arrow/label beside the number); **platform colour is always backed by a glyph + label**.

---

## 13. Implementation notes

- **Build:** one Airtable Interface Extension, SPA-style, internal routing across the five views + shared global filter/date state (this is what makes filters persist). Auto-released on git push. Built with Claude Code.
- **Portability boundaries** (so a later jump to Vercel is a thin rewrite, not a rebuild): every Airtable-SDK call in one **data-adapter** module; all metric/transform logic (percentiles, journey assembly, cohort grouping, de-dup) in **pure, framework-agnostic functions**; UI in **plain React + Tailwind + Recharts** — *not* the Airtable SDK UI kit, *not* shadcn.
- **Compute split:** percentiles and the per-platform story breakdown are computed **client-side within Type**; totals come from Airtable rollups.
- **Fonts:** Newsreader, Noto Naskh Arabic, IBM Plex Sans, IBM Plex Sans Arabic — via `@fontsource` (or self-hosted) for the extension. Icons via `@phosphor-icons/react` (`weight="fill"`).
- **Mobile:** custom extensions don't render in the Airtable mobile app → v1 is desktop-first. Phone access (Overview + Stories) comes later via native Airtable interface pages.
- **Tailwind:** encode the tokens above (warm-neutral spine, platform palette, benchmark trio, radii, spacing) as theme extensions; expose the surface/text neutrals as CSS variables to make the future dark-mode swap a token change.

---

*End of document.*
