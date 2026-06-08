// Shared warm-card tooltip — §6.5: "#FFFDF7, hairline, muted label + tabular value"
// Used by all four chart components.

import { formatCompact } from '../../lib/metrics'

// Recharts passes these props to custom tooltip components
interface WarmTooltipProps {
  active?:  boolean
  payload?: Array<{ dataKey?: string; name?: string; value?: number | string; color?: string }>
  label?:   string
}

export function WarmTooltip({ active, payload, label }: WarmTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div
      style={{
        backgroundColor: 'var(--color-raised)',
        border:          '1px solid var(--color-border)',
        borderRadius:    'var(--radius-card)',
        boxShadow:       'var(--shadow-overlay)',
        padding:         '10px 14px',
        fontFamily:      'var(--font-ui)',
        minWidth:        160,
        pointerEvents:   'none',
      }}
    >
      {label && (
        <div style={{
          fontSize:     'var(--text-label)',
          color:        'var(--color-faint)',
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: '1px solid var(--color-border)',
        }}>
          {label}
        </div>
      )}
      {(payload as Array<{ dataKey?: string; name?: string; value?: number | string; color?: string }>).map((entry, i) => (
        <div
          key={`${entry.dataKey}-${i}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < payload.length - 1 ? 5 : 0 }}
        >
          <span style={{
            display:         'inline-block',
            width:           8,
            height:          8,
            borderRadius:    2,
            backgroundColor: entry.color,
            flexShrink:      0,
          }} />
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted)', flex: 1, whiteSpace: 'nowrap' }}>
            {entry.name}
          </span>
          <span style={{
            fontSize:           'var(--text-data)',
            fontWeight:         500,
            color:              'var(--color-ink)',
            fontVariantNumeric: 'tabular-nums lining-nums',
            marginLeft:         8,
          }}>
            {typeof entry.value === 'number' ? formatCompact(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}
