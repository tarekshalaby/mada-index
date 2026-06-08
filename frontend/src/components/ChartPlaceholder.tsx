import { ChartBar } from '@phosphor-icons/react'

// Warm editorial placeholder for Recharts charts arriving in Phase 4.
// Shows the chart title, what it will answer, and a Phase 4 label.

interface ChartPlaceholderProps {
  title: string
  description: string
  height?: number
}

export function ChartPlaceholder({ title, description, height = 240 }: ChartPlaceholderProps) {
  return (
    <div
      style={{
        height,
        backgroundColor: 'var(--color-tile)',
        border:          '1px solid var(--color-border)',
        borderRadius:    'var(--radius-card)',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             10,
        padding:         24,
        textAlign:       'center',
      }}
    >
      <ChartBar weight="fill" size={28} style={{ color: 'var(--color-border-strong)' }} />
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize:   'var(--text-title-row)',
        fontWeight: 500,
        color:      'var(--color-ink)',
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: 'var(--font-ui)',
        fontSize:   'var(--text-caption)',
        color:      'var(--color-muted)',
        maxWidth:   340,
        lineHeight: 1.5,
      }}>
        {description}
      </div>
      <div style={{
        fontFamily:      'var(--font-ui)',
        fontSize:        'var(--text-caption)',
        color:           'var(--color-fainter)',
        backgroundColor: 'var(--color-raised)',
        border:          '1px solid var(--color-border)',
        borderRadius:    'var(--radius-pill)',
        padding:         '3px 10px',
        marginTop:       4,
      }}>
        Recharts — Phase 4
      </div>
    </div>
  )
}
