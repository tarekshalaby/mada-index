// Pure data functions for all Recharts components.
// No React, no Airtable. Easy to unit-test and swap behind the adapter in Phase 6.

import { getContent, getPeriodContent, getStories, getFollowersHistory } from '../data/adapter'
import type { Format, Platform } from '../data/types'
import { FORMAT_LABELS } from './labels'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}

// ─── 1. Format performance across platforms ───────────────────────────────────
// For each editorial Format × social platform: average WE per piece.
// Website shows separately as the overlay line (different unit).
// lang: filter by content language ('ar' | 'en' | undefined = both)

export interface FormatPerfRow {
  format:     string
  facebook?:  number
  instagram?: number
  x?:         number
  linkedin?:  number
  youtube?:   number
  podcast?:   number
  website?:   number  // overlay line — separate axis
}

export type FormatMetric = 'we' | 'impressions' | 'siteClicks'

export function getFormatPerformanceData(
  lang?: 'ar' | 'en',
  metric: FormatMetric = 'we',
  period?: string,
): FormatPerfRow[] {
  const content = period ? getPeriodContent(period) : getContent()
  const stories = getStories()

  const storyFormat: Record<string, Format> = {}
  for (const s of stories) if (s.format) storyFormat[s.id] = s.format

  // groups[format][platform] = { sum, count }
  const groups: Record<string, Record<string, { sum: number; count: number }>> = {}

  for (const c of content) {
    if (lang && c.language !== lang && c.language !== 'both') continue
    if (!c.storyId) continue
    const format = storyFormat[c.storyId]
    if (!format) continue

    const val = metric === 'impressions' ? c.metrics.impressions
               : metric === 'siteClicks'  ? c.metrics.siteClicks
               : c.metrics.weightedEngagement

    if (!groups[format])             groups[format]             = {}
    if (!groups[format][c.platform]) groups[format][c.platform] = { sum: 0, count: 0 }
    groups[format][c.platform].sum   += val
    groups[format][c.platform].count += 1
  }

  // Pin x-axis order so it never re-sorts when metric or language toggles.
  const FORMAT_AXIS_ORDER: Format[] = [
    'news', 'news-feature', 'feature-investigation', 'op-ed',
    'panorama', 'cartoon', 'newsletter', 'podcast', 'video',
    'breaking-news', 'story-of-the-day', 'platform-native',
  ]

  const buildRow = (fmt: string, platforms: Record<string, { sum: number; count: number }>): FormatPerfRow => {
    const row: FormatPerfRow = { format: FORMAT_LABELS[fmt as Format] ?? fmt }
    for (const [plat, { sum, count }] of Object.entries(platforms)) {
      const avg = count > 0 ? Math.round(sum / count) : 0
      ;(row as unknown as Record<string, unknown>)[plat] = avg
    }
    return row
  }

  const knownRows = FORMAT_AXIS_ORDER
    .filter(fmt => groups[fmt])
    .map(fmt => buildRow(fmt, groups[fmt]))

  const otherRows = Object.entries(groups)
    .filter(([fmt]) => !FORMAT_AXIS_ORDER.includes(fmt as Format))
    .map(([fmt, platforms]) => buildRow(fmt, platforms))

  return [...knownRows, ...otherRows]
}

// ─── 2. Publishing velocity ────────────────────────────────────────────────────
// Count of pieces published per time bucket, segmented by Format.
// Formats with few pieces are folded into "Other."

export const TEAL_RAMP = ['#E4F2EC', '#BFE0D2', '#8FCBB5', '#5FB498', '#2F7D63', '#1C4A3B'] as const

// Assign a teal colour to each format (heavier editorial formats get darker teal)
const FORMAT_TEAL: Record<string, string> = {
  'Feature / Investigation': '#5FB498',
  'News Feature':            '#8FCBB5',
  'News':                    '#BFE0D2',
  'MailChimp':               '#2F7D63',
  'Podcast':                 '#1C4A3B',
  'Video':                   '#1C4A3B',
  'Other':                   '#E4F2EC',
}
export function formatTealColor(label: string): string {
  return FORMAT_TEAL[label] ?? '#5FB498'
}

export interface VelocityRow {
  date: string
  [segment: string]: number | string | undefined
}

// Platform display names for the 'type' segmentation mode
const PLATFORM_DISPLAY: Record<string, string> = {
  'website':    'Website',
  'facebook':   'Facebook',
  'instagram':  'Instagram',
  'x':          'X',
  'linkedin':   'LinkedIn',
  'youtube':    'YouTube',
  'newsletter': 'MailChimp',
  'podcast':    'Podcast',
}

// Platform brand colours for the 'type' segmentation mode.
// Must match PLATFORM_CONFIG in PlatformBadge.tsx exactly.
const PLATFORM_VELOCITY_COLORS: Record<string, string> = {
  'Website':    '#E37400',
  'Facebook':   '#1877F2',
  'Instagram':  '#8A3AB9',
  'X':          '#15181C',
  'LinkedIn':   '#08538D',
  'YouTube':    '#C0392B',
  'MailChimp':  '#E0A526',
  'Podcast':    '#1DB954',
}

export type VelocitySegment = 'format' | 'type'

export function velocitySegmentColor(segmentBy: VelocitySegment, label: string): string {
  if (segmentBy === 'type') return PLATFORM_VELOCITY_COLORS[label] ?? '#5FB498'
  return FORMAT_TEAL[label] ?? '#5FB498'
}

export function getVelocityData(segmentBy: VelocitySegment = 'format', period?: string): {
  data: VelocityRow[]
  formats: string[]
} {
  const content = period ? getPeriodContent(period) : getContent()
  const stories = getStories()

  const storyFormat: Record<string, string> = {}
  for (const s of stories) {
    if (s.format) storyFormat[s.id] = FORMAT_LABELS[s.format as Format] ?? s.format
  }

  // Always bucket by calendar day
  function bucket(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const buckets: Record<string, Record<string, number>> = {}
  const segmentSet = new Set<string>()

  for (const c of content) {
    const b = bucket(c.publishedAt)
    const seg = segmentBy === 'format'
      ? (c.storyId ? (storyFormat[c.storyId] ?? 'Other') : 'Other')
      : (PLATFORM_DISPLAY[c.platform] ?? c.platform)
    if (!buckets[b]) buckets[b] = {}
    buckets[b][seg] = (buckets[b][seg] ?? 0) + 1
    segmentSet.add(seg)
  }

  // Sort buckets chronologically
  const sortedKeys = Object.keys(buckets).sort((a, b) =>
    new Date(`${a} 2026`).getTime() - new Date(`${b} 2026`).getTime()
  )

  const formats = [...segmentSet]

  const data: VelocityRow[] = sortedKeys.map((b) => ({
    date: b,
    ...Object.fromEntries(formats.map(f => [f, buckets[b][f] ?? 0])),
  }))

  return { data, formats }
}

// ─── 3. Follower growth ────────────────────────────────────────────────────────
// Weekly per-platform follower counts for the LineChart (log scale).

export interface FollowerRow {
  date:      string
  rawDate:   string   // ISO — for sorting
  [platform: string]: number | string
}

export function getFollowerGrowthData(): { data: FollowerRow[]; platforms: Platform[] } {
  const history = getFollowersHistory()
  if (!history.length) return { data: [], platforms: [] }

  // 1. All unique platforms that appear in history
  const platforms = [...new Set(history.map(s => s.platform))] as Platform[]

  // 2. Bucket every snapshot to its calendar week (Monday).
  //    Platforms that snapshot on different days within the same week collapse to one row,
  //    giving a consistent weekly X-axis regardless of which day each platform was captured.
  //    Within a bucket, keep the highest reading per platform — guards against same-day
  //    automation duplicates that would otherwise make the tile and chart disagree.
  //
  //    Key built from LOCAL date components (not toISOString) so the Monday label is
  //    not shifted back one day by the UTC conversion in UTC+ timezones.
  const byWeek: Record<string, Partial<Record<Platform, number>>> = {}
  for (const snap of history) {
    const monday = getMondayOfWeek(new Date(snap.snapshotDate + 'T12:00:00'))
    const y  = monday.getFullYear()
    const mo = String(monday.getMonth() + 1).padStart(2, '0')
    const d  = String(monday.getDate()).padStart(2, '0')
    const key = `${y}-${mo}-${d}`
    if (!byWeek[key]) byWeek[key] = {}
    const existing = byWeek[key][snap.platform]
    if (existing === undefined || snap.followerCount > existing) {
      byWeek[key][snap.platform] = snap.followerCount
    }
  }

  // 3. Walk weeks in chronological order; forward-fill last-known value per platform
  //    (follower counts are point-in-time totals, not per-period events)
  const allWeeks   = Object.keys(byWeek).sort()
  const lastKnown: Partial<Record<Platform, number>> = {}

  const data: FollowerRow[] = allWeeks.map(iso => {
    const snap = byWeek[iso]
    for (const p of platforms) {
      if (snap[p] !== undefined) lastKnown[p] = snap[p]
    }
    // Label: "Wk Jun 2" style, anchored to the Monday
    const row: FollowerRow = {
      date:    'Wk ' + new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rawDate: iso,
    }
    for (const p of platforms) {
      if (lastKnown[p] !== undefined) row[p] = lastKnown[p]!
    }
    return row
  })

  return { data, platforms }
}

// ─── 4. Cadence heatmap ────────────────────────────────────────────────────────
// week × day-of-week grid. mode='publishing' = count; mode='engagement' = sum WE.

export interface CadenceCell {
  weekLabel:  string
  weekStart:  Date
  dayIndex:   number  // 0 = Mon … 6 = Sun
  value:      number
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function getCadenceData(mode: 'publishing' | 'engagement', period?: string, platform?: string): {
  cells:    CadenceCell[]
  weeks:    { label: string; start: Date }[]
  maxValue: number
} {
  let content = period ? getPeriodContent(period) : getContent()

  // Per-channel view: filter to just that platform's records.
  // Global view (no platform): deduplicate multi-platform stories so a story
  // published on 5 platforms counts as 1 editorial decision, not 5.
  if (platform) {
    content = content.filter(c => c.platform === platform)
  } else {
    const seenStoryDay = new Set<string>()
    content = content.filter(c => {
      if (!c.storyId) return true          // standalone post — always count
      const key = `${c.storyId}:${c.publishedAt.slice(0, 10)}`
      if (seenStoryDay.has(key)) return false
      seenStoryDay.add(key)
      return true
    })
  }

  // Map: weekStartISO → dayIndex → value
  const grid: Record<string, Record<number, number>> = {}

  for (const c of content) {
    const d   = new Date(c.publishedAt)
    const mon = getMondayOfWeek(d)
    const key = mon.toISOString().split('T')[0]
    const day = d.getDay() === 0 ? 6 : d.getDay() - 1  // Mon=0 … Sun=6

    if (!grid[key]) grid[key] = {}
    const add = mode === 'publishing' ? 1 : c.metrics.weightedEngagement
    grid[key][day] = (grid[key][day] ?? 0) + add
  }

  const sortedWeekKeys = Object.keys(grid).sort()

  const weeks = sortedWeekKeys.map(iso => ({
    label: 'Wk ' + new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    start: new Date(iso),
  }))

  const cells: CadenceCell[] = weeks.flatMap(({ label, start }) => {
    const key = start.toISOString().split('T')[0]
    return Array.from({ length: 7 }, (_, di) => ({
      weekLabel: label,
      weekStart: start,
      dayIndex:  di,
      value:     grid[key]?.[di] ?? 0,
    }))
  })

  const maxValue = Math.max(...cells.map(c => c.value), 1)

  return { cells, weeks, maxValue }
}

// ─── 5. Engagement-type mix ────────────────────────────────────────────────────
// Per platform: composition of interaction types (reactions / comments / shares / saves / clicks).
// Normalized to 100% so we compare mix, not volume.
// Sorted by impressions descending — matches the channel comparison order above the chart.

export interface EngagementMixRow {
  platform:     Platform
  label:        string   // human-readable platform name for the Y-axis
  reactions:    number
  comments:     number
  shares:       number
  saves:        number
  clicks:       number
  total:        number   // sum of the five interaction counts
  reactionsPct: number   // 0–100, normalised share for the stacked bar
  commentsPct:  number
  sharesPct:    number
  savesPct:     number
  clicksPct:    number
}

export function getEngagementMix(period?: string): EngagementMixRow[] {
  const content = period ? getPeriodContent(period) : getContent()

  const map = new Map<Platform, {
    reactions: number; comments: number; shares: number
    saves: number; clicks: number; impressions: number
  }>()

  for (const c of content) {
    const e = map.get(c.platform) ?? { reactions: 0, comments: 0, shares: 0, saves: 0, clicks: 0, impressions: 0 }
    map.set(c.platform, {
      reactions:   e.reactions   + c.metrics.reactions,
      comments:    e.comments    + c.metrics.comments,
      shares:      e.shares      + c.metrics.shares,
      saves:       e.saves       + c.metrics.saves,
      clicks:      e.clicks      + c.metrics.clicks,
      impressions: e.impressions + c.metrics.impressions,
    })
  }

  // Sort by impressions descending — keeps this chart in the same order as the comparison
  return [...map.entries()]
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .map(([platform, counts]) => {
      const total = counts.reactions + counts.comments + counts.shares + counts.saves + counts.clicks
      const safe  = total > 0 ? total : 1
      return {
        platform,
        label:        PLATFORM_DISPLAY[platform] ?? platform,
        reactions:    counts.reactions,
        comments:     counts.comments,
        shares:       counts.shares,
        saves:        counts.saves,
        clicks:       counts.clicks,
        total,
        reactionsPct: (counts.reactions / safe) * 100,
        commentsPct:  (counts.comments  / safe) * 100,
        sharesPct:    (counts.shares    / safe) * 100,
        savesPct:     (counts.saves     / safe) * 100,
        clicksPct:    (counts.clicks    / safe) * 100,
      }
    })
    .filter(r => r.total > 0)  // skip platforms with no recorded interaction breakdown
}
