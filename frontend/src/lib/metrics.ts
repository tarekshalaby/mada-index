import type {
  ContentType,
  Platform,
  MetricPolarity,
  BenchmarkState,
  PercentileBand,
} from '../data/types'

// ─── Weighted engagement weights (from Metrics Spec §2b) ──────────────────────
// Versioned: intent-led toward Mada's Q2/Q3 priorities.
// Shares down-weighted because public sharing of politically sensitive content
// carries real personal risk for many of Mada's readers in Egypt.
export const WE_WEIGHTS = {
  clicks:          5,
  saves:           4,
  comments:        3,
  shares:          2,
  reactions:       1,
  watchReadMin:    0.5,
} as const

export function computeWeightedEngagement(raw: {
  clicks: number
  saves: number
  comments: number
  shares: number
  reactions: number
  watchReadMinutes: number
}): number {
  return (
    raw.clicks           * WE_WEIGHTS.clicks +
    raw.saves            * WE_WEIGHTS.saves +
    raw.comments         * WE_WEIGHTS.comments +
    raw.shares           * WE_WEIGHTS.shares +
    raw.reactions        * WE_WEIGHTS.reactions +
    raw.watchReadMinutes * WE_WEIGHTS.watchReadMin
  )
}

// EQR — can exceed 100 for attention-heavy content; render as an index, not a capped %
export function computeEQR(weightedEngagement: number, impressions: number): number {
  if (impressions === 0) return 0
  return (weightedEngagement / impressions) * 100
}

export function computeInteractions(raw: {
  reactions: number
  comments: number
  shares: number
  saves: number
  clicks: number
}): number {
  return raw.reactions + raw.comments + raw.shares + raw.saves + raw.clicks
}

export function computeAttentionAvg(watchReadMinutes: number, impressions: number): number {
  if (impressions === 0) return 0
  return watchReadMinutes / impressions
}

export function computePenetrationRate(
  impressions: number,
  potentialAudience: number | undefined
): number | null {
  if (!potentialAudience || potentialAudience === 0) return null
  return (impressions / potentialAudience) * 100
}

// ─── Percentile ranking (client-side, within-Type) ───────────────────────────
// From Metrics Spec §5: percentiles ranked within Type at render time.
// Returns 0–100: percentage of peers this value beats.
export function computePercentileRank(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50
  const below = allValues.filter(v => v < value).length
  return Math.round((below / allValues.length) * 100)
}

export function getPercentileBand(percentile: number): PercentileBand {
  if (percentile >= 75) return 'top'
  if (percentile <= 25) return 'bottom'
  return 'middle'
}

// ─── Delta / benchmark ────────────────────────────────────────────────────────
// Dead-band: < 1% absolute change renders as neutral (no colour noise).
// Polarity decouples colour from direction: a bounce-rate decrease is green.
const DEAD_BAND = 0.01

export function computeBenchmarkState(
  current: number,
  previous: number,
  polarity: MetricPolarity
): BenchmarkState {
  if (previous === 0) return 'neutral'
  const ratio = (current - previous) / Math.abs(previous)
  if (Math.abs(ratio) < DEAD_BAND) return 'neutral'
  if (polarity === 'neutral-volume') return 'neutral'
  const isUp = ratio > 0
  if (polarity === 'good-up')   return isUp ? 'good' : 'bad'
  if (polarity === 'good-down') return isUp ? 'bad'  : 'good'
  return 'neutral'
}

export function computeDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

// ─── Platform mapping ─────────────────────────────────────────────────────────
export function platformForType(type: ContentType): Platform {
  switch (type) {
    case 'article':          return 'website'
    case 'facebook-post':    return 'facebook'
    case 'ig-post':          return 'instagram'
    case 'ig-story':         return 'instagram'
    case 'x-post':           return 'x'
    case 'linkedin-post':    return 'linkedin'
    case 'youtube-video':    return 'youtube'
    case 'newsletter':       return 'newsletter'
    case 'podcast-episode':  return 'podcast'
  }
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function formatCompact(n: number): string {
  const v = Math.round(n)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString()
}

export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes >= 60 * 1000) return `${(totalMinutes / 60000).toFixed(1)}M min`
  if (totalMinutes >= 60) {
    const h = totalMinutes / 60
    return h >= 100 ? `${Math.round(h)}h` : `${h.toFixed(1)}h`
  }
  return `${Math.round(totalMinutes)} min`
}

export function formatPct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`
}

export function formatDelta(deltaPct: number | null): string {
  if (deltaPct === null) return '—'
  const sign = deltaPct >= 0 ? '+' : ''
  return `${sign}${Math.round(deltaPct)}%`
}
