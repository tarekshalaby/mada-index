import { useState, useEffect, type ReactNode } from 'react'
import { SquaresFour, Newspaper, Article, ChartBar, FileText, Users } from '@phosphor-icons/react'
import { OverviewView }          from './views/OverviewView'
import { StoriesView }           from './views/StoriesView'
import { ContentView }           from './views/ContentView'
import { PlatformsView }         from './views/PlatformsView'
import { ReportsView }           from './views/HeadlinesView'
import { ContributorsView }      from './views/ContributorsView'
import { PeriodBar, type Period } from './components/DateRangeControl'
import { initAdapter, getLastSyncTime } from './data/adapter'

export type View = 'overview' | 'stories' | 'content' | 'platforms' | 'team' | 'reports'

// Primary nav tabs — Reports is a secondary action (button on the right)
const NAV_ITEMS: { id: Exclude<View, 'reports'>; label: string; icon: ReactNode }[] = [
  { id: 'overview',  label: 'Overview',  icon: <SquaresFour weight="fill" size={16} /> },
  { id: 'stories',   label: 'Stories',   icon: <Newspaper   weight="fill" size={16} /> },
  { id: 'content',   label: 'Content',   icon: <Article     weight="fill" size={16} /> },
  { id: 'platforms', label: 'Platforms', icon: <ChartBar    weight="fill" size={16} /> },
  { id: 'team',      label: 'Team',      icon: <Users       weight="fill" size={16} /> },
]

export default function App() {
  const [activeView,     setActiveView    ] = useState<View>('overview')
  const [pendingStoryId, setPendingStoryId] = useState<string | null>(null)
  const [period,         setPeriod        ] = useState<Period>('30d')
  const [dataReady,      setDataReady     ] = useState(false)
  const [dataError,      setDataError     ] = useState<string | null>(null)
  const [loadPct,        setLoadPct       ] = useState(0)
  const [loadLabel,      setLoadLabel     ] = useState('Connecting…')

  // Fetch live Airtable data once on mount.
  // initAdapter() is a no-op when VITE_AIRTABLE_TOKEN is absent (stays on sample data).
  useEffect(() => {
    initAdapter((pct, label) => {
      setLoadPct(pct)
      setLoadLabel(label)
    })
      .then(() => setDataReady(true))
      .catch((err: unknown) => {
        console.error('Airtable load failed:', err)
        setDataError(String(err instanceof Error ? err.message : err))
        setDataReady(true)  // still render — shows whatever data is cached (may be partial)
      })
  }, [])

  function navigateToStory(id: string) {
    setPendingStoryId(id)
    setActiveView('stories')
  }

  function navigateToContent(_platform?: string) {
    setActiveView('content')
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (!dataReady) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
          Mada Index
        </div>

        {/* Progress bar */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 4, backgroundColor: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${loadPct}%`, backgroundColor: 'var(--color-ink)', borderRadius: 2, transition: 'width 300ms ease' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)', textAlign: 'center' }}>
            {loadPct < 100 ? `Loading ${loadLabel}…` : 'Building dashboard…'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--color-paper)', minHeight: '100vh' }}>
      {dataError && (
        <div style={{ backgroundColor: '#FEF2F2', borderBottom: '1px solid #FECACA', padding: '8px 28px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#991B1B' }}>
          Live data partially unavailable — {dataError}. Showing what loaded.
        </div>
      )}

      {/* ── Top nav ───────────────────────────────────────── */}
      <header
        className="no-print"
        style={{
          backgroundColor: 'var(--color-raised)',
          borderBottom:    '1px solid var(--color-border)',
          position:        'sticky',
          top:             0,
          zIndex:          10,
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'stretch' }}>

          {/* Primary nav tabs */}
          <nav style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
            {NAV_ITEMS.map(({ id, label, icon }) => {
              const active = activeView === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveView(id)}
                  style={{
                    background:   'none',
                    border:       'none',
                    cursor:       'pointer',
                    padding:      '0 16px',
                    height:       52,
                    fontFamily:   'var(--font-ui)',
                    fontSize:     'var(--text-label)',
                    fontWeight:   active ? 500 : 400,
                    color:        active ? 'var(--color-ink)' : 'var(--color-muted)',
                    borderBottom: active ? '2px solid var(--color-ink)' : '2px solid transparent',
                    transition:   'color 120ms ease, border-color 120ms ease',
                    whiteSpace:   'nowrap',
                    display:      'inline-flex',
                    alignItems:   'center',
                    gap:          7,
                  }}
                >
                  {icon}
                  {label}
                </button>
              )
            })}
          </nav>

          {/* Right side: last-sync label + Reports button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {(() => {
              const iso = getLastSyncTime()
              if (!iso) return null
              const d = new Date(iso)
              const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              return (
                <span style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize:   'var(--text-caption)',
                  color:      'var(--color-fainter)',
                  whiteSpace: 'nowrap',
                }}>
                  Updated {label}
                </span>
              )
            })()}
            <button
              onClick={() => setActiveView('reports')}
              style={{
                display:         'inline-flex',
                alignItems:      'center',
                gap:             6,
                height:          34,
                padding:         '0 14px',
                backgroundColor: activeView === 'reports' ? 'var(--color-ink)' : 'transparent',
                color:           activeView === 'reports' ? 'var(--color-paper)' : 'var(--color-muted)',
                border:          `1px solid ${activeView === 'reports' ? 'var(--color-ink)' : 'var(--color-border-strong)'}`,
                borderRadius:    'var(--radius-btn)',
                fontFamily:      'var(--font-ui)',
                fontSize:        'var(--text-label)',
                fontWeight:      500,
                cursor:          'pointer',
                transition:      'all 120ms ease',
                whiteSpace:      'nowrap',
              }}
            >
              <FileText weight="fill" size={14} />
              Reports
            </button>
          </div>
        </div>
      </header>

      {/* ── Period bar — full-width master date filter ─────── */}
      <PeriodBar value={period} onChange={setPeriod} />

      {/* ── Views ─────────────────────────────────────────── */}
      <main>
        {activeView === 'overview'  && <OverviewView period={period} onSelectStory={navigateToStory} onSelectPlatform={navigateToContent} />}
        {activeView === 'stories'   && <StoriesView  period={period} initialStoryId={pendingStoryId} onBack={() => setPendingStoryId(null)} />}
        {activeView === 'content'   && <ContentView  period={period} onSelectStory={navigateToStory} />}
        {activeView === 'platforms' && <PlatformsView period={period} />}
        {activeView === 'team'      && <ContributorsView period={period} />}
        {activeView === 'reports'   && <ReportsView period={period} onSelectStory={(id) => { navigateToStory(id) }} />}
      </main>
    </div>
  )
}
