// Individual contributor profile — full history, KPI tiles, impressions trend, content list.

import React, { useState, useMemo } from 'react'
import {
  ArrowLeft, Eye, ChartBar, Gauge, Article as ArticleIcon,
} from '@phosphor-icons/react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer,
} from 'recharts'
import type { Contributor, Content } from '../data/types'
import {
  getPeriodContent,
  getContributorStats,
  getContributorMonthly,
} from '../data/adapter'
import { ContentDetail }    from './ContentDetail'
import { PLATFORM_CONFIG }  from '../components/PlatformBadge'
import { Tag }               from '../components/Tag'
import { formatCompact }     from '../lib/metrics'
import { FORMAT_LABELS, CONTENT_TYPE_LABELS, formatDateShort } from '../lib/labels'

// Short month names for the chart x-axis
const MONTH_ABBR: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

// ─── Clickable content row wrapper ────────────────────────────────────────────

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
        display:         'flex', alignItems: 'center', gap: 12,
        padding:         '10px 14px',
        borderBottom:    isLast ? 'none' : '1px solid var(--color-border)',
        backgroundColor: hovered ? 'rgba(36,31,24,0.035)' : 'transparent',
        cursor:          'pointer',
        transition:      'background-color 120ms ease',
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

  const stats   = getContributorStats(contributor.id)
  const monthly = getContributorMonthly(contributor.id)

  // Filter content to the selected period, then by this contributor's byline
  const content = useMemo(() => {
    const periodContent = getPeriodContent(period ?? 'may-26')
    return periodContent
      .filter(c => c.authorIds?.includes(contributor.id))
      .sort((a, b) => b.metrics.impressions - a.metrics.impressions)
  }, [contributor.id, period])

  const initials = contributor.name.split(' ').map(w => w[0]).slice(0, 2).join('')

  const chartData = monthly.map(m => ({
    month:       MONTH_ABBR[m.month.slice(5)] ?? m.month.slice(5),
    impressions: m.impressions,
    articles:    m.articles,
  }))

  // Inline ContentDetail when a piece is selected
  if (selectedContent) {
    return (
      <ContentDetail
        item={selectedContent}
        onBack={() => setSelectedContent(null)}
      />
    )
  }

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

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { icon: <ArticleIcon weight="fill" size={13} />, label: 'Articles',             value: String(stats.articleCount)           },
          { icon: <Eye         weight="fill" size={13} />, label: 'Impressions',          value: formatCompact(stats.impressions)      },
          { icon: <ChartBar    weight="fill" size={13} />, label: 'Weighted Engagement',  value: formatCompact(stats.weightedEngagement) },
          { icon: <Gauge       weight="fill" size={13} />, label: 'Avg Quality Rate',     value: stats.avgEqr.toFixed(1)              },
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

      {/* Impressions over time — AreaChart */}
      {chartData.length > 1 && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 28, backgroundColor: 'var(--color-raised)' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-fainter)', marginBottom: 14 }}>
            Impressions over time
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${contributor.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-ink)" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="var(--color-ink)" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--color-fainter)' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={v => formatCompact(v as number)}
                tick={{ fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--color-fainter)' }}
                axisLine={false} tickLine={false} width={44}
              />
              <RechartsTip
                formatter={(v: unknown) => [formatCompact(v as number), 'Impressions']}
                contentStyle={{ fontFamily: 'var(--font-ui)', fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-raised)', boxShadow: 'none' }}
              />
              <Area
                type="monotone" dataKey="impressions"
                stroke="var(--color-ink)" strokeWidth={1.5}
                fill={`url(#grad-${contributor.id})`} dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Content list — all pieces credited to this contributor */}
      {content.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-fainter)', marginBottom: 12 }}>
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
    </div>
  )
}
