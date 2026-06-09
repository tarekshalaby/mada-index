// Engagement-type mix — Task 3 of the Platforms brief.
// 100%-stacked horizontal bar per platform: reactions / comments / shares / saves / clicks.
// Normalized so we compare mix, not volume (the comparison chart above shows volume).
// Sorted by platform impressions to match the comparison order.

import { useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTip, ResponsiveContainer,
} from 'recharts'
import { formatCompact } from '../../lib/metrics'
import { HonestyLabel } from '../HonestyLabel'
import type { EngagementMixRow } from '../../lib/chartData'

// ─── Segment definitions ──────────────────────────────────────────────────────
// Five interaction types with consistent colors across all rows.
// Neutral palette — not platform identity colors, not the benchmark trio.

export const MIX_SEGMENTS = [
  { key: 'reactionsPct', raw: 'reactions', label: 'Reactions', color: '#E8834B' },
  { key: 'commentsPct',  raw: 'comments',  label: 'Comments',  color: '#5B8DB8' },
  { key: 'sharesPct',    raw: 'shares',    label: 'Shares',    color: '#6DB37A' },
  { key: 'savesPct',     raw: 'saves',     label: 'Saves',     color: '#9B72B3' },
  { key: 'clicksPct',    raw: 'clicks',    label: 'Clicks',    color: '#3D9A8B' },
] as const

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface MixTooltipProps {
  active?:  boolean
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>
  label?:   string
  data:     EngagementMixRow[]
}

function MixTooltip({ active, payload, label, data }: MixTooltipProps) {
  if (!active || !payload?.length) return null
  const row = data.find(r => r.label === label)
  if (!row) return null

  return (
    <div style={{
      backgroundColor: 'var(--color-raised)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-card)',
      boxShadow:       'var(--shadow-overlay)',
      padding:         '10px 14px',
      fontFamily:      'var(--font-ui)',
      minWidth:        210,
      pointerEvents:   'none',
    }}>
      <div style={{
        fontSize:      'var(--text-label)',
        color:         'var(--color-faint)',
        marginBottom:  8,
        paddingBottom: 6,
        borderBottom:  '1px solid var(--color-border)',
      }}>
        {label} · {formatCompact(row.total)} interactions
      </div>
      {MIX_SEGMENTS.map(seg => {
        const rawCount = row[seg.raw as keyof EngagementMixRow] as number
        const pct      = row[seg.key as keyof EngagementMixRow] as number
        return (
          <div key={seg.key} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 4, lineHeight: 1.4,
          }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8,
              borderRadius: 2, backgroundColor: seg.color, flexShrink: 0,
            }} />
            <span style={{
              fontSize: 'var(--text-caption)', color: 'var(--color-muted)', flex: 1,
            }}>
              {seg.label}
            </span>
            <span style={{
              fontSize: 'var(--text-caption)', fontWeight: 500,
              color: 'var(--color-ink)',
              fontVariantNumeric: 'tabular-nums lining-nums',
              marginLeft: 4,
            }}>
              {formatCompact(rawCount)}
            </span>
            <span style={{
              fontSize: 'var(--text-caption)', color: 'var(--color-faint)',
              fontVariantNumeric: 'tabular-nums lining-nums',
              minWidth: 32, textAlign: 'right',
            }}>
              {pct.toFixed(0)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Chart component ──────────────────────────────────────────────────────────

interface EngagementMixChartProps {
  data: EngagementMixRow[]
}

export function EngagementMixChart({ data }: EngagementMixChartProps) {
  const chartHeight = Math.max(data.length * 44 + 24, 120)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = useCallback(
    (props: any) => <MixTooltip active={props.active} payload={props.payload} label={props.label} data={data} />,
    [data],
  )

  if (data.length === 0) {
    return (
      <p style={{
        fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)',
        color: 'var(--color-faint)', margin: 0,
      }}>
        No interaction data in this period.
      </p>
    )
  }

  return (
    <div>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)',
        fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 4px 0',
      }}>
        Engagement mix
      </h3>
      <p style={{
        fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)',
        color: 'var(--color-faint)', margin: '0 0 16px 0',
      }}>
        Interaction type breakdown per platform — normalized to compare mix, not volume
      </p>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
          barSize={20}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--color-faint)' }}
            tickLine={false}
            axisLine={false}
            tickCount={6}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={82}
            tick={{ fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--color-ink)' }}
            tickLine={false}
            axisLine={false}
          />
          <RechartsTip content={renderTooltip} cursor={{ fill: 'rgba(36,31,24,0.04)' }} />
          {MIX_SEGMENTS.map(seg => (
            <Bar
              key={seg.key}
              dataKey={seg.key}
              stackId="mix"
              fill={seg.color}
              name={seg.label}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Inline legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
        {MIX_SEGMENTS.map(seg => (
          <span key={seg.key} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)',
            color: 'var(--color-muted)',
          }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8,
              borderRadius: 2, backgroundColor: seg.color,
            }} />
            {seg.label}
          </span>
        ))}
      </div>

      {/* EQR weighting note */}
      <div style={{ marginTop: 10 }}>
        <HonestyLabel>
          Weighted Engagement weights: Clicks ×5 · Saves ×4 · Comments ×3 · Shares ×2 · Reactions ×1
        </HonestyLabel>
      </div>
    </div>
  )
}
