import type { CSSProperties } from 'react'
import {
  Globe, FacebookLogo, InstagramLogo, XLogo,
  YoutubeLogo, LinkedinLogo, EnvelopeSimple, Microphone,
} from '@phosphor-icons/react'
import type { Platform } from '../data/types'

// ─── Platform config ──────────────────────────────────────────────────────────
// Single source of truth for platform identity (colour + icon + label).
// Colours from Design Language doc §2.1 — the platform palette.

type PhosphorIconComponent = typeof Globe  // all Phosphor icons share this ForwardRef type

export const PLATFORM_CONFIG: Record<Platform, {
  label: string
  color: string
  Icon: PhosphorIconComponent
}> = {
  website:    { label: 'Website',    color: '#E37400', Icon: Globe          },
  facebook:   { label: 'Facebook',   color: '#1877F2', Icon: FacebookLogo   },
  instagram:  { label: 'Instagram',  color: '#8A3AB9', Icon: InstagramLogo  },
  x:          { label: 'X',          color: '#15181C', Icon: XLogo          },
  youtube:    { label: 'YouTube',    color: '#C0392B', Icon: YoutubeLogo    },
  linkedin:   { label: 'LinkedIn',   color: '#08538D', Icon: LinkedinLogo   },
  newsletter: { label: 'Newsletter', color: '#E0A526', Icon: EnvelopeSimple },
  podcast:    { label: 'Podcast',    color: '#1DB954', Icon: Microphone     },
}

// Canonical platform ordering for the journey (website → socials → email)
export const JOURNEY_PLATFORM_ORDER: Platform[] = [
  'website', 'facebook', 'instagram', 'x', 'linkedin', 'youtube', 'newsletter', 'podcast',
]

// ─── Component ────────────────────────────────────────────────────────────────

interface PlatformBadgeProps {
  platform: Platform
  /** 'dot'        — 8px filled circle only
   *  'icon-sm'    — 14px icon, platform colour, no label (story row indicators)
   *  'icon'       — icon only in platform colour
   *  'icon-label' — icon + uppercase label (journey group headers)
   */
  variant?: 'dot' | 'icon-sm' | 'icon' | 'icon-label'
  size?: number  // icon size in px (ignored for 'dot')
  style?: CSSProperties
}

export function PlatformBadge({
  platform,
  variant = 'icon',
  size = 16,
  style,
}: PlatformBadgeProps) {
  const { label, color, Icon } = PLATFORM_CONFIG[platform]

  if (variant === 'icon-sm') {
    return (
      <span
        title={label}
        style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, ...style }}
      >
        <Icon weight="fill" size={14} color={color} />
      </span>
    )
  }

  if (variant === 'dot') {
    return (
      <span
        title={label}
        style={{
          display:         'inline-block',
          width:           8,
          height:          8,
          borderRadius:    '50%',
          backgroundColor: color,
          flexShrink:      0,
          ...style,
        }}
      />
    )
  }

  if (variant === 'icon-label') {
    return (
      <span
        style={{
          display:    'inline-flex',
          alignItems: 'center',
          gap:        5,
          ...style,
        }}
      >
        <Icon weight="fill" size={size} color={color} />
        <span
          style={{
            fontFamily:    'var(--font-ui)',
            fontSize:      'var(--text-label)',
            fontWeight:    600,
            color,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      </span>
    )
  }

  // 'icon' (default)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
      <Icon weight="fill" size={size} color={color} />
    </span>
  )
}
