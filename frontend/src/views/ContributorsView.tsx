// Team view — scales to 100+ contributors.
//
// Charts:
//   1. Team output trend  — aggregate articles/month, area (always readable)
//   2. Top-10 ranked      — horizontal bars with avatar, name, impressions (HTML, not Recharts)
//
// Cards: top 24 visible by default; "Show all N" expands the rest.
//
// MIN_SAMPLE guard: contributors with zero pieces in the selected period are
// excluded. Value is 1 — anyone with at least one attributed article appears.

import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer,
} from 'recharts'
import { getPeriodContent, getAllContributors } from '../data/adapter'
import type { Section, Format, Contributor } from '../data/types'
import { FilterDropdown }    from '../components/FilterDropdown'
import { formatCompact }     from '../lib/metrics'
import { FORMAT_LABELS, SECTION_LABELS } from '../lib/labels'
import { ContributorDetail } from './ContributorDetail'

// ─── Minimum sample ───────────────────────────────────────────────────────────
// Contributors with fewer than this many pieces in the period are excluded from
// rankings, the card grid, and charts to prevent one-off attributions from
// producing misleading quality rates.
const MIN_SAMPLE = 1

// ─── Section colour palette ───────────────────────────────────────────────────
// Avatar border + sparklines only — NOT used for ranking bars (those are neutral
// ink per the design rules: platform identity ≠ benchmark meaning).

const SECTION_COLORS: Record<string, string> = {
  'egypt-politics':         '#C0392B',
  'egypt-economy':          '#08538D',
  'egypt-society':          '#2F7D63',
  'regional-international': '#7B5EA7',
  'culture':                '#D4820A',
  'documentation-witness':  '#3D3530',
}
const FALLBACK_COLOR = '#909090'

// Fallback palette for avatar backgrounds when no section is known
const AVATAR_COLORS = ['#241F18', '#08538D', '#2F7D63', '#C0392B', '#7B5EA7', '#D4820A']

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
  sectionColor:   string       // section-derived — avatar border + sparkline only
  avatarColor:    string       // index-derived — avatar bg
  primarySection: Section | undefined
}

type MonthPoint = { month: string; articles: number }

// ─── Tooltips ─────────────────────────────────────────────────────────────────

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

// ─── Contributor card ─────────────────────────────────────────────────────────

function ContributorCard({ row, sparkData, onClick }: {
  row: ContribRow
  sparkData: { month: string; impressions: number }[]
  onClick: () => void
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
      {/* Avatar + name */}
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

      {/* Sparkline */}
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

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[
          { label: 'Articles',    value: String(stats.articleCount)      },
          { label: 'Impressions', value: formatCompact(stats.impressions) },
          { label: 'Avg quality', value: stats.avgEqr.toFixed(1)         },
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

  // Use period-filtered content so Team stats match the selected date range.
  const allContent      = useMemo(() => getPeriodContent(period), [period])
  const allContributors = useMemo(() => getAllContributors(), [])

  // Content with bylines (articles effectively)
  const authoredContent = useMemo(
    () => allContent.filter(i => (i.authorIds?.length ?? 0) > 0),
    [allContent],
  )

  // Apply editorial filters
  const filteredContent = useMemo(() => {
    let items = authoredContent
    if (filterSection) items = items.filter(i => i.section === filterSection)
    if (filterFormat)  items = items.filter(i => i.format  === filterFormat)
    if (filterTopic)   items = items.filter(i => i.topics?.includes(filterTopic))
    return items
  }, [authoredContent, filterSection, filterFormat, filterTopic])

  // Per-contributor stats, sorted by impressions.
  // MIN_SAMPLE guard: exclude contributors with fewer than MIN_SAMPLE pieces —
  // avoids one-off attributions producing misleading quality rates in rankings.
  // EQR = ΣWE ÷ ΣImpressions × 100 (weighted ratio, never mean of per-piece rates).
  const sorted = useMemo((): ContribRow[] =>
    allContributors
      .map((c, idx): ContribRow | null => {
        const cc = filteredContent.filter(item => item.authorIds!.includes(c.id))
        if (cc.length < MIN_SAMPLE) return null   // ← minimum sample guard

        // Primary section — most-published-in
        const secCounts = new Map<string, number>()
        for (const item of cc) {
          if (item.section) secCounts.set(item.section, (secCounts.get(item.section) ?? 0) + 1)
        }
        const primarySection = secCounts.size
          ? ([...secCounts.entries()].sort(([, a], [, b]) => b - a)[0][0] as Section)
          : undefined

        const impressions = cc.reduce((s, x) => s + x.metrics.impressions, 0)
        const we          = cc.reduce((s, x) => s + x.metrics.weightedEngagement, 0)
        // EQR = ΣWE ÷ ΣImpressions × 100 (never mean of per-piece rates)
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

  // Chart 1 — aggregate articles per month
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

  // Per-contributor sparkline data (from filtered content)
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

  // Filter option lists
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

  // ── Drill-in ───────────────────────────────────────────────────────────────
  if (selected) {
    return <ContributorDetail contributor={selected} period={period} onBack={() => setSelected(null)} />
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const chartCard = { border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '18px 20px', backgroundColor: 'var(--color-raised)', marginBottom: 16 } as const
  const chartTitle = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-fainter)', marginBottom: 2 } as const
  const chartSub   = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', marginBottom: 14 } as const
  const axTick     = { fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--color-fainter)' } as const

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 28px 56px' }}>

      {/* Header + filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-page)', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 4px' }}>Team</h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-muted)', margin: 0 }}>
            {sorted.length} contributor{sorted.length !== 1 ? 's' : ''}{hasFilter ? ' · filtered' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {sectionOptions.length > 0 && <FilterDropdown label="Section" options={sectionOptions} value={filterSection} onChange={setFilterSection as (v: string | undefined) => void} />}
          {formatOptions.length  > 0 && <FilterDropdown label="Story type"  options={formatOptions}  value={filterFormat}  onChange={setFilterFormat  as (v: string | undefined) => void} />}
          {topicOptions.length   > 0 && <FilterDropdown label="Topic"   options={topicOptions}   value={filterTopic}   onChange={setFilterTopic} />}
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
          {/* ── Chart 1: Team output trend ───────────────────────────────── */}
          <div style={chartCard}>
            <div style={chartTitle}>Team output</div>
            <div style={chartSub}>Total articles published per month across the team</div>
            {teamTrendData.length < 2 ? (
              /* Can't draw a meaningful trend from a single point — show a stat instead */
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

          {/* ── Chart 2: Top 10 ranked — HTML bars ──────────────────────── */}
          {/* Bars use neutral ink — ranking is a structural comparison, not a       */}
          {/* platform identity or quality signal. Section palette is for identity.  */}
          <div style={chartCard}>
            <div style={chartTitle}>Top contributors</div>
            <div style={chartSub}>Ranked by impressions in this period · showing top 10</div>
            <div>
              {/* Column headers */}
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
                    {/* Rank */}
                    <span style={{ width: 20, textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-fainter)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{i + 1}</span>
                    {/* Avatar */}
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: `1.5px solid ${sectionColor}60`, backgroundColor: contributor.photoUrl ? 'transparent' : avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {contributor.photoUrl
                        ? <img src={contributor.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'white' }}>{initials}</span>
                      }
                    </div>
                    {/* Name */}
                    <span style={{ width: 150, flexShrink: 0, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {contributor.name}
                    </span>
                    {/* Bar — neutral ink, structural comparison only */}
                    <div style={{ flex: 1, height: 6, backgroundColor: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--color-ink)', borderRadius: 3, opacity: 0.7 }} />
                    </div>
                    {/* Impressions */}
                    <span style={{ width: 60, textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', flexShrink: 0 }}>
                      {formatCompact(stats.impressions)}
                    </span>
                    {/* Articles */}
                    <span style={{ width: 64, textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--color-faint)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {stats.articleCount}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Contributor cards ────────────────────────────────────────── */}
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
