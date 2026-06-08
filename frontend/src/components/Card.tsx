import type { ReactNode, CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  padding?: number | string
  style?: CSSProperties
  className?: string
}

export function Card({ children, padding = 20, style, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--color-raised)',
        border:          '1px solid var(--color-border)',
        borderRadius:    'var(--radius-card)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
