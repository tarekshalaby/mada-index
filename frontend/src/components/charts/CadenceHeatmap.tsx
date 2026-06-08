// Publishing cadence heatmap — week × day-of-week.
// §6.4: teal sequential ramp; darker = more. CSS Grid fills full container width.
// Publishing / Engagement toggle with icons.

import { useState } from 'react'
import { Newspaper, ChartBar } from '@phosphor-icons/react'
import { Toggle }                from '../Toggle'
import { getCadenceData, DAY_LABELS, TEAL_RAMP } from '../../lib/chartData'
import { formatCompact }         from '../../lib/metrics'

type Mode = 'publishing' | 'engagement'

const MODE_OPTIONS = [
  { value: 'publishing' as Mode, label: 'Publishing', icon: <Newspaper weight="fill" size={13} /> },
  { value: 'engagement' as Mode, label: 'Engagement', icon: <ChartBar  weight="fill" size={13} /> },
]

function tealForValue(value: number, max: number): string {
  if (value === 0) return TEAL_RAMP[0]
  const idx = Math.min(
    Math.ceil((value / max) * (TEAL_RAMP.length - 1)),
    TEAL_RAMP.length - 1
  )
  return TEAL_RAMP[Math.max(idx, 0)]
}

export function CadenceHeatmap({ period, platform }: { period?: string; platform?: string }) {
  const [mode, setMode] = useState<Mode>('publishing')
  const { cells, weeks, maxValue } = getCadenceData(mode, period, platform)

  if (weeks.length === 0) return null

  const WEEK_COL = 72  // px — left label column

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 3px' }}>
            Publishing cadence
          </h3>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
            Week × day · darker = {mode === 'publishing' ? 'more pieces published' : 'higher weighted engagement'}
          </div>
        </div>
        <Toggle options={MODE_OPTIONS} value={mode} onChange={setMode} />
      </div>

      {/* Grid — 1fr columns fill full container width */}
      <div style={{ width: '100%' }}>
        {/* Day-of-week headers */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: `${WEEK_COL}px repeat(7, 1fr)`,
          gap:                 4,
          marginBottom:        4,
        }}>
          <div />
          {DAY_LABELS.map(d => (
            <div key={d} style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)', textAlign: 'center', lineHeight: 1 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map(({ label }) => {
          const row = cells.filter(c => c.weekLabel === label)
          return (
            <div
              key={label}
              style={{
                display:             'grid',
                gridTemplateColumns: `${WEEK_COL}px repeat(7, 1fr)`,
                gap:                 4,
                marginBottom:        4,
              }}
            >
              {/* Week label */}
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', display: 'flex', alignItems: 'center', paddingRight: 8, whiteSpace: 'nowrap' }}>
                {label.replace('Wk ', '')}
              </div>

              {/* Day cells — height driven by aspect-ratio so cells stay square */}
              {Array.from({ length: 7 }, (_, di) => {
                const cell  = row.find(c => c.dayIndex === di)
                const val   = cell?.value ?? 0
                const color = tealForValue(val, maxValue)
                return (
                  <div
                    key={di}
                    title={val > 0 ? (mode === 'publishing' ? `${val} pieces` : `${formatCompact(val)} WE`) : undefined}
                    style={{
                      aspectRatio:     '1 / 1',
                      backgroundColor: color,
                      borderRadius:    4,
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                    }}
                  >
                    {val > 0 && (
                      <span style={{
                        fontFamily:         'var(--font-ui)',
                        fontSize:           9,
                        fontWeight:         600,
                        color:              val >= maxValue * 0.5 ? 'white' : '#1C4A3B',
                        fontVariantNumeric: 'tabular-nums lining-nums',
                      }}>
                        {mode === 'publishing' ? val : formatCompact(val)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Less → more legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>Less</span>
        {TEAL_RAMP.map(c => (
          <span key={c} style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, backgroundColor: c }} />
        ))}
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>More</span>
      </div>
    </div>
  )
}
