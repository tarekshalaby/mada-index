// Error state — §12: "a calm inline card (muted, ph-warning, a Retry).
// Red is reserved for genuinely destructive confirmations, not 'fetch failed.'"

import { Warning } from '@phosphor-icons/react'
import { Button }  from './Button'

interface ErrorStateProps {
  title?:   string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title   = 'Something went wrong',
  message = 'Data could not be loaded. Check your connection and try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        gap:             10,
        padding:         '32px 24px',
        backgroundColor: 'var(--color-raised)',
        border:          '1px solid var(--color-border)',
        borderRadius:    'var(--radius-card)',
        textAlign:       'center',
      }}
    >
      {/* Warning icon — muted, not red (§12: red reserved for destructive actions) */}
      <Warning
        weight="fill"
        size={28}
        style={{ color: 'var(--color-muted)' }}
      />

      <div style={{
        fontFamily: 'var(--font-ui)',
        fontSize:   'var(--text-body)',
        fontWeight: 500,
        color:      'var(--color-ink)',
      }}>
        {title}
      </div>

      {message && (
        <div style={{
          fontFamily: 'var(--font-ui)',
          fontSize:   'var(--text-caption)',
          color:      'var(--color-muted)',
          maxWidth:   280,
          lineHeight: 1.5,
        }}>
          {message}
        </div>
      )}

      {onRetry && (
        <Button variant="ghost" onClick={onRetry} style={{ marginTop: 4 }}>
          Retry
        </Button>
      )}
    </div>
  )
}
