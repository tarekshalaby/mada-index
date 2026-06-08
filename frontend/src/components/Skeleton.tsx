// Skeleton loading states — §12: "warm skeletons (tile/row placeholders in #F3EEE3)
// with a faint shimmer; spinners only inline for actions, never full-page."
// The shimmer keyframe is defined in index.css.

import type { CSSProperties } from 'react'

// ─── Base shimmer block ────────────────────────────────────────────────────────

interface SkeletonProps {
  width?:        number | string
  height?:       number | string
  borderRadius?: number | string
  style?:        CSSProperties
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        backgroundColor: 'var(--color-tile)',
        borderRadius,
        width,
        height,
        flexShrink:      0,
        ...style,
      }}
    />
  )
}

// ─── KPI tile skeleton ─────────────────────────────────────────────────────────

export function SkeletonKpiTile() {
  return (
    <div style={{
      backgroundColor: 'var(--color-tile)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-card)',
      padding:         20,
      display:         'flex',
      flexDirection:   'column',
      gap:             12,
    }}>
      <Skeleton height={12} width={80} />
      <Skeleton height={30} width={100} borderRadius={4} />
      <Skeleton height={20} width={56} borderRadius={10} />
    </div>
  )
}

// ─── Story row skeleton ────────────────────────────────────────────────────────

export function SkeletonStoryRow() {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          20,
      padding:      '18px 0',
      borderBottom: '1px solid var(--color-border)',
    }}>
      {/* Thumbnail */}
      <Skeleton width={96} height={96} borderRadius={8} style={{ flexShrink: 0 }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton height={18} width="85%" />
        <Skeleton height={12} width="50%" />
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <Skeleton height={12} width={60} borderRadius={10} />
          <Skeleton height={12} width={40} borderRadius={10} />
        </div>
      </div>

      {/* Metric */}
      <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <Skeleton height={20} width={64} borderRadius={4} />
        <Skeleton height={12} width={44} borderRadius={10} />
      </div>
    </div>
  )
}

// ─── Content table row skeleton ────────────────────────────────────────────────

export function SkeletonContentRow() {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '60px 1fr 76px 82px 82px 68px 76px 68px 68px',
      gap:                 8,
      alignItems:          'center',
      padding:             '10px 12px',
      borderBottom:        '1px solid var(--color-border)',
    }}>
      <Skeleton width={60} height={44} borderRadius={6} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton height={14} width="90%" />
        <Skeleton height={10} width="40%" borderRadius={10} />
      </div>
      {[72, 60, 60, 48, 52, 44, 44].map((w, i) => (
        <Skeleton key={i} height={13} width={w} borderRadius={4} style={{ justifySelf: 'end' }} />
      ))}
    </div>
  )
}

// ─── Card skeleton (generic) ───────────────────────────────────────────────────

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-raised)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-card)',
      padding:         20,
      display:         'flex',
      flexDirection:   'column',
      gap:             10,
      height,
    }}>
      <Skeleton height={14} width="60%" />
      <Skeleton height={10} width="40%" />
      <Skeleton height={10} width="80%" style={{ marginTop: 'auto' }} />
    </div>
  )
}

// ─── Overview KPI row skeleton ─────────────────────────────────────────────────

export function SkeletonOverview() {
  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 28px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 40 }}>
        {Array.from({ length: 5 }, (_, i) => <SkeletonKpiTile key={i} />)}
      </div>
      <SkeletonCard height={300} />
    </div>
  )
}

// ─── Stories list skeleton ─────────────────────────────────────────────────────

export function SkeletonStoriesList() {
  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 28px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Skeleton height={26} width={120} />
        <Skeleton height={36} width={260} borderRadius={20} />
      </div>
      {Array.from({ length: 4 }, (_, i) => <SkeletonStoryRow key={i} />)}
    </div>
  )
}
