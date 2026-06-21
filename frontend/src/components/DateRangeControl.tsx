// Global date range control — sits in its own bar below the main nav so it's
// unmistakably the master filter that governs ALL charts and tables.
// Phase 3: visual; Phase 6 wires to adapter date filtering.

import { useState, useEffect, useRef } from 'react'
import { CalendarBlank, CaretDown, Check } from '@phosphor-icons/react'

export type Period = '7d' | '30d' | '90d' | 'may-26' | 'apr-26' | 'mar-26' | 'q2-26' | 'q1-26' | 'h1-26' | 'year-26'

function rollingPeriodSub(days: number): string {
  const end   = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`
}

const PERIOD_GROUPS: { heading: string; options: { value: Period; label: string; sub: string }[] }[] = [
  {
    heading: 'Rolling',
    options: [
      { value: '7d',     label: 'Last 7 days',    sub: rollingPeriodSub(7)  },
      { value: '30d',    label: 'Last 30 days',   sub: rollingPeriodSub(30) },
      { value: '90d',    label: 'Last 90 days',   sub: rollingPeriodSub(90) },
    ],
  },
  {
    heading: 'Month',
    options: [
      { value: 'may-26', label: 'May 2026',        sub: 'May 1 – May 31'        },
      { value: 'apr-26', label: 'April 2026',      sub: 'Apr 1 – Apr 30'        },
      { value: 'mar-26', label: 'March 2026',      sub: 'Mar 1 – Mar 31'        },
    ],
  },
  {
    heading: 'Quarter',
    options: [
      { value: 'q2-26',  label: 'Q2 2026',         sub: 'Apr 1 – Jun 30, 2026'  },
      { value: 'q1-26',  label: 'Q1 2026',         sub: 'Jan 1 – Mar 31, 2026'  },
    ],
  },
  {
    heading: 'Longer',
    options: [
      { value: 'h1-26',  label: 'H1 2026',         sub: 'Jan 1 – Jun 30, 2026'  },
      { value: 'year-26',label: 'Full year 2026',   sub: 'Jan 1 – Dec 31, 2026'  },
    ],
  },
]

// Flat lookup for the current period label
const ALL_PERIODS = PERIOD_GROUPS.flatMap(g => g.options)

// Map each named calendar period to its natural predecessor (for delta display).
// Rolling and multi-month periods don't have a stable predecessor → return null.
const PREV_PERIOD: Partial<Record<Period, Period>> = {
  'may-26': 'apr-26',
  'apr-26': 'mar-26',
  'q2-26':  'q1-26',
}

/** Returns the prior calendar period for delta computation, or null when not applicable. */
export function prevPeriodOf(period: Period): Period | null {
  return PREV_PERIOD[period] ?? null
}

interface DateRangeControlProps {
  value:    Period
  onChange: (p: Period) => void
}

export function DateRangeControl({ value, onChange }: DateRangeControlProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const current = ALL_PERIODS.find(p => p.value === value) ?? ALL_PERIODS[2]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display:         'inline-flex',
          alignItems:      'center',
          gap:             8,
          height:          36,
          padding:         '0 16px',
          backgroundColor: 'transparent',
          border:          'none',
          cursor:          'pointer',
          fontFamily:      'var(--font-ui)',
          fontSize:        'var(--text-body)',
          fontWeight:      500,
          color:           'var(--color-ink)',
          whiteSpace:      'nowrap',
          borderRadius:    'var(--radius-btn)',
          transition:      'background-color 120ms ease',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(36,31,24,0.05)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
      >
        <CalendarBlank weight="fill" size={16} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
        <span>{current.label}</span>
        <CaretDown weight="bold" size={12} style={{ color: 'var(--color-faint)' }} />
      </button>

      {open && (
        <div
          style={{
            position:        'absolute',
            top:             'calc(100% + 4px)',
            right:           0,
            backgroundColor: 'var(--color-raised)',
            border:          '1px solid var(--color-border)',
            borderRadius:    'var(--radius-card)',
            boxShadow:       'var(--shadow-overlay)',
            zIndex:          200,
            minWidth:        260,
            overflow:        'hidden',
          }}
        >
          {PERIOD_GROUPS.map((group, gi) => (
            <div key={group.heading}>
              {/* Group heading */}
              <div style={{ padding: '8px 14px 4px', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-fainter)', letterSpacing: '0.06em', textTransform: 'uppercase', borderTop: gi > 0 ? '1px solid var(--color-border)' : 'none', marginTop: gi > 0 ? 0 : 0 }}>
                {group.heading}
              </div>
              {group.options.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', cursor: 'pointer', backgroundColor: opt.value === value ? 'var(--color-tile)' : 'transparent', transition: 'background-color 80ms ease' }}
                  onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-tile)' }}
                  onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', fontWeight: opt.value === value ? 500 : 400, color: 'var(--color-ink)' }}>{opt.label}</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>{opt.sub}</div>
                  </div>
                  {opt.value === value && <Check weight="bold" size={13} color="#3B6D11" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Period bar — the full-width sub-header ────────────────────────────────────
// Sits between the nav and the view content. The warm tint and full-width
// placement make it unmistakable as the master data filter.

export function PeriodBar({ value, onChange }: DateRangeControlProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-tile)',
        borderBottom:    '1px solid var(--color-border)',
        padding:         '0 28px',
      }}
    >
      <div
        style={{
          maxWidth:       1240,
          margin:         '0 auto',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'flex-end',
          height:         40,
        }}
      >
        {/* Right-aligned picker — the dropdown opens leftward so it stays in viewport */}
        <DateRangeControl value={value} onChange={onChange} />
      </div>
    </div>
  )
}
