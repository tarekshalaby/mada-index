// Reports view — funder-ready, de-duplicated, exportable totals.
// Uses the global period from the PeriodBar (no internal period picker — no redundancy).
// Sections:
//   1. Reach & Engagement — 3 KPIs + impression mix
//   2. Top stories — ranked by WE, the clearest editorial signal
//   3. Platform breakdown — per-platform post/reach/engagement table
//   4. Content mix — article/social/video/newsletter/podcast counts
//   5. Audience — current follower totals
//   6. Campaign performance — aggregate by topic, ready for grant narrative

import { useState, useMemo } from 'react'
import { DownloadSimple, Printer, Eye, ChartBar, Clock, Users, ArrowRight } from '@phosphor-icons/react'
import {
  getPeriodContent, getStoriesForPeriod, getContentByStory,
  getLatestFollowersByPlatform,
  getCurrentPeriodTotals, getPreviousPeriodTotals,
} from '../data/adapter'
import type { Platform } from '../data/types'
import type { Period }   from '../components/DateRangeControl'
import { Button }        from '../components/Button'
import { FilterDropdown } from '../components/FilterDropdown'
import { Chip }          from '../components/Chip'
import { HonestyLabel }  from '../components/HonestyLabel'
import { Tooltip, MetricTip } from '../components/Tooltip'
import { Tag }           from '../components/Tag'
import { PLATFORM_CONFIG, JOURNEY_PLATFORM_ORDER } from '../components/PlatformBadge'
import { METRIC_INFO, FORMAT_LABELS, formatDateSpan } from '../lib/labels'
import { formatCompact, formatMinutes } from '../lib/metrics'

// ─── Period label lookup ──────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  '7d':     'Last 7 days',
  '30d':    'Last 30 days',
  '90d':    'Last 90 days',
  'may-26': 'May 2026',
  'apr-26': 'April 2026',
  'mar-26': 'March 2026',
  'q2-26':  'Q2 2026 (Apr – Jun)',
  'q1-26':  'Q1 2026 (Jan – Mar)',
  'h1-26':  'H1 2026 (Jan – Jun)',
  'year-26':'Full year 2026',
}

// ─── Data aggregation ─────────────────────────────────────────────────────────

function useTotals(period: string) {
  const current  = getCurrentPeriodTotals(period)
  const previous = getPreviousPeriodTotals(period)
  const content  = getPeriodContent(period)
  const impressions      = content.reduce((s, c) => s + c.metrics.impressions, 0)
  const weightedEng      = content.reduce((s, c) => s + c.metrics.weightedEngagement, 0)
  const attentionMinutes = content.reduce((s, c) => s + c.metrics.watchReadMinutes, 0)
  const byPlatform: Partial<Record<Platform, number>> = {}
  for (const c of content) byPlatform[c.platform] = (byPlatform[c.platform] ?? 0) + c.metrics.impressions
  return { impressions, weightedEng, attentionMinutes, byPlatform, current, previous }
}

// ─── Impression mix stacked bar ───────────────────────────────────────────────

function ImpressionMix({ byPlatform, total }: { byPlatform: Partial<Record<Platform, number>>; total: number }) {
  const segments = JOURNEY_PLATFORM_ORDER
    .filter(p => (byPlatform[p] ?? 0) > 0)
    .map(p => ({ platform: p, pct: total > 0 ? (byPlatform[p]! / total) * 100 : 0, n: byPlatform[p]! }))

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
        {segments.map(({ platform, pct }) => (
          <div
            key={platform}
            title={`${PLATFORM_CONFIG[platform].label}: ${pct.toFixed(1)}%`}
            style={{ flex: `0 0 ${pct}%`, backgroundColor: PLATFORM_CONFIG[platform].color, minWidth: pct > 0.5 ? undefined : 0 }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px' }}>
        {segments.map(({ platform, pct, n }) => (
          <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: PLATFORM_CONFIG[platform].color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>
              {PLATFORM_CONFIG[platform].label}
            </span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)', fontVariantNumeric: 'tabular-nums lining-nums' }}>
              {pct.toFixed(1)}% · {formatCompact(n)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Report section wrapper ───────────────────────────────────────────────────

function ReportSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 28, marginTop: 28 }}>
      <div style={{
        fontFamily:    'var(--font-ui)',
        fontSize:      'var(--text-caption)',
        fontWeight:    600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color:         'var(--color-fainter)',
        marginBottom:  20,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ─── KPI metric block ─────────────────────────────────────────────────────────

function ReportKPI({ icon, label, value, description, current, previous, tipKey }: {
  icon: React.ReactNode; label: string; value: string; description?: string
  current: number; previous: number; tipKey: keyof typeof METRIC_INFO
}) {
  const tip = METRIC_INFO[tipKey]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <Tooltip tip={<MetricTip name={tip.name} description={tip.description} />}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-faint)', cursor: 'help', borderBottom: '1px dotted var(--color-border-strong)' }}>
          {icon} {label}
        </div>
      </Tooltip>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-xl)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {description && (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', fontStyle: 'italic' }}>
          {description}
        </div>
      )}
      <div style={{ display: 'flex' }}>
        <Chip current={current} previous={previous} polarity="good-up" />
      </div>
    </div>
  )
}

// ─── Reports view ─────────────────────────────────────────────────────────────

interface ReportsViewProps {
  period?: Period
  onSelectStory?: (id: string) => void
}

export function ReportsView({ period = 'may-26', onSelectStory }: ReportsViewProps) {
  const [filterTopic, setFilterTopic] = useState<string | undefined>()

  const { impressions, weightedEng, attentionMinutes, byPlatform, current, previous } = useTotals(period)

  const followersByPlatform = getLatestFollowersByPlatform()
  const totalFollowers      = Object.values(followersByPlatform).reduce((s, n) => s + (n ?? 0), 0)

  const allStories = useMemo(() => getStoriesForPeriod(period), [period])
  const allContent = useMemo(() => getPeriodContent(period),    [period])

  const topics = useMemo(() => {
    const set = new Set<string>()
    for (const s of allStories) s.topics?.forEach(t => set.add(t))
    return [...set]
  }, [allStories])

  // Top 5 stories by WE
  const topStories = useMemo(() => allStories.slice(0, 5), [allStories])

  // Per-platform aggregates for breakdown table
  const platformRows = useMemo(() => {
    const map = new Map<Platform, { posts: number; impressions: number; we: number; siteClicks: number }>()
    for (const c of allContent) {
      const e = map.get(c.platform) ?? { posts: 0, impressions: 0, we: 0, siteClicks: 0 }
      map.set(c.platform, {
        posts:       e.posts + 1,
        impressions: e.impressions + c.metrics.impressions,
        we:          e.we          + c.metrics.weightedEngagement,
        siteClicks:  e.siteClicks  + c.metrics.siteClicks,
      })
    }
    return JOURNEY_PLATFORM_ORDER
      .filter(p => map.has(p))
      .map(p => ({ platform: p, ...map.get(p)! }))
      .sort((a, b) => b.impressions - a.impressions)
  }, [allContent])

  // Content type mix
  const contentMix = useMemo(() => {
    const groups: { label: string; count: number; color: string }[] = [
      { label: 'Articles',   color: '#2F7D63', count: allContent.filter(c => c.type === 'article').length },
      { label: 'Social',     color: '#3B6D11', count: allContent.filter(c => ['facebook-post','ig-post','ig-story','x-post','linkedin-post'].includes(c.type)).length },
      { label: 'Video',      color: '#C0392B', count: allContent.filter(c => c.type === 'youtube-video').length },
      { label: 'Newsletter', color: '#F9A825', count: allContent.filter(c => c.type === 'newsletter').length },
      { label: 'Podcast',    color: '#6D4C41', count: allContent.filter(c => c.type === 'podcast-episode').length },
    ].filter(g => g.count > 0)
    const total = groups.reduce((s, g) => s + g.count, 0)
    return { groups, total }
  }, [allContent])

  // Campaign aggregate
  const topicAggregate = useMemo(() => {
    if (!filterTopic) return null
    const stories = allStories.filter(s => s.topics?.includes(filterTopic))
    return {
      impressions: stories.reduce((s, x) => s + x.rollup.impressions, 0),
      we:          stories.reduce((s, x) => s + x.rollup.weightedEngagement, 0),
      pieces:      stories.length,
      platforms:   [...new Set(stories.flatMap(s =>
        getContentByStory(s.id).map(c => c.platform)
      ))].length,
    }
  }, [filterTopic, allStories])

  const periodLabel = PERIOD_LABELS[period] ?? 'Selected period'

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '36px 28px 64px' }}>

      {/* Report header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-page)', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 6px' }}>
            Reports
          </h1>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-muted)' }}>
            {periodLabel}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon={<DownloadSimple weight="fill" size={14} />}
            onClick={() => {
              // Build CSV from the period content
              const rows: string[][] = [
                ['Title', 'Platform', 'Published', 'Format', 'Impressions', 'Weighted Engagement', 'EQR', 'Site Clicks'],
              ]
              for (const c of allContent) {
                rows.push([
                  `"${c.title.replace(/"/g, '""')}"`,
                  c.platform,
                  c.publishedAt.slice(0, 10),
                  c.format ?? '',
                  String(c.metrics.impressions),
                  String(Math.round(c.metrics.weightedEngagement)),
                  c.metrics.engagementQualityRate.toFixed(1),
                  String(c.metrics.siteClicks),
                ])
              }
              const csv  = rows.map(r => r.join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url  = URL.createObjectURL(blob)
              const a    = document.createElement('a')
              a.href     = url
              a.download = `mada-index-${period}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Export CSV
          </Button>
          <Button
            variant="icon"
            icon={<Printer weight="fill" size={16} />}
            aria-label="Print-friendly view"
            onClick={() => window.print()}
          />
        </div>
      </div>

      {/* ── 1. Reach & Engagement ────────────────────────────────────────── */}
      <ReportSection label="Reach & Engagement">
        <div style={{ display: 'flex', gap: '20px 48px', flexWrap: 'wrap', marginBottom: 0 }}>
          <ReportKPI
            icon={<Eye weight="fill" size={14} />}
            label="Impressions"
            value={formatCompact(impressions)}
            current={current.impressions}
            previous={previous.impressions}
            tipKey="impressions"
          />
          <ReportKPI
            icon={<ChartBar weight="fill" size={14} />}
            label="Weighted Engagement"
            value={formatCompact(weightedEng)}
            current={current.weightedEngagement}
            previous={previous.weightedEngagement}
            tipKey="weighted_engagement"
          />
          <ReportKPI
            icon={<Clock weight="fill" size={14} />}
            label="Attention"
            value={formatMinutes(attentionMinutes)}
            description="time spent with our work"
            current={current.attentionTotalMinutes}
            previous={previous.attentionTotalMinutes}
            tipKey="attention"
          />
        </div>
        <ImpressionMix byPlatform={byPlatform} total={impressions} />
      </ReportSection>

      {/* ── 2. Top stories ───────────────────────────────────────────────── */}
      <ReportSection label="Top stories">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {topStories.map((story, i) => (
            <div
              key={story.id}
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           12,
                padding:       '12px 0',
                borderBottom:  '1px solid var(--color-border)',
              }}
            >
              {/* Rank */}
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 600, color: 'var(--color-border-strong)', fontVariantNumeric: 'tabular-nums lining-nums', width: 20, flexShrink: 0, textAlign: 'right' }}>
                {i + 1}
              </div>

              {/* Thumbnail */}
              {story.thumbnailUrl && (
                <div style={{ width: 52, height: 52, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)' }}>
                  <img src={story.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              )}

              {/* Title + tags */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div dir="auto" style={{
                  fontFamily:      'var(--font-display)',
                  fontSize:        'var(--text-title-row)',
                  fontWeight:      600,
                  color:           'var(--color-ink)',
                  lineHeight:      1.4,
                  marginBottom:    5,
                  overflow:        'hidden',
                  display:         '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {story.title}
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                  {story.format  && <Tag>{FORMAT_LABELS[story.format]}</Tag>}
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
                    {formatDateSpan(story.publishedFirst, story.publishedLast)} · {story.rollup.platformCount} platforms
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1, marginBottom: 3 }}>
                    {formatCompact(story.rollup.impressions)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>impressions</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1, marginBottom: 3 }}>
                    {formatCompact(story.rollup.weightedEngagement)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>engagement</div>
                </div>
              </div>

              {/* View story CTA */}
              {onSelectStory && (
                <button
                  onClick={() => onSelectStory(story.id)}
                  title="View in Stories"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-fainter)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0, borderRadius: 4, transition: 'color 120ms ease' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-ink)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-fainter)'}
                >
                  <ArrowRight weight="bold" size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
          Story-level rollups · ranked by Weighted Engagement
        </div>
      </ReportSection>

      {/* ── 3. Platform breakdown ─────────────────────────────────────────── */}
      <ReportSection label="Platform breakdown">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Platform', 'Posts', 'Impressions', 'Engagement', 'Site Clicks'].map((h, i) => (
                  <th key={h} style={{
                    fontFamily:    'var(--font-ui)',
                    fontSize:      'var(--text-caption)',
                    fontWeight:    600,
                    color:         'var(--color-fainter)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    textAlign:     i === 0 ? 'left' : 'right',
                    padding:       '6px 8px 10px',
                    borderBottom:  '2px solid var(--color-border)',
                    whiteSpace:    'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {platformRows.map(row => (
                <tr key={row.platform}>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: PLATFORM_CONFIG[row.platform].color, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-ink)' }}>
                        {PLATFORM_CONFIG[row.platform].label}
                      </span>
                    </div>
                  </td>
                  {[row.posts, row.impressions, row.we, row.siteClicks].map((v, i) => (
                    <td key={i} style={{ padding: '10px 8px', borderBottom: '1px solid var(--color-border)', textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', fontWeight: 500, color: v > 0 ? 'var(--color-ink)' : 'var(--color-fainter)', fontVariantNumeric: 'tabular-nums lining-nums' }}>
                      {v > 0 ? (i === 0 ? v : formatCompact(v)) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>

      {/* ── 4. Content mix ───────────────────────────────────────────────── */}
      <ReportSection label="Content mix">
        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, marginBottom: 14 }}>
          {contentMix.groups.map(g => (
            <div
              key={g.label}
              title={`${g.label}: ${g.count}`}
              style={{ flex: g.count, backgroundColor: g.color, minWidth: g.count > 0 ? 2 : 0 }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 20px' }}>
          {contentMix.groups.map(g => (
            <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: g.color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>{g.label}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums' }}>
                {g.count} <span style={{ fontWeight: 400, color: 'var(--color-fainter)' }}>({Math.round(g.count / contentMix.total * 100)}%)</span>
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
          {contentMix.total} pieces total · each counted once
        </div>
      </ReportSection>

      {/* ── 5. Audience ──────────────────────────────────────────────────── */}
      <ReportSection label="Audience">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', color: 'var(--color-faint)', marginBottom: 6 }}>
              <Users weight="fill" size={14} />
              Total followers
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1, letterSpacing: '-0.01em', marginBottom: 8 }}>
              {formatCompact(totalFollowers)}
            </div>
            <div style={{ display: 'flex' }}>
              <Chip current={totalFollowers} previous={previous.followerTotal} polarity="good-up" />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
          {JOURNEY_PLATFORM_ORDER.filter(p => followersByPlatform[p]).map(p => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: PLATFORM_CONFIG[p].color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>
                {PLATFORM_CONFIG[p].label}
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-ink)', fontWeight: 500, fontVariantNumeric: 'tabular-nums lining-nums' }}>
                {formatCompact(followersByPlatform[p]!)}
              </span>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* ── 6. Campaign performance ───────────────────────────────────────── */}
      <ReportSection label="Campaign performance">
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-muted)', margin: '0 0 16px' }}>
          Select a topic or campaign to pull aggregate numbers — ready to drop into a grant narrative.
        </p>

        <FilterDropdown
          label="Topic"
          options={topics.map(t => ({ value: t, label: t }))}
          value={filterTopic}
          onChange={setFilterTopic as (v: string | undefined) => void}
        />

        {filterTopic && topicAggregate && (
          <div style={{ marginTop: 20, padding: '20px 24px', backgroundColor: 'var(--color-tile)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div dir="auto" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-item)', fontWeight: 600, color: 'var(--color-ink)' }}>
                {filterTopic}
              </div>
              <HonestyLabel>story-level · de-duped</HonestyLabel>
            </div>
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              {[
                { label: 'Impressions',         value: formatCompact(topicAggregate.impressions) },
                { label: 'Weighted Engagement', value: formatCompact(topicAggregate.we)          },
                { label: 'Stories',             value: String(topicAggregate.pieces)             },
                { label: 'Platforms',           value: String(topicAggregate.platforms)          },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1, letterSpacing: '-0.01em' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ReportSection>

    </div>
  )
}
