// Format performance across platforms — Overview hero chart.
// Grouped bars: average metric per piece, per social platform, per editorial format.
// Website overlay: thin orange line on a secondary Y axis (different unit).
// Metric toggle: Weighted Engagement | Impressions | Site Clicks.
// Language toggle: Both | Arabic | English.

import { useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { ChartBar, Eye, Link } from '@phosphor-icons/react'
import { WarmTooltip }                        from './WarmTooltip'
import { Toggle }                             from '../Toggle'
import { PLATFORM_CONFIG }                    from '../PlatformBadge'
import { getFormatPerformanceData, type FormatMetric } from '../../lib/chartData'
import { formatCompact }                      from '../../lib/metrics'

type Lang = 'both' | 'ar' | 'en'

const BAR_PLATFORMS = ['facebook', 'instagram', 'x', 'linkedin', 'youtube', 'podcast'] as const

const LANG_OPTIONS = [
  { value: 'both'    as Lang, label: 'Both'    },
  { value: 'ar'      as Lang, label: 'Arabic'  },
  { value: 'en'      as Lang, label: 'English' },
]

// Icons on metric toggle — consistent with all other metric toggles in the dashboard
const METRIC_OPTIONS = [
  { value: 'we'          as FormatMetric, label: 'Engagement',  icon: <ChartBar weight="fill" size={13} /> },
  { value: 'impressions' as FormatMetric, label: 'Impressions', icon: <Eye      weight="fill" size={13} /> },
  { value: 'siteClicks'  as FormatMetric, label: 'Site Clicks', icon: <Link weight="fill" size={13} /> },
]

const METRIC_SUBTITLE: Record<FormatMetric, string> = {
  we:          'Avg Weighted Engagement per piece',
  impressions: 'Avg Impressions per piece',
  siteClicks:  'Avg Site Clicks per piece',
}

function SwatchLegend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', marginBottom: 16 }}>
      {BAR_PLATFORMS.map(p => (
        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: PLATFORM_CONFIG[p].color, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>
            {PLATFORM_CONFIG[p].label}
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ display: 'inline-block', width: 16, height: 2, backgroundColor: '#E37400', flexShrink: 0, borderRadius: 1 }} />
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>
          Website (right axis)
        </span>
      </div>
    </div>
  )
}

const axisStyle = { fontFamily: 'IBM Plex Sans, system-ui, sans-serif', fontSize: 11, fill: '#A99C84' }

export function FormatPerformanceChart({ period }: { period?: string }) {
  const [lang,   setLang  ] = useState<Lang>('both')
  const [metric, setMetric] = useState<FormatMetric>('we')

  const rawLang = lang === 'both' ? undefined : lang
  const data    = getFormatPerformanceData(rawLang, metric, period)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 3px' }}>
            Format performance across platforms
          </h3>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
            {METRIC_SUBTITLE[metric]} · publish cohort
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Toggle options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
          <Toggle options={LANG_OPTIONS}   value={lang}   onChange={setLang}   />
        </div>
      </div>

      <SwatchLegend />

      {data.length === 0 ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-muted)' }}>
          No content matches this language filter.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 12, right: 80, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#EFE8D8" />
            <XAxis dataKey="format" tick={axisStyle} axisLine={{ stroke: '#D6CABA' }} tickLine={false} />
            <YAxis yAxisId="left"  tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCompact(v)} width={48} />
            <YAxis yAxisId="right" orientation="right" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCompact(v)} width={52} />
            <Tooltip content={<WarmTooltip />} />

            {BAR_PLATFORMS.map(p => (
              <Bar key={p} yAxisId="left" dataKey={p} name={PLATFORM_CONFIG[p].label} fill={PLATFORM_CONFIG[p].color} radius={[3, 3, 0, 0] as unknown as number} maxBarSize={28} />
            ))}

            <Line yAxisId="right" dataKey="website" name="Website (avg)" stroke="#E37400" strokeWidth={1.5} dot={{ r: 2.5, fill: '#E37400', strokeWidth: 0 }} activeDot={{ r: 4, fill: '#E37400', strokeWidth: 0 }} type="linear" connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
