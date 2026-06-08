import { getPercentileBand } from '../lib/metrics'

// Percentile badge — §10.7. Number + mini horizontal bar, green/neutral/red.
// Colour = top quartile (≥75) green · middle neutral · bottom (≤25) red.

interface PercentileBadgeProps {
  percentile: number  // 0–100, pre-computed client-side within Type
}

const BAR_COLOR: Record<ReturnType<typeof getPercentileBand>, string> = {
  top:    'var(--color-good-solid)',
  middle: 'var(--color-neutral-text)',
  bottom: 'var(--color-bad-text)',
}
const TEXT_COLOR: Record<ReturnType<typeof getPercentileBand>, string> = {
  top:    'var(--color-good-text)',
  middle: 'var(--color-neutral-text)',
  bottom: 'var(--color-bad-text)',
}

export function PercentileBadge({ percentile }: PercentileBadgeProps) {
  const band  = getPercentileBand(percentile)
  const color = BAR_COLOR[band]
  const text  = TEXT_COLOR[band]

  return (
    <span
      style={{
        display:    'inline-flex',
        alignItems: 'center',
        gap:        6,
      }}
    >
      {/* Number */}
      <span
        style={{
          fontFamily:          'var(--font-ui)',
          fontSize:            'var(--text-label)',
          fontWeight:          500,
          fontVariantNumeric:  'tabular-nums lining-nums',
          color:               text,
          minWidth:            26,
          textAlign:           'right',
        }}
      >
        {percentile}
      </span>

      {/* Mini bar */}
      <span
        style={{
          display:         'block',
          width:           36,
          height:          4,
          backgroundColor: 'var(--color-border)',
          borderRadius:    2,
          overflow:        'hidden',
          flexShrink:      0,
        }}
      >
        <span
          style={{
            display:         'block',
            width:           `${Math.min(percentile, 100)}%`,
            height:          '100%',
            backgroundColor: color,
            borderRadius:    2,
          }}
        />
      </span>
    </span>
  )
}
