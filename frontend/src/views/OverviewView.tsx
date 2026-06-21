import { useMemo, useState } from 'react'
import { Eye, ChartBar, Link, Users, Clock } from '@phosphor-icons/react'
import {
  getCurrentPeriodTotals, getPreviousPeriodTotals,
  getTopicSummaries, getSeriesSummaries, getStoriesForPeriod,
  getContentByStory, getAllContributors, hasSufficientFollowerHistory,
} from '../data/adapter'
import type { Story, Contributor } from '../data/types'
import { KpiTile }                from '../components/KpiTile'
import { Card }                  from '../components/Card'
import { Toggle }                from '../components/Toggle'
import { PlatformBadge, JOURNEY_PLATFORM_ORDER } from '../components/PlatformBadge'
import { Tooltip, MetricTip }    from '../components/Tooltip'
import { FormatPerformanceChart } from '../components/charts/FormatPerformanceChart'
import { VelocityChart }         from '../components/charts/VelocityChart'
import { METRIC_INFO, formatDateSpan } from '../lib/labels'
import { formatCompact, formatMinutes } from '../lib/metrics'
import { TEAL_RAMP } from '../lib/chartData'

interface OverviewViewProps {
  period?:           string
  onSelectStory?:    (id: string) => void
  onSelectPlatform?: (platform?: string) => void
}

// NOTE: these are computed inside the component (useMemo) so they run after
// initAdapter() populates the cache — not at module load time on sample data.

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2 style={{
      fontFamily:   'var(--font-display)',
      fontSize:     'var(--text-title-section)',
      fontWeight:   500,
      color:        'var(--color-ink)',
      margin:       '0 0 16px 0',
      ...style,
    }}>
      {children}
    </h2>
  )
}

// ─── Top topics / series ──────────────────────────────────────────────────────

const LIST_TOGGLE = [
  { value: 'topics' as const,  label: 'Topics'  },
  { value: 'series' as const,  label: 'Series'  },
]

function TopTopicsCard({ period }: { period?: string }) {
  const [view, setView] = useState<'topics' | 'series'>('topics')

  const topicRows = getTopicSummaries(5, period)
  const seriesRows = getSeriesSummaries(5, period)

  const rows: Array<{ label: string; we: number }> = view === 'topics'
    ? topicRows.map(t => ({ label: t.topic, we: t.weightedEngagement }))
    : seriesRows.map(s => ({ label: s.series, we: s.weightedEngagement }))

  const maxWE = Math.max(...rows.map(r => r.we), 1)

  return (
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <SectionTitle style={{ margin: 0 }}>Top {view} this period</SectionTitle>
        <Toggle options={LIST_TOGGLE} value={view} onChange={setView} />
      </div>

      {rows.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-muted)', padding: '20px 0' }}>
          No {view} data for this period.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
          {rows.map((row, i) => (
            <div
              key={row.label}
              style={{
                display:             'grid',
                gridTemplateColumns: '20px 1fr 56px 60px',
                alignItems:          'center',
                gap:                 10,
                padding:             '10px 0',
                borderBottom:        i < rows.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-fainter)', textAlign: 'center' }}>
                {i + 1}
              </span>
              <div
                dir="auto"
                style={{
                  fontFamily:   'var(--font-ui)',
                  fontSize:     'var(--text-body)',
                  color:        'var(--color-ink)',
                  overflow:     'hidden',
                  whiteSpace:   'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {row.label}
              </div>
              {/* Teal rank bar — deliberate override of neutral-ink rule for ranked lists */}
              <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'var(--color-border)' }}>
                <div style={{
                  width:           `${(row.we / maxWE) * 100}%`,
                  height:          '100%',
                  backgroundColor: TEAL_RAMP[Math.min(i + 1, TEAL_RAMP.length - 1)],
                  borderRadius:    3,
                }} />
              </div>
              <span style={{
                fontFamily:         'var(--font-ui)',
                fontSize:           'var(--text-data)',
                fontWeight:         500,
                color:              'var(--color-ink)',
                fontVariantNumeric: 'tabular-nums lining-nums',
                textAlign:          'right',
              }}>
                {formatCompact(row.we)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
        Ranked by Weighted Engagement · publish cohort
      </div>
    </Card>
  )
}

// ─── Individual performer row (proper component — hooks allowed here) ─────────

function PerformerRow({
  story, rank, rankBy, onSelect,
}: {
  story: Story
  rank: number
  rankBy: 'we' | 'eqr'
  onSelect?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const members = getContentByStory(story.id)

  const platforms = useMemo(() => {
    const seen = new Set<string>()
    return JOURNEY_PLATFORM_ORDER.filter(p => {
      const has = members.some(c => c.platform === p)
      if (has && !seen.has(p)) { seen.add(p); return true }
      return false
    })
  }, [story.id])

  // Deduplicated contributors across all article members
  const contributors = useMemo((): Contributor[] => {
    const allContribs = getAllContributors()
    const seen = new Map<string, Contributor>()
    for (const m of members) {
      for (const id of m.authorIds ?? []) {
        const c = allContribs.find(x => x.id === id)
        if (c) seen.set(c.id, c)
      }
    }
    return [...seen.values()]
  }, [story.id])

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:         'flex',
        alignItems:      'center',
        gap:             12,
        padding:         '12px 0',
        borderBottom:    `1px solid var(--color-border)`,
        cursor:          onSelect ? 'pointer' : 'default',
        transition:      'background-color 140ms ease',
        backgroundColor: hovered && onSelect ? 'rgba(36,31,24,0.025)' : 'transparent',
        borderRadius:    hovered && onSelect ? 8 : 0,
        marginLeft:      hovered && onSelect ? -10 : 0,
        paddingLeft:     hovered && onSelect ? 10 : 0,
      }}
    >
      {/* Rank */}
      <span style={{
        fontFamily:  'var(--font-display)',
        fontSize:    'var(--text-data)',
        fontWeight:  500,
        color:       'var(--color-fainter)',
        width:       20,
        textAlign:   'center',
        flexShrink:  0,
      }}>
        {rank}
      </span>

      {/* Square thumb */}
      <div style={{
        width:           44,
        height:          44,
        borderRadius:    6,
        overflow:        'hidden',
        flexShrink:      0,
        border:          '1px solid var(--color-border)',
        backgroundColor: '#F1EAD9',
      }}>
        {story.thumbnailUrl
          ? <img src={story.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-border-strong)' }}>م</span>
            </div>
        }
      </div>

      {/* Title + platform dots + contributors */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          dir="auto"
          style={{
            fontFamily:   'var(--font-display)',
            fontSize:     'var(--text-title-row)',
            fontWeight:   500,
            color:        'var(--color-ink)',
            overflow:     'hidden',
            whiteSpace:   'nowrap',
            textOverflow: 'ellipsis',
            marginBottom: 4,
          }}
        >
          {story.title}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {platforms.map(p => <PlatformBadge key={p} platform={p} variant="icon-sm" />)}
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)', marginLeft: 2 }}>
            {formatDateSpan(story.publishedFirst, story.publishedLast)}
          </span>
          {contributors.length > 0 && (
            <>
              <span style={{ color: 'var(--color-border-strong)' }}>·</span>
              {contributors.slice(0, 2).map(c => {
                const initials = c.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
                return (
                  <div key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', backgroundColor: c.photoUrl ? 'transparent' : 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>
                      {c.photoUrl
                        ? <img src={c.photoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 7, fontWeight: 700, color: 'var(--color-paper)' }}>{initials}</span>
                      }
                    </div>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{c.name}</span>
                  </div>
                )
              })}
              {contributors.length > 2 && (
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-fainter)' }}>+{contributors.length - 2}</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Metrics: Impressions (primary) + WE or EQR (secondary) */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{
          fontFamily:         'var(--font-display)',
          fontSize:           'var(--text-title-section)',
          fontWeight:         600,
          color:              'var(--color-ink)',
          fontVariantNumeric: 'tabular-nums lining-nums',
          lineHeight:         1,
          marginBottom:       3,
        }}>
          {formatCompact(story.rollup.impressions)}
        </div>
        <Tooltip tip={<MetricTip name={METRIC_INFO.impressions.name} description={METRIC_INFO.impressions.description} />}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', cursor: 'help', borderBottom: '1px dotted var(--color-border-strong)' }}>
            Impressions
          </span>
        </Tooltip>
        {rankBy === 'eqr' ? (
          <div style={{ marginTop: 4, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums lining-nums', whiteSpace: 'nowrap' }}>
            Quality rate {story.rollup.eqr != null ? story.rollup.eqr.toFixed(1) : '—'}
          </div>
        ) : (
          <div style={{ marginTop: 4, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums lining-nums', whiteSpace: 'nowrap' }}>
            Engagement {formatCompact(story.rollup.weightedEngagement)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Top performers ───────────────────────────────────────────────────────────

const RANK_OPTIONS = [
  { value: 'we'  as const, label: 'Engagement' },
  { value: 'eqr' as const, label: 'Quality'    },
]

function TopPerformersCard({ period, onSelectStory }: { period?: string; onSelectStory?: (id: string) => void }) {
  const [rankBy, setRankBy] = useState<'we' | 'eqr'>('we')

  const stories = useMemo(() => {
    const base = period ? getStoriesForPeriod(period) : []
    const sorted = [...base].sort((a, b) =>
      rankBy === 'eqr'
        ? (b.rollup.eqr ?? 0) - (a.rollup.eqr ?? 0)
        : b.rollup.weightedEngagement - a.rollup.weightedEngagement,
    )
    return sorted.slice(0, 5)
  }, [period, rankBy])

  return (
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <SectionTitle style={{ margin: 0 }}>Top performers this period</SectionTitle>
        <Toggle options={RANK_OPTIONS} value={rankBy} onChange={setRankBy} />
      </div>
      {stories.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-muted)', padding: '20px 0' }}>
          No stories found for this period.
        </div>
      ) : (
        stories.map((story, i) => (
          <PerformerRow
            key={story.id}
            story={story}
            rank={i + 1}
            rankBy={rankBy}
            onSelect={onSelectStory ? () => onSelectStory(story.id) : undefined}
          />
        ))
      )}
      <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
        Ranked by {rankBy === 'eqr' ? 'engagement quality (weighted engagement ÷ impressions)' : 'weighted engagement'} · publish cohort
      </div>
    </Card>
  )
}

// ─── Overview view ────────────────────────────────────────────────────────────

export function OverviewView({ period, onSelectStory }: OverviewViewProps) {
  // Recomputed whenever period changes (or on first render after cache warms).
  const current  = useMemo(() => getCurrentPeriodTotals(period),  [period])
  const previous = useMemo(() => getPreviousPeriodTotals(period), [period])
  // Followers delta is only meaningful with >= 2 snapshots per platform.
  const followerDeltaValid = useMemo(() => hasSufficientFollowerHistory(), [])

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 28px 56px' }}>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 40 }}>
        <KpiTile label="Impressions"         icon={<Eye weight="fill" size={14} />} value={formatCompact(current.impressions)}            current={current.impressions}          previous={previous.impressions}                              polarity="good-up" />
        <KpiTile label="Weighted Engagement" icon={<ChartBar weight="fill" size={14} />} value={formatCompact(current.weightedEngagement)} current={current.weightedEngagement}   previous={previous.weightedEngagement}                       polarity="good-up" />
        <KpiTile label="Clicks to Site"      icon={<Link weight="fill" size={14} />} value={formatCompact(current.siteClicks)}             current={current.siteClicks}           previous={previous.siteClicks}                               polarity="good-up" />
        <KpiTile label="Total Followers"     icon={<Users weight="fill" size={14} />} value={formatCompact(current.followerTotal)}         current={current.followerTotal}        previous={followerDeltaValid ? previous.followerTotal : null} polarity="good-up" />
        <KpiTile label="Attention"           icon={<Clock weight="fill" size={14} />} value={formatMinutes(current.attentionTotalMinutes)} current={current.attentionTotalMinutes} previous={previous.attentionTotalMinutes}                   polarity="good-up" />
      </div>

      {/* Format performance hero — chart-grow-in for §12 motion */}
      <div
        className="chart-grow-in"
        style={{
          backgroundColor: 'var(--color-raised)',
          border:          '1px solid var(--color-border)',
          borderRadius:    'var(--radius-card)',
          padding:         '20px 24px',
          marginBottom:    24,
        }}
      >
        <FormatPerformanceChart period={period} />
      </div>

      {/* Publishing velocity */}
      <div
        className="chart-grow-in"
        style={{
          backgroundColor: 'var(--color-raised)',
          border:          '1px solid var(--color-border)',
          borderRadius:    'var(--radius-card)',
          padding:         '20px 24px',
          marginBottom:    40,
          animationDelay:  '60ms',
        }}
      >
        <VelocityChart period={period} />
      </div>

      {/* Two-column lower section — alignItems: stretch so both cards fill the row height */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 24, alignItems: 'stretch' }}>
        <TopTopicsCard period={period} />
        <TopPerformersCard period={period} onSelectStory={onSelectStory} />
      </div>
    </div>
  )
}
