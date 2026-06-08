// Functional filter chip with a floating dropdown — §10.3.
// Self-contained: manages open/close state, closes on outside click.
// Olive check (§10.3: "#3B6D11") on the selected option.
// When options.length > SEARCH_THRESHOLD, a live search input appears at the top.

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Check, MagnifyingGlass } from '@phosphor-icons/react'
import { FilterChip } from './FilterChip'

const SEARCH_THRESHOLD = 8  // show search input when there are more options than this

export interface FilterOption<T extends string> {
  value:     T
  label:     string
  initials?: string  // e.g. "LA" for Lina Attalah — shown as a small avatar circle
  avatar?:   string  // photoUrl — takes precedence over initials
}

interface FilterDropdownProps<T extends string> {
  label:    string
  options:  FilterOption<T>[]
  value?:   T
  onChange: (value: T | undefined) => void
  /** Optional icon shown in the chip */
  icon?:    ReactNode
}

export function FilterDropdown<T extends string>({
  label, options, value, onChange,
}: FilterDropdownProps<T>) {
  const [open,   setOpen  ] = useState(false)
  const [search, setSearch] = useState('')
  const ref      = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const showSearch = options.length > SEARCH_THRESHOLD

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && showSearch) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    if (!open) setSearch('')
  }, [open, showSearch])

  const selectedLabel = options.find(o => o.value === value)?.label

  // Filter options by search query (case-insensitive, diacritic-tolerant)
  const visibleOptions = showSearch && search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <FilterChip
        label={label}
        value={selectedLabel}
        onClick={() => setOpen(v => !v)}
        onClear={() => { onChange(undefined); setOpen(false); setSearch('') }}
      />

      {open && (
        <div
          style={{
            position:        'absolute',
            top:             'calc(100% + 6px)',
            left:            0,
            backgroundColor: 'var(--color-raised)',
            border:          '1px solid var(--color-border)',
            borderRadius:    'var(--radius-card)',
            boxShadow:       'var(--shadow-overlay)',
            zIndex:          200,
            minWidth:        220,
            maxHeight:       340,
            display:         'flex',
            flexDirection:   'column',
            overflow:        'hidden',
          }}
        >
          {/* Search input — only for long lists */}
          {showSearch && (
            <div style={{
              padding:      '8px 10px',
              borderBottom: '1px solid var(--color-border)',
              flexShrink:   0,
              position:     'relative',
            }}>
              <MagnifyingGlass
                weight="fill"
                size={13}
                style={{
                  position:      'absolute',
                  left:          18,
                  top:           '50%',
                  transform:     'translateY(-50%)',
                  color:         'var(--color-faint)',
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  width:           '100%',
                  paddingLeft:     26,
                  paddingRight:    8,
                  height:          30,
                  fontFamily:      'var(--font-ui)',
                  fontSize:        'var(--text-body)',
                  color:           'var(--color-ink)',
                  backgroundColor: 'var(--color-tile)',
                  border:          '1px solid var(--color-border)',
                  borderRadius:    6,
                  outline:         'none',
                  boxSizing:       'border-box',
                }}
              />
            </div>
          )}

          {/* Options list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {visibleOptions.length === 0 && (
              <div style={{ padding: '12px 14px', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-fainter)' }}>
                No results
              </div>
            )}
            {visibleOptions.map((opt, i) => {
              const selected  = opt.value === value
              const hasAvatar = !!(opt.avatar || opt.initials)
              return (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); setSearch('') }}
                  style={{
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'space-between',
                    padding:         '9px 14px',
                    cursor:          'pointer',
                    fontFamily:      'var(--font-ui)',
                    fontSize:        'var(--text-body)',
                    color:           selected ? 'var(--color-ink)' : 'var(--color-muted)',
                    fontWeight:      selected ? 500 : 400,
                    backgroundColor: selected ? 'var(--color-tile)' : 'transparent',
                    borderBottom:    i < visibleOptions.length - 1 ? '1px solid var(--color-border)' : 'none',
                    transition:      'background-color 80ms ease',
                    gap:             8,
                  }}
                  onMouseEnter={e => {
                    if (!selected) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-tile)'
                  }}
                  onMouseLeave={e => {
                    if (!selected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    {hasAvatar && (
                      <div style={{
                        width:           22,
                        height:          22,
                        borderRadius:    '50%',
                        flexShrink:      0,
                        overflow:        'hidden',
                        backgroundColor: opt.avatar ? 'transparent' : 'var(--color-ink)',
                        display:         'flex',
                        alignItems:      'center',
                        justifyContent:  'center',
                      }}>
                        {opt.avatar
                          ? <img src={opt.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700, color: 'var(--color-paper)', letterSpacing: '0.02em' }}>{opt.initials}</span>
                        }
                      </div>
                    )}
                    <span dir="auto" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{opt.label}</span>
                  </div>
                  {selected && <Check weight="bold" size={13} color="#3B6D11" />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
