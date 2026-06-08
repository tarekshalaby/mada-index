import { CaretDown, X } from '@phosphor-icons/react'

// Filter chip — §10.3.
// Empty state: outline + caret. Set state: ink-tinted fill + clear ✕.
// Generous padding for comfortable, spacious feel (§9 density principle).

interface FilterChipProps {
  label: string
  value?: string   // undefined = empty / unset
  onClear?: () => void
  onClick?: () => void
}

export function FilterChip({ label, value, onClear, onClick }: FilterChipProps) {
  const isSet = value !== undefined

  return (
    <button
      onClick={onClick}
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        gap:             6,
        height:          36,
        padding:         '0 14px',
        fontFamily:      'var(--font-ui)',
        fontSize:        'var(--text-label)',
        fontWeight:      isSet ? 500 : 400,
        color:           isSet ? 'var(--color-ink)' : 'var(--color-muted)',
        backgroundColor: isSet ? '#ECE6D9' : 'var(--color-raised)',
        border:          isSet
          ? '1px solid var(--color-border-strong)'
          : '1px solid var(--color-border)',
        borderRadius:    'var(--radius-pill)',
        cursor:          'pointer',
        whiteSpace:      'nowrap',
        transition:      'background-color 120ms ease, border-color 120ms ease',
      }}
    >
      <span>{isSet ? `${label}: ${value}` : label}</span>

      {isSet ? (
        <span
          onClick={e => { e.stopPropagation(); onClear?.() }}
          style={{
            display:    'flex',
            alignItems: 'center',
            color:      'var(--color-faint)',
          }}
        >
          <X weight="bold" size={12} />
        </span>
      ) : (
        <CaretDown weight="bold" size={12} style={{ color: 'var(--color-faint)' }} />
      )}
    </button>
  )
}
