import type { ReactNode } from 'react'
import { Chip } from './Chip'
import type { MetricPolarity } from '../data/types'

// KPI tile — §10.5. Muted label (with glyph) → serif big number → DeltaChip.
// No sparklines (lifetime-only data; cohort tiles stay honest).

interface KpiTileProps {
  label: string
  icon?: ReactNode
  value: string         // pre-formatted display value ("2.4M", "38.2h", etc.)
  current: number           // raw value — used for delta calculation
  previous: number | null   // null = no prior data → delta chip shows "—"
  polarity?: MetricPolarity
}

export function KpiTile({
  label,
  icon,
  value,
  current,
  previous,
  polarity = 'good-up',
}: KpiTileProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-tile)',
        border:          '1px solid var(--color-border)',
        borderRadius:    'var(--radius-card)',
        padding:         20,
        display:         'flex',
        flexDirection:   'column',
        gap:             10,
        minWidth:        0,
      }}
    >
      {/* Label row */}
      <div
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        6,
          fontFamily: 'var(--font-ui)',
          fontSize:   'var(--text-label)',
          fontWeight: 500,
          color:      'var(--color-faint)',
        }}
      >
        {icon && <span style={{ flexShrink: 0 }}>{icon}</span>}
        {label}
      </div>

      {/* Big number */}
      <div
        style={{
          fontFamily:          'var(--font-display)',
          fontSize:            'var(--text-display-l)',
          fontWeight:          600,
          color:               'var(--color-ink)',
          fontVariantNumeric:  'tabular-nums lining-nums',
          letterSpacing:       '-0.01em',
          lineHeight:          1,
        }}
      >
        {value}
      </div>

      {/* Delta chip */}
      <div>
        <Chip current={current} previous={previous} polarity={polarity} />
      </div>
    </div>
  )
}
