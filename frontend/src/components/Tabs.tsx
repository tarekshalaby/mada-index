// Underline tabs — sub-navigation within a view (Platforms: Comparison/Audience/Treatments).
// §10.2: active = ink text + 2px ink underline; inactive = muted.

interface TabOption<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  options: TabOption<T>[]
  value: T
  onChange: (value: T) => void
  height?: number
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  height = 40,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      style={{
        display:    'flex',
        alignItems: 'stretch',
        gap:        0,
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={{
              background:   'none',
              border:       'none',
              borderBottom: active ? '2px solid var(--color-ink)' : '2px solid transparent',
              marginBottom: -1,
              cursor:       'pointer',
              padding:      `0 16px`,
              height,
              fontFamily:   'var(--font-ui)',
              fontSize:     'var(--text-label)',
              fontWeight:   active ? 500 : 400,
              color:        active ? 'var(--color-ink)' : 'var(--color-muted)',
              whiteSpace:   'nowrap',
              transition:   'color 120ms ease, border-color 120ms ease',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
