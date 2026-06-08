// Empty state — §12: "typographic/glyph treatment … muted 24px glyph. Never a blank void."
// Used whenever a list, table, or view has no content to show.

import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** Phosphor icon at 32px — use weight="fill" */
  icon:     ReactNode
  title:    string
  body?:    string
  action?:  ReactNode
  /** Padding override — defaults to comfortable 56px top/bottom */
  padding?: number | string
}

export function EmptyState({ icon, title, body, action, padding = '56px 24px' }: EmptyStateProps) {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding,
        gap:            10,
        textAlign:      'center',
      }}
    >
      {/* Glyph tile — warm tone, hairline, muted icon (§7 fallback pattern) */}
      <div
        style={{
          width:           56,
          height:          56,
          borderRadius:    12,
          backgroundColor: '#F1EAD9',
          border:          '1px solid var(--color-border)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          color:           'var(--color-border-strong)',
          marginBottom:    4,
        }}
      >
        {icon}
      </div>

      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize:   'var(--text-title-row)',
        fontWeight: 500,
        color:      'var(--color-ink)',
        lineHeight: 1.4,
      }}>
        {title}
      </div>

      {body && (
        <div style={{
          fontFamily: 'var(--font-ui)',
          fontSize:   'var(--text-body)',
          color:      'var(--color-muted)',
          maxWidth:   320,
          lineHeight: 1.5,
        }}>
          {body}
        </div>
      )}

      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  )
}
