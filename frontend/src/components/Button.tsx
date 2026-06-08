import type { ReactNode, ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: ReactNode
  children?: ReactNode
}

const BASE: React.CSSProperties = {
  display:       'inline-flex',
  alignItems:    'center',
  justifyContent: 'center',
  gap:           6,
  border:        'none',
  cursor:        'pointer',
  fontFamily:    'var(--font-ui)',
  fontSize:      'var(--text-data)',
  fontWeight:    500,
  lineHeight:    1,
  whiteSpace:    'nowrap',
  transition:    'opacity 120ms ease, background-color 120ms ease',
  borderRadius:  'var(--radius-btn)',
  padding:       '0 14px',
  height:        34,
  outline:       'none',
  textDecoration: 'none',
}

const VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-ink)',
    color:           'var(--color-paper)',
  },
  secondary: {
    backgroundColor: 'var(--color-raised)',
    color:           'var(--color-ink)',
    border:          '1px solid var(--color-border-strong)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color:           'var(--color-muted)',
    padding:         '0 8px',
  },
  icon: {
    backgroundColor: 'transparent',
    color:           'var(--color-ink)',
    border:          '1px solid var(--color-border)',
    padding:         0,
    width:           34,
    borderRadius:    'var(--radius-btn)',
  },
}

export function Button({
  variant = 'secondary',
  icon,
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        ...(disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  )
}
