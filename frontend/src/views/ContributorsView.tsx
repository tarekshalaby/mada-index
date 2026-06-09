// Team view — Productivity vs. Performance scatter + ranked list + contributor cards.
//
// Scatter: one photo-bubble per contributor. X = articles published, Y = quality rate
// (ΣWE ÷ ΣImpressions × 100). Bubble area ∝ total reach (impressions).
// Median crosshairs split the plane into four labeled quadrants.
// Dots with <CHART_MIN_SAMPLE articles are rendered small, faded, and unlabeled.
//
// All data scoped to the selected period. No data-layer changes.

import { useState, useMemo, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, Customized,
} from 'recharts'
import { getPeriodContent, getAllContributors } from '../data/adapter'
import type { Section, Format, Contributor } from '../data/types'
import { FilterDropdown }    from '../components/FilterDropdown'
import { formatCompact }     from '../lib/metrics'
import { FORMAT_LABELS, SECTION_LABELS } from '../lib/labels'
import { ContributorDetail } from './ContributorDetail'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum articles to appear full-size and labeled in the scatter. */
const CHART_MIN_SAMPLE = 3
/** Min/max pixel radius for bubbles in the scatter. */
const BUBBLE_MIN_R = 10
const BUBBLE_MAX_R = 36
/** Pixel radius for faded (<CHART_MIN_SAMPLE) dots. */
const BUBBLE_FADED_R = 5
/** Minimum articles to appear in the ranked list and cards at all. */
const MIN_SAMPLE = 1

// ─── Palette ──────────────────────────────────────────────────────────────────
// Section colours are for avatar borders + sparklines only —
// never for the scatter dots or ranking bars (those are neutral ink).

const SECTION_COLORS: Record<string, string> = {
  'egypt-politics':         '#C0392B',
  'egypt-economy':          '#08538D',
  'egypt-society':          '#2F7D63',
  'regional-international': '#7B5EA7',
  'culture':                '#D4820A',
  'documentation-witness':  '#3D3530',
}
const FALLBACK_COLOR = '#909090'
const AVATAR_COLORS  = ['#241F18', '#08538D', '#2F7D63', '#C0392B', '#7B5EA7', '#D4820A']

const MONTH_ABBR: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContribStats {
  articleCount: number; impressions: number
  weightedEngagement: number; avgEqr: number; siteClicks: number
}

interface ContribRow {
  contributor:    Contributor
  stats:          ContribStats
  sectionColor:   string
  avatarColor:    string
  primarySection: Section | undefined
}

interface BubblePoint {
  x:            number          // article count + jitter (axis value)
  y:            number          // EQR + jitter (axis value)
  xRaw:         number          // true article count
  eqr:          number          // true EQR
  id:           string
  name:         string
  photoUrl?:    string
  avatarColor:  string
  initials:     string
  impressions:  number
  articleCount: number
  radius:       number          // px, pre-computed from log-scale of impressions
  isFaded:      boolean         // fewer than CHART_MIN_SAMPLE articles
  isLabeled:    boolean         // render name beside dot
  labelAnchor:  'start' | 'end'
}

type MonthPoint = { month: string; articles: number }

// ─── Scatter helpers ───────────────────────────────────────────────────────────

function medianOf(vals: number[]): number {
  if (!vals.length) return 0
  const s   = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

/** Deterministic per-contributor jitter so positions are stable across renders. */
function stableJitter(id: string, scale: number): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  return ((h & 0xffff) / 65535 - 0.5) * scale
}

/** Log-scale radius so the largest bubble doesn't dwarf the rest. */
function logRadius(imp: number, minImp: number, maxImp: number): number {
  if (maxImp <= minImp) return (BUBBLE_MIN_R + BUBBLE_MAX_R) / 2
  const t = (Math.log(Math.max(imp, 1)) - Math.log(Math.max(minImp, 1))) /
            (Math.log(maxImp) - Math.log(Math.max(minImp, 1)))
  return BUBBLE_MIN_R + Math.max(0, Math.min(1, t)) * (BUBBLE_MAX_R - BUBBLE_MIN_R)
}

// ─── Scatter: photo-bubble shape ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BubbleShape(props: any) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return null

  const { id, name, photoUrl, avatarColor, initials, radius, isFaded, isLabeled, labelAnchor } = payload as BubblePoint
  const r        = radius as number
  const opacity  = isFaded ? 0.28 : 0.9
  const clipId   = `bc-${String(id).replace(/[^a-zA-Z0-9]/g, '_')}`
  const labelX   = labelAnchor === 'start' ? cx + r + 5 : cx - r - 5

  return (
    <g opacity={opacity} style={{ cursor: 'pointer' }}>
      {photoUrl && (
        <defs>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>
      )}

      {photoUrl ? (
        <>
          {/* Photo circle */}
          <image
            href={photoUrl}
            x={cx - r} y={cy - r}
            width={r * 2} height={r * 2}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
          {/* Subtle border ring */}
          <circle cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth={1.5}
          />
        </>
      ) : (
        <>
          {/* Initials avatar */}
          <circle cx={cx} cy={cy} r={r}
            fill={avatarColor}
            fillOpacity={0.8}
            stroke={avatarColor}
            strokeWidth={1}
            strokeOpacity={0.3}
          />
          {!isFaded && r >= 10 && (
            <text
              x={cx} y={cy + Math.min(r * 0.35, 5)}
              textAnchor="middle"
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: Math.min(r * 0.55, 13),
                fontWeight: 700,
                fill: 'white',
                pointerEvents: 'none',
                userSelect: 'none',
              } as React.CSSProperties}
            >
              {initials}
            </text>
          )}
        </>
      )}

      {/* Direct label for outliers + high-reach dots */}
      {isLabeled && !isFaded && (
        <text
          x={labelX} y={cy + 4}
          textAnchor={labelAnchor}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 10,
            fontWeight: 500,
            fill: 'var(--color-muted)',
            pointerEvents: 'none',
            userSelect: 'none',
          } as React.CSSProperties}
        >
          {name}
        </text>
      )}
    </g>
  )
}

// ─── Scatter: tooltip ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BubbleTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as BubblePoint
  if (!d) return null
  return (
    <div style={{ backgroundColor: 'var(--color-raised)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', pointerEvents: 'none' }}>
      <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 6 }}>{d.name}</div>
      <div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>
        {d.articleCount} {d.articleCount === 1 ? 'article' : 'articles'}
      </div>
      <div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>
        Quality rate {d.eqr.toFixed(1)}
      </div>
      <div style={{ color: 'var(--color-muted)' }}>
        {formatCompact(d.impressions)} impressions
      </div>
    </div>
  )
}

// ─── Trend tooltip ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrendTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ backgroundColor: 'var(--color-raised)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--color-muted)' }}>{payload[0].value} articles published</div>
    </div>
  )
}

// ─── Scatter chart component ──────────────────────────────────────────────────

function TeamScatterChart({
  rows,
  onSelect,
}: {
  rows:     ContribRow[]
  onSelect: (c: Contributor) => void
}) {
  const { points, medianX, medianY } = useMemo(() => {
    if (!rows.length) return { points: [] as BubblePoint[], medianX: 0, medianY: 0 }

    const qualified = rows.filter(r => r.stats.articleCount >= CHART_MIN_SAMPLE)
    const faded     = rows.filter(r => r.stats.articleCount <  CHART_MIN_SAMPLE)

    if (!qualified.length) return { points: [] as BubblePoint[], medianX: 0, medianY: 0 }

    const allImp = rows.map(r => r.stats.impressions)
    const minImp = Math.min(...allImp)
    const maxImp = Math.max(...allImp)

    const medX = medianOf(qualified.map(r => r.stats.articleCount))
    const medY = medianOf(qualified.map(r => r.stats.avgEqr))

    // ── Pick which dots get direct name labels ────────────────────────────
    // Top extreme in each quadrant + top 2 by reach. Deduped.
    const maxX = Math.max(...qualified.map(r => r.stats.articleCount))
    const maxY = Math.max(...qualified.map(r => r.stats.avgEqr))

    function extremeness(r: ContribRow): number {
      const dx = Math.abs(r.stats.articleCount - medX) / (Math.max(maxX - medX, 1))
      const dy = Math.abs(r.stats.avgEqr - medY) / (Math.max(maxY - medY, medY, 1))
      return dx + dy
    }

    const pick = (filter: (r: ContribRow) => boolean) =>
      qualified.filter(filter).sort((a, b) => extremeness(b) - extremeness(a))[0]

    const UR = pick(r => r.stats.articleCount >  medX && r.stats.avgEqr >  medY)
    const UL = pick(r => r.stats.articleCount <= medX && r.stats.avgEqr >  medY)
    const LR = pick(r => r.stats.articleCount >  medX && r.stats.avgEqr <= medY)
    const LL = pick(r => r.stats.articleCount <= medX && r.stats.avgEqr <= medY)
    const byReach = [...qualified].sort((a, b) => b.stats.impressions - a.stats.impressions).slice(0, 2)

    const labeled = new Set(
      [UR, UL, LR, LL, ...byReach].filter(Boolean).map(r => r!.contributor.id),
    )

    // ── Build data points ─────────────────────────────────────────────────
    function makePoint(r: ContribRow, isFaded: boolean): BubblePoint {
      const xRaw       = r.stats.articleCount
      const eqr        = r.stats.avgEqr
      const jX         = stableJitter(r.contributor.id + 'x', 0.35)
      const jY         = stableJitter(r.contributor.id + 'y', 1.0)
      const rad        = isFaded
        ? BUBBLE_FADED_R
        : logRadius(r.stats.impressions, minImp, maxImp)
      const isLabeled  = !isFaded && labeled.has(r.contributor.id)
      const rightSide  = xRaw > medX

      return {
        x:           xRaw + jX,
        y:           eqr  + jY,
        xRaw,
        eqr,
        id:          r.contributor.id,
        name:        r.contributor.name,
        photoUrl:    r.contributor.photoUrl,
        avatarColor: r.avatarColor,
        initials:    r.contributor.name.split(' ').map((w: string) => w[0]).slice(0, 2).join(''),
        impressions: r.stats.impressions,
        articleCount: xRaw,
        radius:      rad,
        isFaded,
        isLabeled,
        labelAnchor: rightSide ? 'start' : 'end',
      }
    }

    return {
      points: [
        ...qualified.map(r => makePoint(r, false)),
        ...faded.map(r => makePoint(r, true)),
      ],
      medianX: medX,
      medianY: medY,
    }
  }, [rows])

  // Quadrant label overlay — captured inside useCallback so medianX/Y are stable.
  const QuadrantLabels = useCallback((props: any) => {
    // xAxisMap may be keyed by number or string depending on Recharts version
    const xAxisArr = props.xAxisMap ? Object.values(props.xAxisMap) : []
    const yAxisArr = props.yAxisMap ? Object.values(props.yAxisMap) : []
    const xScale   = (xAxisArr[0] as any)?.scale
    const yScale   = (yAxisArr[0] as any)?.scale
    if (!xScale || !yScale) return null

    const mx = xScale(medianX)
    const my = yScale(medianY)
    const s  = {
      fontFamily: 'var(--font-ui)', fontSize: 9,
      fill: 'var(--color-fainter)', pointerEvents: 'none',
      letterSpacing: '0.03em',
    } as React.CSSProperties

    return (
      <g>
        <text x={mx + 8}  y={my - 9}  textAnchor="start" style={s}>prolific · high quality</text>
        <text x={mx - 8}  y={my - 9}  textAnchor="end"   style={s}>few pieces · high quality</text>
        <text x={mx + 8}  y={my + 17} textAnchor="start" style={s}>prolific · lower quality</text>
        <text x={mx - 8}  y={my + 17} textAnchor="end"   style={s}>low on both</text>
      </g>
    )
  }, [medianX, medianY])

  const axTick = { fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--color-fainter)' } as const

  if (points.length < 2) return null

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '18px 20px', backgroundColor: 'var(--color-raised)', marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: 'var(--color-fainter)', marginBottom: 2 }}>
        Productivity vs. performance
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', marginBottom: 16 }}>
        X = articles published · Y = quality rate (ΣWE ÷ ΣImpressions × 100) · bubble size = impressions · dashed lines = team median
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart
          margin={{ top: 12, right: 130, bottom: 36, left: 8 }}
          onClick={(chartData: any) => {
            const id = chartData?.activePayload?.[0]?.payload?.id
            if (!id) return
            const row = rows.find(r => r.contributor.id === id)
            if (row) onSelect(row.contributor)
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />

          <XAxis
            dataKey="x"
            type="number"
            name="Articles"
            domain={[0, (max: number) => Math.ceil(max) + 1]}
            allowDecimals={false}
            tick={axTick}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Articles published',
              position: 'insideBottom',
              offset: -18,
              style: { fontFamily: 'var(--font-ui)', fontSize: 10, fill: 'var(--color-fainter)' },
            }}
          />

          <YAxis
            dataKey="y"
            type="number"
            name="Quality Rate"
            domain={[
              (min: number) => Math.max(0, Math.floor(min * 0.85)),
              (max: number) => Math.ceil(max * 1.12),
            ]}
            tick={axTick}
            axisLine={false}
            tickLine={false}
            width={44}
            label={{
              value: 'Quality rate',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              style: { fontFamily: 'var(--font-ui)', fontSize: 10, fill: 'var(--color-fainter)' },
            }}
          />

          {/* Median crosshairs — neutral ink, no benchmark colour */}
          <ReferenceLine
            x={medianX}
            stroke="var(--color-ink)"
            strokeOpacity={0.15}
            strokeDasharray="5 4"
          />
          <ReferenceLine
            y={medianY}
            stroke="var(--color-ink)"
            strokeOpacity={0.15}
            strokeDasharray="5 4"
          />

          {/* Quadrant corner labels */}
          <Customized component={QuadrantLabels} />

          <RechartsTip
            content={<BubbleTip />}
            cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-border-strong)' }}
          />

          <Scatter
            data={points}
            shape={<BubbleShape />}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>

      <div style={{ marginTop: 6, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
        Small faded dots = fewer than {CHART_MIN_SAMPLE} articles this period · not labeled · included to show presence · click any dot to view profile
      </div>
    </div>
  )
}

// ─── Contributor card ─────────────────────────────────────────────────────────

function ContributorCard({ row, sparkData, onClick }: {
  row:       ContribRow
  sparkData: { month: string; impressions: number }[]
  onClick:   () => void
}) {
  const [hovered, setHovered] = useState(false)
  const { contributor, stats, sectionColor, avatarColor } = row
  const initials = contributor.name.split(' ').map(w => w[0]).slice(0, 2).join('')

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ textAlign: 'left', background: hovered ? 'var(--color-raised)' : 'none', border: `1px solid ${hovered ? 'var(--color-border-strong)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-card)', padding: '18px', cursor: 'pointer', transition: 'all 140ms ease', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: `2px solid ${sectionColor}50`, backgroundColor: contributor.photoUrl ? 'transparent' : avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {contributor.photoUrl
            ? <img src={contributor.photoUrl} alt={contributor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'white' }}>{initials}</span>
          }
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-item)', fontWeight: 600, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
            {contributor.name}
          </div>
          {contributor.bio && (
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {contributor.bio}
            </div>
          )}
        </div>
      </div>

      {sparkData.length > 1 && (
        <div style={{ height: 36, marginBottom: 12 }}>
          <ResponsiveContainer width="100%" height={36}>
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sg-${contributor.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={sectionColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={sectionColor} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="impressions" stroke={sectionColor} strokeWidth={1.5} fill={`url(#sg-${contributor.id})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[
          { label: 'Articles',    value: String(stats.articleCount)      },
          { label: 'Impressions', value: formatCompact(stats.impressions) },
          { label: 'Quality',     value: stats.avgEqr.toFixed(1)         },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: hovered ? 'var(--color-muted)' : 'var(--color-faint)', transition: 'color 120ms ease' }}>
        <span style={{ fontWeight: 700, fontSize: 10 }}>→</span> View profile
      </div>
    </button>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

const CARD_LIMIT = 24

export function ContributorsView({ period = 'may-26' }: { period?: string }) {
  const [selected,      setSelected     ] = useState<Contributor | null>(null)
  const [filterSection, setFilterSection] = useState<Section | undefined>()
  const [filterFormat,  setFilterFormat ] = useState<Format | undefined>()
  const [filterTopic,   setFilterTopic  ] = useState<string | undefined>()
  const [showAll,       setShowAll      ] = useState(false)

  const allContent      = useMemo(() => getPeriodContent(period), [period])
  const allContributors = useMemo(() => getAllContributors(), [])

  const authoredContent = useMemo(
    () => allContent.filter(i => (i.authorIds?.length ?? 0) > 0),
    [allContent],
  )

  const filteredContent = useMemo(() => {
    let items = authoredContent
    if (filterSection) items = items.filter(i => i.section === filterSection)
    if (filterFormat)  items = items.filter(i => i.format  === filterFormat)
    if (filterTopic)   items = items.filter(i => i.topics?.includes(filterTopic))
    return items
  }, [authoredContent, filterSection, filterFormat, filterTopic])

  // Per-contributor stats. EQR = ΣWE ÷ ΣImpressions × 100 (never mean of rates).
  const sorted = useMemo((): ContribRow[] =>
    allContributors
      .map((c, idx): ContribRow | null => {
        const cc = filteredContent.filter(item => item.authorIds!.includes(c.id))
        if (cc.length < MIN_SAMPLE) return null

        const secCounts = new Map<string, number>()
        for (const item of cc) {
          if (item.section) secCounts.set(item.section, (secCounts.get(item.section) ?? 0) + 1)
        }
        const primarySection = secCounts.size
          ? ([...secCounts.entries()].sort(([, a], [, b]) => b - a)[0][0] as Section)
          : undefined

        const impressions = cc.reduce((s, x) => s + x.metrics.impressions, 0)
        const we          = cc.reduce((s, x) => s + x.metrics.weightedEngagement, 0)
        const avgEqr      = impressions > 0 ? (we / impressions) * 100 : 0

        return {
          contributor: c,
          primarySection,
          sectionColor:  primarySection ? (SECTION_COLORS[primarySection] ?? FALLBACK_COLOR) : FALLBACK_COLOR,
          avatarColor:   AVATAR_COLORS[idx % AVATAR_COLORS.length],
          stats: {
            articleCount: cc.length, impressions, weightedEngagement: we, avgEqr,
            siteClicks: cc.reduce((s, x) => s + x.metrics.siteClicks, 0),
          },
        }
      })
      .filter((x): x is ContribRow => x !== null)
      .sort((a, b) => b.stats.impressions - a.stats.impressions),
  [allContributors, filteredContent])

  // Team output trend
  const teamTrendData = useMemo((): MonthPoint[] => {
    const byMonth = new Map<string, number>()
    for (const item of filteredContent) {
      const m = item.publishedAt.slice(0, 7)
      byMonth.set(m, (byMonth.get(m) ?? 0) + 1)
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, articles]) => ({ month: MONTH_ABBR[m.slice(5)] ?? m.slice(5), articles }))
  }, [filteredContent])

  // Per-contributor sparklines
  const sparkMap = useMemo(() => {
    const map = new Map<string, { month: string; impressions: number }[]>()
    for (const { contributor } of sorted) {
      const cc      = filteredContent.filter(i => i.authorIds!.includes(contributor.id))
      const byMonth = new Map<string, number>()
      for (const item of cc) {
        const m = item.publishedAt.slice(0, 7)
        byMonth.set(m, (byMonth.get(m) ?? 0) + item.metrics.impressions)
      }
      map.set(contributor.id,
        [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b))
          .map(([month, impressions]) => ({ month, impressions }))
      )
    }
    return map
  }, [filteredContent, sorted])

  const sectionOptions = useMemo(() =>
    [...new Set(authoredContent.filter(i => i.section).map(i => i.section as Section))]
      .map(v => ({ value: v, label: SECTION_LABELS[v] })),
  [authoredContent])

  const formatOptions = useMemo(() =>
    [...new Set(authoredContent.filter(i => i.format).map(i => i.format as Format))]
      .map(v => ({ value: v, label: FORMAT_LABELS[v] })),
  [authoredContent])

  const topicOptions = useMemo(() =>
    [...new Set(authoredContent.flatMap(i => i.topics ?? []))]
      .map(t => ({ value: t, label: t })),
  [authoredContent])

  const hasFilter    = !!(filterSection || filterFormat || filterTopic)
  const top10        = sorted.slice(0, 10)
  const maxImpressions = sorted[0]?.stats.impressions ?? 1
  const visibleCards = showAll ? sorted : sorted.slice(0, CARD_LIMIT)
  const hasMore      = sorted.length > CARD_LIMIT

  if (selected) {
    return <ContributorDetail contributor={selected} period={period} onBack={() => setSelected(null)} />
  }

  const chartCard  = { border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '18px 20px', backgroundColor: 'var(--color-raised)', marginBottom: 16 } as const
  const chartTitle = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-fainter)', marginBottom: 2 } as const
  const chartSub   = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', marginBottom: 14 } as const
  const axTick     = { fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--color-fainter)' } as const

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 28px 56px' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-page)', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 4px' }}>Team</h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-muted)', margin: 0 }}>
            {sorted.length} contributor{sorted.length !== 1 ? 's' : ''}{hasFilter ? ' · filtered' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {sectionOptions.length > 0 && <FilterDropdown label="Section"    options={sectionOptions} value={filterSection} onChange={setFilterSection as (v: string | undefined) => void} />}
          {formatOptions.length  > 0 && <FilterDropdown label="Story type" options={formatOptions}  value={filterFormat}  onChange={setFilterFormat  as (v: string | undefined) => void} />}
          {topicOptions.length   > 0 && <FilterDropdown label="Topic"      options={topicOptions}   value={filterTopic}   onChange={setFilterTopic} />}
          {hasFilter && (
            <button onClick={() => { setFilterSection(undefined); setFilterFormat(undefined); setFilterTopic(undefined) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)', padding: 0, textDecoration: 'underline' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-faint)' }}>
          No contributors match this filter.
        </div>
      ) : (
        <>
          {/* ── 1. Scatter: Productivity vs. Performance ─────────────────── */}
          <TeamScatterChart rows={sorted} onSelect={setSelected} />

          {/* ── 2. Team output trend ─────────────────────────────────────── */}
          <div style={chartCard}>
            <div style={chartTitle}>Team output</div>
            <div style={chartSub}>Total articles published per month across the team</div>
            {teamTrendData.length < 2 ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '14px 0 6px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1 }}>
                  {teamTrendData[0]?.articles ?? filteredContent.length}
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
                  articles published{teamTrendData[0] ? ` in ${teamTrendData[0].month}` : ''} · trend chart appears once data spans multiple months
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={teamTrendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="team-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--color-ink)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="var(--color-ink)" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={axTick} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axTick} axisLine={false} tickLine={false} width={40} />
                  <RechartsTip content={<TrendTip />} />
                  <Area type="monotone" dataKey="articles" stroke="var(--color-ink)" strokeWidth={1.5} fill="url(#team-grad)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-ink)' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── 3. Top-10 ranked list — exact figures ─────────────────────── */}
          <div style={chartCard}>
            <div style={chartTitle}>Top contributors</div>
            <div style={chartSub}>Ranked by impressions in this period · showing top 10</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: '1px solid var(--color-border)', marginBottom: 4 }}>
                <span style={{ width: 20, flexShrink: 0 }} />
                <span style={{ width: 28, flexShrink: 0 }} />
                <span style={{ width: 150, flexShrink: 0, fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-fainter)' }}>Name</span>
                <span style={{ flex: 1 }} />
                <span style={{ width: 60, textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-fainter)', flexShrink: 0 }}>Impressions</span>
                <span style={{ width: 64, textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-fainter)', flexShrink: 0 }}>Articles</span>
              </div>
              {top10.map(({ contributor, stats, sectionColor, avatarColor }, i) => {
                const pct      = (stats.impressions / maxImpressions) * 100
                const initials = contributor.name.split(' ').map(w => w[0]).slice(0, 2).join('')
                return (
                  <div
                    key={contributor.id}
                    onClick={() => setSelected(contributor)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < top10.length - 1 ? '1px solid var(--color-border)' : 'none', cursor: 'pointer' }}
                  >
                    <span style={{ width: 20, textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-fainter)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: `1.5px solid ${sectionColor}60`, backgroundColor: contributor.photoUrl ? 'transparent' : avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {contributor.photoUrl
                        ? <img src={contributor.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'white' }}>{initials}</span>
                      }
                    </div>
                    <span style={{ width: 150, flexShrink: 0, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {contributor.name}
                    </span>
                    {/* Bar — neutral ink, structural comparison only */}
                    <div style={{ flex: 1, height: 6, backgroundColor: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--color-ink)', borderRadius: 3, opacity: 0.7 }} />
                    </div>
                    <span style={{ width: 60, textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', flexShrink: 0 }}>
                      {formatCompact(stats.impressions)}
                    </span>
                    <span style={{ width: 64, textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--color-faint)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {stats.articleCount}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 4. Contributor cards ──────────────────────────────────────── */}
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)', marginBottom: 14 }}>
              {sorted.length} contributors{!showAll && sorted.length > CARD_LIMIT ? ` · showing top ${CARD_LIMIT}` : ''} · click to view profile
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(252px, 1fr))', gap: 14 }}>
              {visibleCards.map(row => (
                <ContributorCard
                  key={row.contributor.id}
                  row={row}
                  sparkData={sparkMap.get(row.contributor.id) ?? []}
                  onClick={() => setSelected(row.contributor)}
                />
              ))}
            </div>
            {hasMore && !showAll && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button
                  onClick={() => setShowAll(true)}
                  style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', color: 'var(--color-muted)', background: 'none', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-btn)', padding: '0 20px', height: 36, cursor: 'pointer', transition: 'all 120ms ease' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-tile)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                >
                  Show all {sorted.length} contributors
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
