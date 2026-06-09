// Individual contributor profile — period-scoped KPIs, output chart, content list.
//
// DATA FACTS:
// • Attribution is article-only. Every piece here is a website article; impressions = GA4 pageviews.
// • All metrics are lifetime snapshots — there is NO per-piece time-series.
// • The only per-month data we can honestly show is a count of articles published that month,
//   derived from publishedAt. "Impressions over time" is not a real time-series — removed.
// • EQR = ΣWE ÷ ΣImpressions × 100 (weighted ratio, never mean of per-piece rates).

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Eye, ChartBar, Gauge, Article as ArticleIcon } from '@phosphor-icons/react'
import type { Contributor, Content, Format } from '../data/types'
import { getPeriodContent }   from '../data/adapter'
import { ContentDetail }      from './ContentDetail'
import { PLATFORM_CONFIG }    from '../components/PlatformBadge'
import { Tag }                from '../components/Tag'
import { HonestyLabel }       from '../components/HonestyLabel'
import { formatCompact }      from '../lib/metrics'
import { FORMAT_LABELS, CONTENT_TYPE_LABELS, formatDateShort } from '../lib/labels'

const MONTH_ABBR: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

// ─── Clickable row wrapper ────────────────────────────────────────────────────

function ItemRow({ isLast, onSelect, children }: {
  isLast: boolean; onSelect: () => void; children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        backgroundColor: hovered ? 'rgba(36,31,24,0.035)' : 'transparent',
        cursor: 'pointer', transition: 'background-color 120ms ease',
      }}
    >
      {children}
    </div>
  )
}

interface Props {
  contributor: Contributor
  period?:     string
  onBack:      () => void
}

export function ContributorDetail({ contributor, period, onBack }: Props) {
  const [selectedContent, setSelectedContent] = useState<Content | null>(null)

  // ── Period-filtered content (all stats derived from this) ─────────────────
  const content = useMemo(() => {
    const periodContent = getPeriodContent(period ?? 'may-26')
    return periodContent
      .filter(c => c.authorIds?.includes(contributor.id))
      .sort((a, b) => b.metrics.impressions - a.metrics.impressions)
  }, [contributor.id, period])

  // ── KPIs — computed from period-filtered content, not all-time stats ──────
  const stats = useMemo(() => {
    const impressions = content.reduce((s, c) => s + c.metrics.impressions, 0)
    const we          = content.reduce((s, c) => s + c.metrics.weightedEngagement, 0)
    return {
      articleCount:       content.length,
      impressions,
      weightedEngagement: we,
      // EQR = ΣWE ÷ ΣImpressions × 100 (never mean of per-piece rates)
      avgEqr:             impressions > 0 ? (we / impressions) * 100 : 0,
      siteClicks:         content.reduce((s, c) => s + c.metrics.siteClicks, 0),
    }
  }, [content])

  // ── Output by month — honest discrete bar chart ────────────────────────────
  // Article count per calendar month from publishedAt. No interpolation.
  const monthlyOutput = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const c of content) {
      const m = c.publishedAt.slice(0, 7)
      byMonth.set(m, (byMonth.get(m) ?? 0) + 1)
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, count]) => ({
        month: MONTH_ABBR[m.slice(5)] ?? m.slice(5),
        count,
      }))
  }, [content])

  // ── Article type mix ──────────────────────────────────────────────────────
  const typeMix = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of content) {
      const label = FORMAT_LABELS[c.format as Format] ?? CONTENT_TYPE_LABELS[c.type] ?? 'Article'
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count }))
  }, [content])

  const initials = contributor.name.split(' ').map(w => w[0]).slice(0, 2).join('')

  // Inline ContentDetail when a piece is selected
  if (selectedContent) {
    return <ContentDetail item={selectedContent} onBack={() => setSelectedContent(null)} />
  }

  const axTick = { fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--color-fainter)' } as const

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px 56px' }}>

      {/* Back */}
      <div style={{ padding: '20px 0 24px' }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', color: 'var(--color-muted)', padding: 0 }}
        >
          <ArrowLeft weight="bold" size={14} />
          Team
        </button>
      </div>

      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
          border: '2px solid var(--color-border)',
          backgroundColor: contributor.photoUrl ? 'transparent' : 'var(--color-ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {contributor.photoUrl
            ? <img src={contributor.photoUrl} alt={contributor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 26, fontWeight: 700, color: 'var(--color-paper)' }}>{initials}</span>
          }
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-page)', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 6px' }}>
            {contributor.name}
          </h1>
          {contributor.bio && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-muted)', margin: 0 }}>
              {contributor.bio}
            </p>
          )}
        </div>
      </div>

      {/* KPI tiles — all scoped to the selected period */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { icon: <ArticleIcon weight="fill" size={13} />, label: 'Articles',            value: String(stats.articleCount)              },
          { icon: <Eye         weight="fill" size={13} />, label: 'Impressions',         value: formatCompact(stats.impressions)         },
          { icon: <ChartBar    weight="fill" size={13} />, label: 'Weighted Engagement', value: formatCompact(stats.weightedEngagement)  },
          { icon: <Gauge       weight="fill" size={13} />, label: 'Quality Rate',        value: stats.avgEqr.toFixed(1)                 },
        ].map(t => (
          <div key={t.label} style={{ backgroundColor: 'var(--color-tile)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 18px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', marginBottom: 8 }}>
              {t.icon}{t.label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1 }}>
              {t.value}
            </div>
          </div>
        ))}
      </div>

      {/* Article type mix — neutral inline breakdown */}
      {typeMix.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', marginBottom: 24, paddingLeft: 2 }}>
          {typeMix.map(({ label, count }) => (
            <span key={label} style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>{' '}{label}
            </span>
          ))}
        </div>
      )}

      {/* Output by month — discrete bar chart, no interpolation */}
      {content.length > 0 && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 28, backgroundColor: 'var(--color-raised)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: 'var(--color-fainter)' }}>
              Output · articles per month
            </div>
            <HonestyLabel>article count only — no per-piece time-series exists</HonestyLabel>
          </div>

          {monthlyOutput.length < 2 ? (
            /* Single month — stat callout instead of a 1-bar chart */
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '10px 0 4px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {monthlyOutput[0]?.count ?? content.length}
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
                {(monthlyOutput[0]?.count ?? 1) === 1 ? 'article' : 'articles'} published
                {monthlyOutput[0] ? ` in ${monthlyOutput[0].month}` : ''}
              </span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
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

      {/* Content list — period-scoped, sorted by impressions */}
      {content.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: 'var(--color-fainter)', marginBottom: 12 }}>
            {content.length} piece{content.length !== 1 ? 's' : ''} credited · by impressions
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
            {content.map((item, i) => {
              const { Icon, color } = PLATFORM_CONFIG[item.platform]
              const typeLabel = item.format ? FORMAT_LABELS[item.format] : CONTENT_TYPE_LABELS[item.type]
              const isLast    = i === content.length - 1
              return (
                <ItemRow key={item.id} isLast={isLast} onSelect={() => setSelectedContent(item)}>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div dir="auto" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-row)', fontWeight: 500, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>
                      {item.title}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Tag>{typeLabel}</Tag>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>{formatDateShort(item.publishedAt)}</span>
                    </div>
                  </div>

                  {/* Key metrics */}
                  <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-data)', fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums' }}>
                        {formatCompact(item.metrics.impressions)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>impressions</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-data)', fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums' }}>
                        {item.metrics.engagementQualityRate.toFixed(1)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>quality rate</div>
                    </div>
                  </div>
                </ItemRow>
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
