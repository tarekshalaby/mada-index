import type { ReactNode } from 'react'

// Category tags — Format / Section / Series (§10.4)
// Deliberately neutral — colour is reserved for platform identity and benchmarks.

interface TagProps {
  children: ReactNode
}

export function Tag({ children }: TagProps) {
  return (
    <span
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        fontFamily:      'var(--font-ui)',
        fontSize:        'var(--text-caption)',
        fontWeight:      500,
        color:           'var(--color-muted)',
        backgroundColor: '#F1EFE8',
        border:          '1px solid #ECE4D4',
        borderRadius:    'var(--radius-pill)',
        padding:         '2px 8px',
        whiteSpace:      'nowrap',
      }}
    >
      {children}
    </span>
  )
}
