// Follower growth — stacked area chart.
// Platforms sorted biggest → smallest (Facebook at bottom, Podcast at top).
// Shows total audience composition AND how each platform contributes.

import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { WarmTooltip }          from './WarmTooltip'
import { PLATFORM_CONFIG }      from '../PlatformBadge'
import { getFollowerGrowthData } from '../../lib/chartData'
import { formatCompact }        from '../../lib/metrics'
import type { Platform }        from '../../data/types'

const axisStyle = { fontFamily: 'IBM Plex Sans, system-ui, sans-serif', fontSize: 11, fill: '#A99C84' }

export function FollowerGrowthChart() {
  const { data, platforms } = getFollowerGrowthData()
  if (!data.length) return null

  // Sort biggest → smallest so Facebook renders at the bottom
  const lastPoint = data[data.length - 1]
  const sortedPlatforms = [...platforms].sort(
    (a, b) => ((lastPoint[b] as number) ?? 0) - ((lastPoint[a] as number) ?? 0)
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 3px' }}>
          Follower growth
        </h3>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
          Weekly account totals · stacked by platform · largest at bottom
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#EFE8D8" />
          <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: '#D6CABA' }} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCompact(v)} width={44} />
          <Tooltip content={<WarmTooltip />} />

          {/* Stacked areas: biggest platform first = rendered at bottom */}
          {sortedPlatforms.map(p => (
            <Area
              key={p}
              dataKey={p}
              name={PLATFORM_CONFIG[p as Platform]?.label ?? p}
              stackId="followers"
              type="monotone"
              fill={PLATFORM_CONFIG[p as Platform]?.color ?? '#888'}
              fillOpacity={0.75}
              stroke={PLATFORM_CONFIG[p as Platform]?.color ?? '#888'}
              strokeWidth={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Compact legend — platform + latest count */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: 12 }}>
        {sortedPlatforms.map(p => {
          const count = (lastPoint[p] as number) ?? 0
          if (!count) return null
          const { color, label } = PLATFORM_CONFIG[p as Platform] ?? { color: '#888', label: p }
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums' }}>{formatCompact(count)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
