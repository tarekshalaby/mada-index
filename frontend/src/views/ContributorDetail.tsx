// Individual contributor profile.
//
// DATA FACTS:
// • Attribution is article-only (GA4 pageviews = impressions).
// • No per-piece time-series — the only honest monthly data is article count from publishedAt.
// • EQR = ΣWE ÷ ΣImpressions × 100 (weighted ratio, never mean of per-piece rates).
// • KPI tile benchmark bars: percentile rank among all contributors in the same period.
// • Article table quintile underlines: rank within this contributor's own portfolio.

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Eye, ChartBar, Gauge, Article as ArticleIcon } from '@phosphor-icons/react'
import type { Contributor, Content, Format } from '../data/types'
import { getPeriodContent, getAllContributors } from '../data/adapter'
import { ContentDetail }      from './ContentDetail'
import { PLATFORM_CONFIG }    from '../components/PlatformBadge'
import { Tag }                from '../components/Tag'
import { HonestyLabel }       from '../components/HonestyLabel'
import { formatCompact, computePercentileRank } from '../lib/metrics'
import { FORMAT_LABELS, CONTENT_TYPE_LABELS, formatDateShort } from '../lib/labels'

// ─── Quintile colour scale ─────────────────────────────────────────────────────
// Same 5-band scale used everywhere in the dashboard.
function quintileColor(pct: number): string {
  if (pct >= 80) return '#22C55E'
  if (pct >= 60) return '#84CC16'
  if (pct >= 40) return '#F59E0B'
  if (pct >= 20) return '#F97316'
  return '#EF4444'
}

const MONTH_ABBR: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

// ─── Language pill ─────────────────────────────────────────────────────────────
function LangPill({ lang }: { lang: string }) {
  const label = lang === 'ar' ? 'AR' : lang === 'en' ? 'EN' : 'AR/EN'
  return (
    <span style={{
      fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600,
      letterSpacing: '0.04em', color: 'var(--color-muted)',
      backgroundColor: 'var(--color-border)', borderRadius: 3,
      padding: '1px 5px', whiteSpace: 'nowrap' as const, flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

interface Props {
  contributor: Contributor
  period?:     string
  onBack:      () => void
}

// TABLE column grid — thumbnail | title | lang | impressions | WE | quality rate
const COL = '52px 1fr 44px 84px 84px 84px'

export function ContributorDetail({ contributor, period, onBack }: Props) {
  const [selectedContent, setSelectedContent] = useState<Content | null>(null)

  // ── Period-filtered content for this contributor ──────────────────────────
  const content = useMemo(() => {
    return getPeriodContent(period ?? 'may-26')
      .filter(c => c.authorIds?.includes(contributor.id))
      .sort((a, b) => b.metrics.impressions - a.metrics.impressions)
  }, [contributor.id, period])

  // ── KPIs — derived from period-filtered content ───────────────────────────
  const stats = useMemo(() => {
    const impressions = content.reduce((s, c) => s + c.metrics.impressions, 0)
    const we          = content.reduce((s, c) => s + c.metrics.weightedEngagement, 0)
    return {
      articleCount:       content.length,
      impressions,
      weightedEngagement: we,
      // EQR = ΣWE ÷ ΣImpressions × 100
      avgEqr:             impressions > 0 ? (we / impressions) * 100 : 0,
    }
  }, [content])

  // ── Peer benchmarks — rank this contributor among all in the same period ──
  // Shows as a 3 px left-bar on each KPI tile (same pattern as ContentDetail).
  const peerRanks = useMemo(() => {
    const allContent     = getPeriodContent(period ?? 'may-26')
    const allContributors = getAllContributors()

    const peers = allContributors
      .map(c => {
        const cc = allContent.filter(item => item.authorIds?.includes(c.id))
        if (!cc.length) return null
        const imp = cc.reduce((s, x) => s + x.metrics.impressions, 0)
        const we  = cc.reduce((s, x) => s + x.metrics.weightedEngagement, 0)
        return {
          articleCount: cc.length,
          impressions:  imp,
          we,
          eqr: imp > 0 ? (we / imp) * 100 : 0,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (peers.length < 3) return null  // too few to benchmark meaningfully

    return {
      articleCount: computePercentileRank(stats.articleCount,       peers.map(p => p.articleCount)),
      impressions:  computePercentileRank(stats.impressions,        peers.map(p => p.impressions)),
      we:           computePercentileRank(stats.weightedEngagement, peers.map(p => p.we)),
      eqr:          computePercentileRank(stats.avgEqr,             peers.map(p => p.eqr)),
    }
  }, [period, stats])

  // ── Article-level quintile ranks (within this contributor's portfolio) ───
  const articleRanks = useMemo(() => {
    if (content.length < 3) return new Map<string, { impressions: number; we: number; eqr: number }>()
    const impVals = content.map(c => c.metrics.impressions)
    const weVals  = content.map(c => c.metrics.weightedEngagement)
    const eqrVals = content.map(c => c.metrics.engagementQualityRate)
    return new Map(content.map(c => [c.id, {
      impressions: computePercentileRank(c.metrics.impressions,         impVals),
      we:          computePercentileRank(c.metrics.weightedEngagement,  weVals),
      eqr:         computePercentileRank(c.metrics.engagementQualityRate, eqrVals),
    }]))
  }, [content])

  // ── Output by month — discrete bar chart ──────────────────────────────────
  const monthlyOutput = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const c of content) {
      const m = c.publishedAt.slice(0, 7)
      byMonth.set(m, (byMonth.get(m) ?? 0) + 1)
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, count]) => ({ month: MONTH_ABBR[m.slice(5)] ?? m.slice(5), count }))
  }, [content])

  // ── Article type mix ─────────────────────────────────────────────────────
  const typeMix = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of content) {
      const label = FORMAT_LABELS[c.format as Format] ?? CONTENT_TYPE_LABELS[c.type] ?? 'Article'
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return [...counts.entries()].sort(([, a], [, b]) => b - a).map(([label, count]) => ({ label, count }))
  }, [content])

  const initials = contributor.name.split(' ').map(w => w[0]).slice(0, 2).join('')

  // Inline ContentDetail when a piece is selected
  if (selectedContent) {
    return <ContentDetail item={selectedContent} onBack={() => setSelectedContent(null)} />
  }

  const axTick = { fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--color-fainter)' } as const

  // ── KPI tile helper ────────────────────────────────────────────────────────
  function KpiTile({ icon, label, value, pct }: {
    icon: React.ReactNode; label: string; value: string; pct?: number
  }) {
    return (
      <div style={{ backgroundColor: 'var(--color-tile)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
          {icon}{label}
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
          {/* Left bar — percentile band colour */}
          {pct !== undefined && (
            <div style={{ width: 3, borderRadius: 2, flexShrink: 0, alignSelf: 'stretch', backgroundColor: quintileColor(pct) }} />
          )}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1 }}>
            {value}
          </div>
        </div>
        {pct !== undefined && (
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: quintileColor(pct), fontWeight: 500 }}>
            {Math.round(pct)}th percentile
          </div>
        )}
      </div>
    )
  }

  // ── Column header cell ─────────────────────────────────────────────────────
  const colHdr = (label: string, align: 'left' | 'right' = 'right') => (
    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--color-fainter)', textAlign: align }}>
      {label}
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px 56px' }}>

      {/* ── Back ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 0 24px' }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', color: 'var(--color-muted)', padding: 0 }}
        >
          <ArrowLeft weight="bold" size={14} />
          Team
        </button>
      </div>

      {/* ── Profile header ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
          border: '2px solid var(--color-border)',
          backgroundColor: contributor.photoUrl ? 'transparent' : 'var(--color-ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {contributor.photoUrl
            ? <img src={contributor.photoUrl} alt={contributor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 24, fontWeight: 700, color: 'var(--color-paper)' }}>{initials}</span>
          }
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-page)', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 5px' }}>
            {contributor.name}
          </h1>
          {contributor.bio && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-muted)', margin: 0 }}>
              {contributor.bio}
            </p>
          )}
        </div>
      </div>

      {/* ── KPI tiles — period-scoped, benchmarked vs. all contributors ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10, marginBottom: 16 }}>
        <KpiTile icon={<ArticleIcon weight="fill" size={13} />} label="Articles"            value={String(stats.articleCount)}             pct={peerRanks?.articleCount} />
        <KpiTile icon={<Eye         weight="fill" size={13} />} label="Impressions"         value={formatCompact(stats.impressions)}        pct={peerRanks?.impressions}  />
        <KpiTile icon={<ChartBar    weight="fill" size={13} />} label="Weighted Engagement" value={formatCompact(stats.weightedEngagement)} pct={peerRanks?.we}           />
        <KpiTile icon={<Gauge       weight="fill" size={13} />} label="Quality Rate"        value={stats.avgEqr.toFixed(1)}                pct={peerRanks?.eqr}          />
      </div>
      {peerRanks && (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)', marginBottom: 20 }}>
          Percentile rank among contributors in this period
        </div>
      )}

      {/* ── Article type mix ────────────────────────────────────────────── */}
      {typeMix.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', marginBottom: 20, paddingLeft: 2 }}>
          {typeMix.map(({ label, count }) => (
            <span key={label} style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>{' '}{label}
            </span>
          ))}
        </div>
      )}

      {/* ── Output by month ──────────────────────────────────────────────── */}
      {content.length > 0 && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '14px 18px', marginBottom: 24, backgroundColor: 'var(--color-raised)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: 'var(--color-fainter)' }}>
              Output · articles per month
            </div>
            <HonestyLabel>article count only — no per-piece time-series exists</HonestyLabel>
          </div>
          {monthlyOutput.length < 2 ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 0 2px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {monthlyOutput[0]?.count ?? content.length}
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
                {(monthlyOutput[0]?.count ?? 1) === 1 ? 'article' : 'articles'} published{monthlyOutput[0] ? ` in ${monthlyOutput[0].month}` : ''}
              </span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={monthlyOutput} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={axTick} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axTick} axisLine={false} tickLine={false} width={28} />
                <RechartsTip
                  formatter={(v: unknown) => [v, 'Articles']}
                  contentStyle={{ fontFamily: 'var(--font-ui)', fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-raised)', boxShadow: 'none' }}
                />
                <Bar dataKey="count" fill="var(--color-ink)" fillOpacity={0.75} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Article table ─────────────────────────────────────────────────── */}
      {content.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: 'var(--color-fainter)', marginBottom: 10 }}>
            {content.length} piece{content.length !== 1 ? 's' : ''} credited · sorted by impressions
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: COL, gap: '0 12px', padding: '8px 14px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-raised)' }}>
              <div />
              {colHdr('Title', 'left')}
              {colHdr('Lang')}
              {colHdr('Impressions')}
              {colHdr('Engagement')}
              {colHdr('Quality')}
            </div>

            {/* Data rows */}
            {content.map((item, i) => {
              const { Icon, color } = PLATFORM_CONFIG[item.platform]
              const typeLabel = item.format ? FORMAT_LABELS[item.format] : CONTENT_TYPE_LABELS[item.type]
              const isLast    = i === content.length - 1
              const ranks     = articleRanks.get(item.id)

              // Quintile underline on metric cells when enough articles to rank
              const underline = (pct: number | undefined) =>
                pct !== undefined
                  ? { borderBottom: `2px solid ${quintileColor(pct)}`, paddingBottom: 1 }
                  : {}

              return (
                <ArticleRow
                  key={item.id}
                  isLast={isLast}
                  onSelect={() => setSelectedContent(item)}
                >
                  {/* Thumbnail */}
                  <div style={{ width: 52, height: 40, borderRadius: 5, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)', backgroundColor: '#F1EAD9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {item.thumbnailUrl
                      ? <img src={item.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <Icon weight="fill" size={14} color="var(--color-fainter)" />
                    }
                    <span style={{ position: 'absolute', bottom: 2, right: 2, backgroundColor: color, borderRadius: 2, width: 10, height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon weight="fill" size={6} color="white" />
                    </span>
                  </div>

                  {/* Title + meta */}
                  <div style={{ minWidth: 0 }}>
                    <div dir="auto" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-row)', fontWeight: 500, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>
                      {item.title}
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Tag>{typeLabel}</Tag>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>{formatDateShort(item.publishedAt)}</span>
                    </div>
                  </div>

                  {/* Language */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <LangPill lang={item.language} />
                  </div>

                  {/* Impressions */}
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-data)', fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span style={underline(ranks?.impressions)}>{formatCompact(item.metrics.impressions)}</span>
                  </div>

                  {/* Weighted Engagement */}
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-data)', fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span style={underline(ranks?.we)}>{formatCompact(item.metrics.weightedEngagement)}</span>
                  </div>

                  {/* Quality Rate */}
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-data)', fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span style={underline(ranks?.eqr)}>{item.metrics.engagementQualityRate.toFixed(1)}</span>
                  </div>
                </ArticleRow>
              )
            })}
          </div>
        </div>
      )}

      {content.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-faint)' }}>
          No articles credited in this period.
        </div>
      )}
    </div>
  )
}

// ─── Row wrapper ──────────────────────────────────────────────────────────────

function ArticleRow({ isLast, onSelect, children }: {
  isLast: boolean; onSelect: () => void; children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: COL, gap: '0 12px',
        alignItems: 'center', padding: '10px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        backgroundColor: hovered ? 'rgba(36,31,24,0.035)' : 'transparent',
        cursor: 'pointer', transition: 'background-color 120ms ease',
      }}
    >
      {children}
    </div>
  )
}
