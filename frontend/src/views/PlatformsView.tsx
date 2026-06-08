import { useState, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, Cell,
  CartesianGrid, XAxis, YAxis,
  Tooltip as RechartsTip, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Eye, ChartBar, Link, Gauge, FolderOpen, CalendarBlank } from '@phosphor-icons/react'
import {
  getPeriodContent, getLatestFollowersByPlatform,
  getPrevPlatformAggregates, getPrevFollowersByPlatform,
} from '../data/adapter'
import type { Content, Platform } from '../data/types'
import { ContentDetail } from './ContentDetail'
import { Tabs }        from '../components/Tabs'
import { Toggle }      from '../components/Toggle'
import { Chip }        from '../components/Chip'
import { HonestyLabel } from '../components/HonestyLabel'
import { EmptyState }  from '../components/EmptyState'
import { FollowerGrowthChart } from '../components/charts/FollowerGrowthChart'
import { CadenceHeatmap }     from '../components/charts/CadenceHeatmap'
import { Tag }         from '../components/Tag'
import { PlatformBadge, PLATFORM_CONFIG, JOURNEY_PLATFORM_ORDER } from '../components/PlatformBadge'
import { Tooltip, MetricTip } from '../components/Tooltip'
import { METRIC_INFO, CONTENT_TYPE_LABELS, formatDateShort } from '../lib/labels'
import { formatCompact } from '../lib/metrics'

type SubTab      = 'comparison' | 'audience' | 'channels'
type CompMetric  = 'impressions' | 'engagement' | 'eqr' | 'siteClicks'
type LangFilter  = 'all' | 'ar' | 'en'

const COMP_METRIC_OPTIONS = [
  { value: 'impressions' as CompMetric, label: 'Impressions', icon: <Eye      weight="fill" size={13} /> },
  { value: 'engagement'  as CompMetric, label: 'Engagement',  icon: <ChartBar weight="fill" size={13} /> },
  { value: 'eqr'         as CompMetric, label: 'Quality',     icon: <Gauge    weight="fill" size={13} /> },
  { value: 'siteClicks'  as CompMetric, label: 'Site clicks', icon: <Link     weight="fill" size={13} /> },
]

const LANG_OPTIONS = [
  { value: 'all' as LangFilter, label: 'All'     },
  { value: 'ar'  as LangFilter, label: 'Arabic'  },
  { value: 'en'  as LangFilter, label: 'English' },
]


function usePlatformAggregates(lang: LangFilter = 'all', period = 'may-26') {
  return useMemo(() => {
    const all = getPeriodContent(period).filter(c => {
      if (lang === 'all') return true
      return c.language === lang || c.language === 'both'
    })
    const map = new Map<Platform, { impressions: number; we: number; siteClicks: number; posts: number }>()
    for (const c of all) {
      const e = map.get(c.platform) ?? { impressions: 0, we: 0, siteClicks: 0, posts: 0 }
      map.set(c.platform, {
        impressions: e.impressions + c.metrics.impressions,
        we:          e.we          + c.metrics.weightedEngagement,
        siteClicks:  e.siteClicks  + c.metrics.siteClicks,
        posts:       e.posts + 1,
      })
    }
    return new Map([...map.entries()].map(([p, v]) => [p, {
      ...v,
      eqr: v.impressions > 0 ? (v.we / v.impressions) * 100 : 0,
    }]))
  }, [lang, period])
}

function getMetricValue(
  agg: { impressions: number; we: number; eqr: number; siteClicks: number; posts: number },
  metric: CompMetric
): number {
  if (metric === 'impressions') return agg.impressions
  if (metric === 'engagement')  return agg.we
  if (metric === 'eqr')         return agg.eqr
  return agg.siteClicks
}

// ─── Platform bar row ─────────────────────────────────────────────────────────
// Layout: [left: name + post count] [middle: bar + per-post] [right: total + delta]

function PlatformBar({
  platform, value, prevValue, maxValue, posts, prevPosts = 0, isPartial = false,
}: {
  platform: Platform; value: number; prevValue?: number; maxValue: number
  posts: number; prevPosts?: number; isPartial?: boolean
}) {
  const pct         = maxValue > 0 ? (value / maxValue) * 100 : 0
  const { color }   = PLATFORM_CONFIG[platform]
  const perPost     = posts > 0 ? value / posts : 0
  const prevPerPost = prevPosts > 0 && prevValue !== undefined ? prevValue / prevPosts : undefined

  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '150px 1fr 100px',
      gap:                 16,
      alignItems:          'center',
      padding:             '14px 0 10px',
      borderBottom:        '1px solid var(--color-border)',
    }}>

      {/* Left: platform name + post count (close together) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PlatformBadge platform={platform} variant="icon-label" size={14} />
        <div style={{ paddingLeft: 20, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums lining-nums' }}>
            {posts} posts
          </span>
          {prevPosts > 0 && (
            <div style={{ display: 'flex' }}>
              <Chip current={posts} previous={prevPosts} polarity="neutral-volume" />
            </div>
          )}
          {isPartial && <HonestyLabel>partial</HonestyLabel>}
        </div>
      </div>

      {/* Middle: bar (top) + per-post rate (bottom) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ height: 10, borderRadius: 'var(--radius-bar)', overflow: 'hidden', backgroundColor: 'var(--color-border)', marginBottom: 10 }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 'var(--radius-bar)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
            <span style={{ fontVariantNumeric: 'tabular-nums lining-nums', fontWeight: 500, color: 'var(--color-ink)' }}>
              {formatCompact(Math.round(perPost))}
            </span>
            {' '}per post
          </span>
          {prevPerPost !== undefined && prevPerPost > 0 && (
            <div style={{ display: 'flex' }}>
              <Chip current={perPost} previous={prevPerPost} polarity="good-up" />
            </div>
          )}
        </div>
      </div>

      {/* Right: total value + delta chip */}
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-title-section)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1 }}>
          {formatCompact(value)}
        </div>
        {prevValue !== undefined && prevValue > 0 && (
          <div style={{ display: 'flex' }}>
            <Chip current={value} previous={prevValue} polarity="good-up" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Performance tab ──────────────────────────────────────────────────────────

function ComparisonTab({ period }: { period: string }) {
  const [metric, setMetric] = useState<CompMetric>('impressions')
  const [lang,   setLang  ] = useState<LangFilter>('all')
  const aggregates = usePlatformAggregates(lang, period)
  const prevAgg    = getPrevPlatformAggregates()

  const sortedByMetric = useMemo(() => {
    return JOURNEY_PLATFORM_ORDER
      .filter(p => aggregates.has(p))
      .map(p => {
        const agg  = aggregates.get(p)!
        const prev = prevAgg[p]
        return {
          platform:  p,
          value:     getMetricValue(agg, metric),
          prevValue: prev ? getMetricValue({ impressions: prev.impressions, we: prev.we, eqr: prev.impressions > 0 ? prev.we/prev.impressions*100 : 0, siteClicks: prev.siteClicks, posts: prev.posts }, metric) : undefined,
          posts:     agg.posts,
          prevPosts: prev?.posts ?? 0,
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [aggregates, prevAgg, metric])

  const maxValue = Math.max(...sortedByMetric.map(r => r.value), 1)

  const socialsRanking = useMemo(() => {
    return (['facebook', 'instagram', 'x', 'linkedin', 'youtube'] as Platform[])
      .filter(p => aggregates.has(p))
      .map(p => {
        const agg  = aggregates.get(p)!
        const prev = prevAgg[p]
        return { platform: p, value: agg.siteClicks, prevValue: prev?.siteClicks, posts: agg.posts, prevPosts: prev?.posts ?? 0 }
      })
      .sort((a, b) => b.value - a.value)
  }, [aggregates, prevAgg])

  const maxSiteClicks = Math.max(...socialsRanking.map(r => r.value), 1)
  const metricTip = metric === 'impressions' ? METRIC_INFO.impressions
    : metric === 'engagement' ? METRIC_INFO.weighted_engagement
    : metric === 'eqr' ? METRIC_INFO.eqr
    : METRIC_INFO.site_clicks

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 500, color: 'var(--color-ink)', margin: 0 }}>Channel comparison</h3>
          {/* Decision ③: metric toggle + AR/EN segment toggle on this comparison chart */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Toggle options={COMP_METRIC_OPTIONS} value={metric} onChange={setMetric} />
            <Toggle options={LANG_OPTIONS} value={lang} onChange={setLang} />
          </div>
        </div>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tooltip tip={<MetricTip name={metricTip.name} description={metricTip.description} />}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', cursor: 'help', borderBottom: '1px dotted var(--color-border-strong)' }}>
              {metricTip.name}
            </span>
          </Tooltip>
        </div>
        {sortedByMetric.map(({ platform, value, prevValue, posts, prevPosts }) => (
          <PlatformBar key={platform} platform={platform} value={value} prevValue={prevValue} maxValue={maxValue} posts={posts} prevPosts={prevPosts} />
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 500, color: 'var(--color-ink)', margin: 0 }}>Socials → site</h3>
          <Tooltip tip={<MetricTip name={METRIC_INFO.site_clicks.name} description={METRIC_INFO.site_clicks.description} />}>
            <HonestyLabel style={{ cursor: 'help' }}>tracked links only</HonestyLabel>
          </Tooltip>
        </div>
        {socialsRanking.map(({ platform, value, prevValue, posts, prevPosts }) => (
          <PlatformBar key={platform} platform={platform} value={value} prevValue={prevValue} maxValue={maxSiteClicks} posts={posts} prevPosts={prevPosts} isPartial={platform === 'instagram'} />
        ))}
        <div style={{ marginTop: 8, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
          IG link-in-bio attribution pending · group-level only
        </div>
      </div>
    </div>
  )
}

// ─── Audience tab ─────────────────────────────────────────────────────────────

function AudienceTab({ period }: { period?: string }) {
  const followersByPlatform = getLatestFollowersByPlatform()
  const prevFollowers       = getPrevFollowersByPlatform()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 16px 0' }}>
          Current followers
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {JOURNEY_PLATFORM_ORDER.filter(p => followersByPlatform[p]).map(p => {
            const curr = followersByPlatform[p]!
            const prev = prevFollowers[p] ?? 0
            return (
              <div key={p} style={{ backgroundColor: 'var(--color-tile)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PlatformBadge platform={p} variant="icon" size={14} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>{PLATFORM_CONFIG[p].label}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1 }}>
                  {formatCompact(curr)}
                </div>
                {/* Wrap in div so Chip doesn't stretch to full width */}
                {prev > 0 && (
                  <div style={{ display: 'flex' }}>
                    <Chip current={curr} previous={prev} polarity="good-up" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Follower growth stacked area chart */}
      <div className="chart-grow-in" style={{ backgroundColor: 'var(--color-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '20px 24px' }}>
        <FollowerGrowthChart />
      </div>

      {/* Cadence heatmap — CSS Grid, teal ramp */}
      <div className="chart-grow-in" style={{ backgroundColor: 'var(--color-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '20px 24px', animationDelay: '80ms' }}>
        <CadenceHeatmap period={period} />
      </div>
    </div>
  )
}

// ─── Channel content row ──────────────────────────────────────────────────────
// Shows a piece of content with platform-native metrics, not just standardised ones.

function ChannelContentRow({ content, onSelect }: { content: Content; onSelect?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const m = content.metrics
  const isArabic = content.language === 'ar'
  const { Icon } = PLATFORM_CONFIG[content.platform]

  // Platform-native metric set: what makes sense for THIS platform
  const nativeMetrics: { label: string; value: string }[] = (() => {
    switch (content.platform) {
      case 'website':
        return [
          { label: 'Views',     value: formatCompact(m.impressions) },
          { label: 'Avg read',  value: `${m.attentionAvg.toFixed(1)} min` },
          { label: 'EQR',       value: m.engagementQualityRate.toFixed(0) },
        ]
      case 'facebook':
        return [
          { label: 'Impressions', value: formatCompact(m.impressions) },
          { label: 'Reactions',   value: formatCompact(m.reactions)   },
          { label: 'Shares',      value: formatCompact(m.shares)      },
          { label: 'EQR',         value: m.engagementQualityRate.toFixed(1) },
        ]
      case 'instagram':
        return [
          { label: 'Impressions', value: formatCompact(m.impressions) },
          { label: 'Likes',       value: formatCompact(m.reactions)   },
          { label: 'Saves',       value: formatCompact(m.saves)       },
          { label: 'EQR',         value: m.engagementQualityRate.toFixed(1) },
        ]
      case 'x':
        return [
          { label: 'Impressions', value: formatCompact(m.impressions) },
          { label: 'Likes',       value: formatCompact(m.reactions)   },
          { label: 'RT + Quotes', value: formatCompact(m.shares)      },
          { label: 'Bookmarks',   value: formatCompact(m.saves)       },
        ]
      case 'linkedin':
        return [
          { label: 'Impressions', value: formatCompact(m.impressions)        },
          { label: 'Reactions',   value: formatCompact(m.reactions)          },
          { label: 'Clicks',      value: formatCompact(m.clicks)             },
          { label: 'EQR',         value: m.engagementQualityRate.toFixed(1)  },
        ]
      case 'youtube':
        return [
          { label: 'Views',      value: formatCompact(m.impressions)        },
          { label: 'Avg watch',  value: `${m.attentionAvg.toFixed(1)} min`  },
          { label: 'EQR',        value: m.engagementQualityRate.toFixed(0)  },
        ]
      case 'newsletter':
        return [
          { label: 'Opens',      value: formatCompact(m.impressions) },
          { label: 'Clicks',     value: formatCompact(m.clicks)      },
          { label: 'Click rate', value: `${m.engagementQualityRate.toFixed(1)}%` },
        ]
      case 'podcast':
        return [
          { label: 'Streams',    value: formatCompact(m.impressions)       },
          { label: 'Avg listen', value: `${m.attentionAvg.toFixed(0)} min` },
        ]
      default:
        return [{ label: 'Impressions', value: formatCompact(m.impressions) }]
    }
  })()

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:         'flex',
        alignItems:      'center',
        gap:             14,
        padding:         '12px 0',
        borderBottom:    '1px solid var(--color-border)',
        backgroundColor: hovered ? 'rgba(36,31,24,0.025)' : 'transparent',
        transition:      'background-color 120ms ease',
        cursor:          onSelect ? 'pointer' : 'default',
      }}
    >
      {/* Thumbnail */}
      <div style={{ width: 64, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)', backgroundColor: '#F1EAD9', position: 'relative' }}>
        {content.thumbnailUrl ? (
          <img src={content.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon weight="fill" size={20} color="var(--color-fainter)" />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div dir="auto" style={{
          fontFamily:   'var(--font-display)',
          fontSize:     isArabic ? 15 : 'var(--text-title-row)',
          fontWeight:   isArabic ? 600 : 500,
          lineHeight:   isArabic ? 1.5 : 1.35,
          color:        'var(--color-ink)',
          overflow:     'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          marginBottom: 4,
        }}>
          {content.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
            {formatDateShort(content.publishedAt)}
          </span>
          <Tag>{CONTENT_TYPE_LABELS[content.type]}</Tag>
        </div>
      </div>

      {/* Native metrics */}
      <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
        {nativeMetrics.map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-data)', fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums' }}>
              {value}
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Channels tab ─────────────────────────────────────────────────────────────
// Select a channel → see its native-metric breakdown and all its content.
// This shows what Content view loses by standardising everything.

type ChannelSort = 'impressions' | 'engagement' | 'date'

const CHANNEL_SORT_OPTIONS = [
  { value: 'date'        as ChannelSort, label: 'Date',        icon: <CalendarBlank weight="fill" size={13} /> },
  { value: 'impressions' as ChannelSort, label: 'Impressions', icon: <Eye          weight="fill" size={13} /> },
  { value: 'engagement'  as ChannelSort, label: 'Engagement',  icon: <ChartBar     weight="fill" size={13} /> },
]

const CHANNEL_PAGE_SIZE = 30

/** ISO date (YYYY-MM-DD) of the Monday that starts item's week. */
function weekStart(dateStr: string): string {
  const d   = new Date(dateStr.slice(0, 10) + 'T00:00:00Z')
  const dow = d.getUTCDay()  // 0=Sun
  const diff = dow === 0 ? 6 : dow - 1
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().slice(0, 10)
}

function ChannelsTab({ period = 'may-26' }: { period?: string }) {
  const [selected,        setSelected       ] = useState<Platform | null>(null)
  const [sortBy,          setSortBy         ] = useState<ChannelSort>('date')
  const [selectedContent, setSelectedContent] = useState<Content | null>(null)
  const [page,            setPage           ] = useState(1)
  const aggregates = usePlatformAggregates('all', period)

  const channelContent = useMemo(() => {
    if (!selected) return []
    const items = getPeriodContent(period).filter(c => c.platform === selected)
    return [...items].sort((a, b) => {
      if (sortBy === 'engagement')  return b.metrics.weightedEngagement - a.metrics.weightedEngagement
      if (sortBy === 'date')        return b.publishedAt.localeCompare(a.publishedAt)
      return b.metrics.impressions - a.metrics.impressions
    })
  }, [selected, period, sortBy])

  const channelPages = Math.ceil(channelContent.length / CHANNEL_PAGE_SIZE)
  const channelPage  = channelContent.slice((page - 1) * CHANNEL_PAGE_SIZE, page * CHANNEL_PAGE_SIZE)

  // Show ContentDetail inline when a piece is selected
  if (selectedContent) {
    return (
      <ContentDetail
        item={selectedContent}
        onBack={() => setSelectedContent(null)}
      />
    )
  }

  // Platform selection overview + bar chart
  if (!selected) {
    const activePlatforms = JOURNEY_PLATFORM_ORDER.filter(p => aggregates.has(p))
    const maxImpressions  = Math.max(...activePlatforms.map(p => aggregates.get(p)!.impressions))
    const barData = activePlatforms.map(p => ({
      name: PLATFORM_CONFIG[p].label, platform: p,
      value: aggregates.get(p)!.impressions,
      posts: aggregates.get(p)!.posts,
    }))

    return (
      <div>
        {/* Overview bar chart */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '20px 24px', backgroundColor: 'var(--color-raised)', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-fainter)', marginBottom: 14 }}>
            Impressions by channel
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--color-faint)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => formatCompact(v)} tick={{ fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--color-fainter)' }} axisLine={false} tickLine={false} width={44} />
                <RechartsTip
                  formatter={(v: unknown, _: unknown, props: { payload?: { posts?: number } }) => [
                    `${formatCompact(v as number)} impressions · ${props.payload?.posts ?? 0} posts`, 'Total',
                  ]}
                  contentStyle={{ fontFamily: 'var(--font-ui)', fontSize: 11, borderRadius: 6, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-raised)', boxShadow: 'none' }}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {activePlatforms.map(p => (
                    <Cell key={p} fill={PLATFORM_CONFIG[p].color} fillOpacity={0.8}
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setSelected(p); setPage(1) }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ranked rows with inline bar */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', overflow: 'hidden', marginBottom: 16 }}>
          {activePlatforms.map((p, i) => {
            const agg   = aggregates.get(p)!
            const pct   = maxImpressions > 0 ? (agg.impressions / maxImpressions) * 100 : 0
            const { color } = PLATFORM_CONFIG[p]
            return (
              <button
                key={p}
                onClick={() => { setSelected(p); setPage(1) }}
                style={{
                  display: 'grid', gridTemplateColumns: '160px 1fr 180px',
                  gap: 16, alignItems: 'center', padding: '12px 20px', width: '100%',
                  borderBottom: i < activePlatforms.length - 1 ? '1px solid var(--color-border)' : 'none',
                  backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = `${color}08` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
              >
                <PlatformBadge platform={p} variant="icon-label" size={14} />
                <div>
                  <div style={{ height: 6, backgroundColor: 'var(--color-border)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 3, opacity: 0.7 }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
                    {agg.posts} posts · {formatCompact(Math.round(agg.impressions / agg.posts))} avg/post
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-data)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums' }}>{formatCompact(agg.impressions)}</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>impressions</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-data)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums' }}>{formatCompact(agg.we)}</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>engagement</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)', margin: 0 }}>
          Click any row or bar to drill into native metrics and content
        </p>
      </div>
    )
  }

  // Single channel view
  const agg = aggregates.get(selected)!
  const { color } = PLATFORM_CONFIG[selected]

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => setSelected(null)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', color: 'var(--color-muted)', padding: 0, marginBottom: 20 }}
      >
        <ArrowLeft weight="bold" size={14} />
        All channels
      </button>

      {/* Channel header + stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <PlatformBadge platform={selected} variant="icon-label" size={22} />
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Posts',          value: String(agg.posts) },
            { label: 'Impressions',    value: formatCompact(agg.impressions) },
            { label: 'Engagement',     value: formatCompact(agg.we) },
            { label: 'Site clicks',    value: formatCompact(agg.siteClicks) },
            { label: 'Avg per post',   value: formatCompact(Math.round(agg.impressions / agg.posts)) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 2, backgroundColor: color, borderRadius: 1, marginBottom: 20, opacity: 0.5 }} />

      {/* Charts row — alignItems:start so each card is its own natural height */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28, alignItems: 'start' }}>
        {/* Publishing cadence heatmap — filtered to this platform only */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', backgroundColor: 'var(--color-raised)' }}>
          <CadenceHeatmap period={period} platform={selected ?? undefined} />
        </div>

        {/* Per-post impressions trend */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', backgroundColor: 'var(--color-raised)' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-fainter)', marginBottom: 14 }}>
            Impressions per post — trend
          </div>
          {(() => {
            // Group by week-start (Monday) using the UTC-safe weekStart() helper
            const byWeek = new Map<string, { total: number; posts: number }>()
            for (const item of channelContent) {
              const wk = weekStart(item.publishedAt)
              const e  = byWeek.get(wk) ?? { total: 0, posts: 0 }
              byWeek.set(wk, { total: e.total + item.metrics.impressions, posts: e.posts + 1 })
            }
            const trendData = [...byWeek.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([wk, { total, posts }]) => {
                const d    = new Date(wk + 'T00:00:00Z')
                const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
                return { wk: label, avg: Math.round(total / posts) }
              })

            if (trendData.length < 2) return (
              <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
                Not enough data
              </div>
            )
            return (
              <div style={{ height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="wk" tick={{ fontFamily: 'var(--font-ui)', fontSize: 10, fill: 'var(--color-fainter)' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v: number) => formatCompact(v)} tick={{ fontFamily: 'var(--font-ui)', fontSize: 10, fill: 'var(--color-fainter)' }} axisLine={false} tickLine={false} width={36} />
                    <RechartsTip
                      formatter={(v: unknown) => [formatCompact(v as number), 'Avg / post']}
                      contentStyle={{ fontFamily: 'var(--font-ui)', fontSize: 11, borderRadius: 6, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-raised)', boxShadow: 'none' }}
                    />
                    <Line type="monotone" dataKey="avg" stroke={color} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Content from this channel */}
      {channelContent.length === 0 ? (
        <EmptyState
          icon={<FolderOpen weight="fill" size={28} />}
          title={`No ${PLATFORM_CONFIG[selected].label} content yet`}
          body="Content from this channel will appear here once data is connected."
          padding="40px 24px"
        />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
              {channelContent.length} pieces · native {PLATFORM_CONFIG[selected].label} metrics
              {channelPages > 1 && ` · page ${page} of ${channelPages}`}
            </div>
            <Toggle options={CHANNEL_SORT_OPTIONS} value={sortBy} onChange={(v) => { setSortBy(v); setPage(1) }} />
          </div>
          {channelPage.map(item => (
            <ChannelContentRow key={item.id} content={item} onSelect={() => setSelectedContent(item)} />
          ))}
          {/* Pagination */}
          {channelPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ height: 30, padding: '0 14px', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-raised)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: page === 1 ? 'var(--color-fainter)' : 'var(--color-ink)', cursor: page === 1 ? 'default' : 'pointer' }}>
                ← Prev
              </button>
              {Array.from({ length: Math.min(7, channelPages) }, (_, i) => {
                const p = channelPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= channelPages - 3 ? channelPages - 6 + i : page - 3 + i
                return (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ width: 30, height: 30, border: `1px solid ${p === page ? 'var(--color-ink)' : 'var(--color-border)'}`, borderRadius: 6, background: p === page ? 'var(--color-ink)' : 'var(--color-raised)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: p === page ? 'var(--color-paper)' : 'var(--color-muted)', cursor: 'pointer', fontWeight: p === page ? 600 : 400 }}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(channelPages, p + 1))} disabled={page === channelPages}
                style={{ height: 30, padding: '0 14px', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-raised)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: page === channelPages ? 'var(--color-fainter)' : 'var(--color-ink)', cursor: page === channelPages ? 'default' : 'pointer' }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Platforms view ───────────────────────────────────────────────────────────

export function PlatformsView({ period = 'may-26' }: { period?: string }) {
  const [tab, setTab] = useState<SubTab>('comparison')

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 28px 56px' }}>
      <div style={{ marginBottom: 32 }}>
        <Tabs
          options={[
            { value: 'comparison' as SubTab, label: 'Comparison'  },
            { value: 'audience'   as SubTab, label: 'Audience'    },
            { value: 'channels'   as SubTab, label: 'Channels'    },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'comparison' && <ComparisonTab period={period} />}
      {tab === 'audience'   && <AudienceTab period={period} />}
      {tab === 'channels'   && <ChannelsTab period={period} />}
    </div>
  )
}
