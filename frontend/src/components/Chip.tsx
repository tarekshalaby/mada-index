import { ArrowUpRight, ArrowDownRight, Minus } from '@phosphor-icons/react'
import {
  computeBenchmarkState,
  computeDeltaPct,
} from '../lib/metrics'
import type { MetricPolarity, BenchmarkState } from '../data/types'

// Delta chip — §8. Arrow + % change, benchmark-coloured.
// Colour encodes good/bad; arrow encodes direction. Decoupled.
// Dead-band: <1% absolute change renders flat/grey (no colour noise).

interface ChipProps {
  current: number
  previous: number | null   // null = no prior data → shows "—" with neutral styling
  polarity?: MetricPolarity
}

const BG:   Record<BenchmarkState, string> = {
  good:    'var(--color-good-bg)',
  bad:     'var(--color-bad-bg)',
  neutral: 'var(--color-neutral-bg)',
}
const TEXT: Record<BenchmarkState, string> = {
  good:    'var(--color-good-text)',
  bad:     'var(--color-bad-text)',
  neutral: 'var(--color-neutral-text)',
}

export function Chip({ current, previous, polarity = 'good-up' }: ChipProps) {
  const state  = computeBenchmarkState(current, previous, polarity)
  const delta  = computeDeltaPct(current, previous)
  const isUp   = (delta ?? 0) > 0
  const isFlat = state === 'neutral'

  // Diagonal arrows — ArrowUpRight ↗ / ArrowDownRight ↘ match the slope convention
  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight

  // Arrow direction already encodes sign — no redundant +/−
  const label = delta !== null ? `${Math.abs(Math.round(delta))}%` : '—'

  return (
    <span
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        gap:             3,
        fontFamily:      'var(--font-ui)',
        fontSize:        'var(--text-caption)',
        fontWeight:      500,
        fontVariantNumeric: 'tabular-nums lining-nums',
        color:           TEXT[state],
        backgroundColor: BG[state],
        borderRadius:    'var(--radius-pill)',
        padding:         '2px 7px',
        whiteSpace:      'nowrap',
      }}
    >
      <Icon weight="bold" size={10} />
      {label}
    </span>
  )
}
