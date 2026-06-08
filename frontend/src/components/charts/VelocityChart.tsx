// Publishing velocity — stacked area chart, always daily granularity.
// Toggle: segment by Format (classification) or by Platform (content type).

import { useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { WarmTooltip }         from './WarmTooltip'
import { Toggle }              from '../Toggle'
import {
  getVelocityData,
  velocitySegmentColor,
  type VelocitySegment,
} from '../../lib/chartData'

const SEGMENT_OPTIONS = [
  { value: 'format' as VelocitySegment, label: 'By classification' },
  { value: 'type'   as VelocitySegment, label: 'By content type'   },
]

const axisStyle = { fontFamily: 'IBM Plex Sans, system-ui, sans-serif', fontSize: 11, fill: '#A99C84' }

export function VelocityChart({ period }: { period?: string }) {
  const [segmentBy, setSegmentBy] = useState<VelocitySegment>('format')

  const { data, formats } = getVelocityData(segmentBy, period)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 3px' }}>
            Publishing velocity
          </h3>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
            Pieces published per day · segmented by {segmentBy === 'format' ? 'format' : 'channel'} · publish cohort
          </div>
        </div>
        <Toggle options={SEGMENT_OPTIONS} value={segmentBy} onChange={setSegmentBy} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', marginBottom: 16 }}>
        {formats.map(fmt => (
          <div key={fmt} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: velocitySegmentColor(segmentBy, fmt), flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>{fmt}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#EFE8D8" />
          <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: '#D6CABA' }} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
          <Tooltip content={<WarmTooltip />} />
          {formats.map(fmt => (
            <Area
              key={fmt}
              dataKey={fmt}
              stackId="velocity"
              type="monotone"
              fill={velocitySegmentColor(segmentBy, fmt)}
              stroke={velocitySegmentColor(segmentBy, fmt)}
              strokeWidth={0.5}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
