// Filled pill toggle — for display options (day/week/month, AR/EN segment).
// §10.2: track = tile fill + hairline; active segment = ink fill + paper text.
// Animated: a sliding background pill transitions to the active option.

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface ToggleOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode    // optional Phosphor icon
}

interface ToggleProps<T extends string> {
  options: ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function Toggle<T extends string>({ options, value, onChange }: ToggleProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const btnRefs      = useRef<(HTMLButtonElement | null)[]>([])
  const [pill, setPill] = useState({ left: 2, width: 0, ready: false })

  // Measure the active button's position synchronously (before paint) so the
  // pill appears at the right place on first render without animating from zero.
  useLayoutEffect(() => {
    const activeIdx = options.findIndex(o => o.value === value)
    const btn = btnRefs.current[activeIdx]
    const container = containerRef.current
    if (!btn || !container) return

    const cRect = container.getBoundingClientRect()
    const bRect = btn.getBoundingClientRect()

    setPill(prev => ({
      left:  bRect.left  - cRect.left - 2,
      width: bRect.width,
      ready: prev.ready,  // keep ready as-is on first measure
    }))

    // Enable transition on the next frame so the initial placement is instant
    requestAnimationFrame(() => setPill(p => ({ ...p, ready: true })))
  }, [value, options])

  return (
    <div
      ref={containerRef}
      role="group"
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        position:        'relative',
        backgroundColor: 'var(--color-tile)',
        border:          '1px solid var(--color-border)',
        borderRadius:    'var(--radius-pill)',
        padding:         2,
      }}
    >
      {/* Sliding pill — animates on value change */}
      <span
        aria-hidden
        style={{
          position:        'absolute',
          top:             2,
          left:            pill.left,
          width:           pill.width,
          height:          'calc(100% - 4px)',
          backgroundColor: 'var(--color-ink)',
          borderRadius:    'var(--radius-pill)',
          transition:      pill.ready ? 'left 160ms ease, width 160ms ease' : 'none',
          pointerEvents:   'none',
          zIndex:          0,
        }}
      />

      {options.map((opt, i) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            ref={el => { btnRefs.current[i] = el }}
            onClick={() => onChange(opt.value)}
            style={{
              position:   'relative',
              zIndex:     1,
              background: 'none',
              border:     'none',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--font-ui)',
              fontSize:   'var(--text-label)',
              fontWeight: active ? 500 : 400,
              color:      active ? 'var(--color-paper)' : 'var(--color-muted)',
              padding:    opt.icon ? '6px 14px 6px 11px' : '6px 14px',
              cursor:     'pointer',
              whiteSpace: 'nowrap',
              display:    'inline-flex',
              alignItems: 'center',
              gap:        5,
              transition: 'color 120ms ease',
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
