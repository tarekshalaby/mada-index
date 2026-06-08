import type { ReactNode, CSSProperties } from 'react'

// Honesty labels — §6.6 and §8.
// Muted caption pills: #F3EEE3 bg, #8E826B text.
// Strings: 'publish cohort' · 'correlation, not attribution' ·
//          'partial attribution (IG)' · 'index · can exceed 100' ·
//          'mentioned in · not counted'

interface HonestyLabelProps {
  children: ReactNode
  style?: CSSProperties
}

export function HonestyLabel({ children, style }: HonestyLabelProps) {
  return (
    <span
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        fontFamily:      'var(--font-ui)',
        fontSize:        'var(--text-caption)',
        fontWeight:      400,
        color:           'var(--color-faint)',
        backgroundColor: 'var(--color-tile)',
        border:          '1px solid var(--color-border)',
        borderRadius:    'var(--radius-pill)',
        padding:         '2px 7px',
        whiteSpace:      'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
