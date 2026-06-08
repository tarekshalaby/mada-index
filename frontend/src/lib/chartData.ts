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

  return Object.entries(groups).map(([fmt, platforms]) => {
    const row: FormatPerfRow = { format: FORMAT_LABELS[fmt as Format] ?? fmt }
    for (const [plat, { sum, count }] of Object.entries(platforms)) {
      const avg = count > 0 ? Math.round(sum / count) : 0
      ;(row as unknown as Record<string, unknown>)[plat] = avg
    }
    return row
  })
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
  'Newsletter':              '#2F7D63',
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
  'newsletter': 'Newsletter',
  'podcast':    'Podcast',
}

// Platform brand colours for the 'type' segmentation mode
const PLATFORM_VELOCITY_COLORS: Record<string, string> = {
  'Website':    '#237A3C',
  'Facebook':   '#1877F2',
  'Instagram':  '#E1306C',
  'X':          '#657786',
  'LinkedIn':   '#0A66C2',
  'YouTube':    '#FF0000',
  'Newsletter': '#2F7D63',
  'Podcast':    '#8B5CF6',
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

  const byDate: Record<string, Partial<Record<Platform, number>>> = {}
  for (const snap of history) {
    if (!byDate[snap.snapshotDate]) byDate[snap.snapshotDate] = {}
    byDate[snap.snapshotDate][snap.platform] = snap.followerCount
  }

  const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))

  const platforms = [
    ...new Set(history.map(s => s.platform)),
  ] as Platform[]

  const data: FollowerRow[] = sorted.map(([iso, vals]) => ({
    date:    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    rawDate: iso,
    ...vals,
  }))

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
