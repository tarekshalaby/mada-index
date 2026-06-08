import { useState, type ReactNode } from 'react'

// Warm-card tooltip — §6.5: "small warm card (#FFFDF7, hairline, muted label + tabular value)".
// Used for metric labels so users can learn what each metric means on hover.

interface TooltipProps {
  tip: ReactNode     // the tooltip content
  children: ReactNode
  /** 'above' (default) shows the tip above the anchor; 'below' shows it below.
   *  Use 'below' when the anchor is near the top of a clipped container. */
  placement?: 'above' | 'below'
}

export function Tooltip({ tip, children, placement = 'above' }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  // If tip is null/empty, render children directly — no tooltip behaviour
  if (!tip) return <span style={{ display: 'inline-flex', alignItems: 'center' }}>{children}</span>

  const verticalStyle = placement === 'below'
    ? { top: 'calc(100% + 8px)', bottom: 'auto' }
    : { bottom: 'calc(100% + 8px)', top: 'auto' }

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          style={{
            position:  'absolute',
            ...verticalStyle,
            left:      '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--color-raised)',
            border:          '1px solid var(--color-border)',
            borderRadius:    'var(--radius-card)',
            boxShadow:       'var(--shadow-overlay)',
            padding:         '10px 14px',
            minWidth:        200,
            maxWidth:        300,
            zIndex:          200,
            pointerEvents:   'none',
            whiteSpace:      'normal',
            textAlign:       'left',
          }}
        >
          {tip}
        </span>
      )}
    </span>
  )
}

// Reusable metric tooltip content — full name + plain-language description
interface MetricTipProps {
  name: string
  description: string
}

export function MetricTip({ name, description }: MetricTipProps) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontFamily: 'var(--font-ui)',
        fontSize:   'var(--text-label)',
        fontWeight: 600,
        color:      'var(--color-ink)',
      }}>
        {name}
      </span>
      <span style={{
        fontFamily: 'var(--font-ui)',
        fontSize:   'var(--text-caption)',
        color:      'var(--color-muted)',
        lineHeight: 1.5,
      }}>
        {description}
      </span>
    </span>
  )
}
