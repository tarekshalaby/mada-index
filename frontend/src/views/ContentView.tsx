import { useState, useMemo } from 'react'
import { MagnifyingGlass, CaretUp, CaretDown, Funnel } from '@phosphor-icons/react'
import { getPeriodContent, getAllContributors } from '../data/adapter'
import type { Content, ContentType, Platform, Contributor } from '../data/types'
import { Tag }              from '../components/Tag'
import { EmptyState }       from '../components/EmptyState'
import { FilterDropdown }   from '../components/FilterDropdown'
import { PlatformBadge, PLATFORM_CONFIG, JOURNEY_PLATFORM_ORDER } from '../components/PlatformBadge'
import { Tooltip, MetricTip } from '../components/Tooltip'
import { METRIC_INFO, FORMAT_LABELS, CONTENT_TYPE_LABELS, formatDateShort } from '../lib/labels'
import { formatCompact, computePercentileRank } from '../lib/metrics'
import { ContentDetail }    from './ContentDetail'

type SortCol = 'published' | 'impressions' | 'engagement' | 'siteClicks'
type SortDir = 'desc' | 'asc'

// Columns: thumbnail · content · date · impressions · weighted engagement · site clicks
const GRID = '80px 1fr 72px 110px 126px 80px'

// Minimum peers of the same Type for a percentile bar to be meaningful
const MIN_PEERS = 4

// 5-colour quintile scale — top→bottom green/lime/amber/orange/red
function quintileColor(pctl: number): string {
  return pctl >= 80 ? '#22C55E'
    : pctl >= 60   ? '#84CC16'
    : pctl >= 40   ? '#F59E0B'
    : pctl >= 20   ? '#F97316'
    :                '#EF4444'
}

interface EnrichedContent extends Content {
  exposurePercentile: number | undefined  // undefined when < MIN_PEERS type peers
  qualityPercentile:  number | undefined  // EQR percentile, same suppression
  contributors:       Contributor[]
}

function useEnrichedContent(period?: string): EnrichedContent[] {
  return useMemo(() => {
    const all         = getPeriodContent(period ?? 'may-26')
    const allContribs = getAllContributors()
    const impressionsByType: Partial<Record<ContentType, number[]>> = {}
    const eqrByType:         Partial<Record<ContentType, number[]>> = {}
    for (const c of all) {
      if (!impressionsByType[c.type]) impressionsByType[c.type] = []
      if (!eqrByType[c.type])         eqrByType[c.type]         = []
      impressionsByType[c.type]!.push(c.metrics.impressions)
      eqrByType[c.type]!.push(c.metrics.engagementQualityRate)
    }
    return all.map(c => {
      const impPeers = impressionsByType[c.type] ?? []
      const eqrPeers = eqrByType[c.type]         ?? []
      return {
        ...c,
        exposurePercentile: impPeers.length >= MIN_PEERS
          ? computePercentileRank(c.metrics.impressions, impPeers) : undefined,
        qualityPercentile: eqrPeers.length >= MIN_PEERS
          ? computePercentileRank(c.metrics.engagementQualityRate, eqrPeers) : undefined,
        contributors: c.authorIds
          ? (c.authorIds.map(id => allContribs.find(x => x.id === id)).filter(Boolean) as Contributor[])
          : [],
      }
    })
  }, [period])
}

// ─── Sortable column header ────────────────────────────────────────────────────

function ColHeader({ col, label, sortCol, sortDir, onSort, tip, align = 'right' }: {
  col: SortCol; label: string; sortCol: SortCol; sortDir: SortDir
  onSort: (c: SortCol) => void; tip?: React.ReactNode; align?: 'left' | 'right'
}) {
  const active = sortCol === col
  const labelEl = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 500, color: active ? 'var(--color-ink)' : 'var(--color-fainter)', letterSpacing: '0.04em', textTransform: 'uppercase', userSelect: 'none', whiteSpace: 'nowrap', borderBottom: tip ? '1px dotted var(--color-border-strong)' : 'none' }}>
      {label}
      {active && (sortDir === 'desc' ? <CaretDown weight="bold" size={10} /> : <CaretUp weight="bold" size={10} />)}
    </span>
  )
  return (
    <div style={{ textAlign: align, cursor: 'pointer' }} onClick={() => onSort(col)}>
      {tip ? <Tooltip tip={tip} placement="below">{labelEl}</Tooltip> : labelEl}
    </div>
  )
}

// ─── Content row ───────────────────────────────────────────────────────────────

function ContentRow({ item, onSelect }: { item: EnrichedContent; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false)
  const m = item.metrics
  const isArabic = item.language === 'ar'
  const { Icon } = PLATFORM_CONFIG[item.platform]
  const typeLabel = item.format ? FORMAT_LABELS[item.format] : CONTENT_TYPE_LABELS[item.type]

  // Underline style for a number span — encodes percentile rank via colour
  function underlineStyle(pctl?: number) {
    if (pctl === undefined) return {}
    return { borderBottom: `2px solid ${quintileColor(pctl)}`, paddingBottom: 2, display: 'inline-block' as const }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, alignItems: 'center', padding: '13px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: hovered ? 'rgba(36,31,24,0.04)' : 'transparent', cursor: 'pointer', transition: 'background-color 120ms ease' }}
    >
      {/* Thumbnail — 80×60 (4:3) */}
      <div style={{ width: 80, height: 60, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)', backgroundColor: '#F1EAD9', position: 'relative' }}>
        {item.thumbnailUrl
          ? <img src={item.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon weight="fill" size={24} color="var(--color-fainter)" /></div>
        }
        <span style={{ position: 'absolute', bottom: 2, right: 2, backgroundColor: PLATFORM_CONFIG[item.platform].color, borderRadius: 2, width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon weight="fill" size={8} color="white" />
        </span>
      </div>

      {/* Title + meta */}
      <div style={{ minWidth: 0 }}>
        <div dir="auto" style={{ fontFamily: 'var(--font-display)', fontSize: isArabic ? 15 : 'var(--text-title-row)', fontWeight: isArabic ? 600 : 500, lineHeight: isArabic ? 1.5 : 1.35, color: 'var(--color-ink)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: 3 }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Tag>{typeLabel}</Tag>
          {item.contributors.map(c => {
            const initials = c.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
            return (
              <div key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: c.photoUrl ? 'transparent' : 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {c.photoUrl
                    ? <img src={c.photoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 7, fontWeight: 700, color: 'var(--color-paper)' }}>{initials}</span>
                  }
                </div>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{c.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Date */}
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {formatDateShort(item.publishedAt)}
      </div>

      {/* Impressions — underline colour encodes exposure percentile (within-Type) */}
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-data)', fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', ...underlineStyle(item.exposurePercentile) }}>
          {formatCompact(m.impressions)}
        </span>
      </div>

      {/* Weighted Engagement — underline colour encodes quality (EQR) percentile; full detail on hover */}
      <Tooltip
        tip={<MetricTip name="Weighted Engagement" description={`Engagement Quality: ${m.engagementQualityRate.toFixed(1)} — how deeply the audience engaged relative to reach.`} />}
        placement="below"
      >
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-data)', fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', ...underlineStyle(item.qualityPercentile) }}>
            {formatCompact(m.weightedEngagement)}
          </span>
        </div>
      </Tooltip>

      {/* Site Clicks */}
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-data)', fontWeight: 500, color: m.siteClicks > 0 ? 'var(--color-ink)' : 'var(--color-fainter)', fontVariantNumeric: 'tabular-nums lining-nums', textAlign: 'right' }}>
        {m.siteClicks > 0 ? formatCompact(m.siteClicks) : '—'}
      </div>
    </div>
  )
}

// ─── Content view ──────────────────────────────────────────────────────────────

interface ContentViewProps {
  period?:        string
  onSelectStory?: (id: string) => void
}

const PAGE_SIZE = 25

export function ContentView({ period, onSelectStory }: ContentViewProps) {
  const [activePlatforms, setActivePlatforms] = useState<Set<Platform>>(new Set(JOURNEY_PLATFORM_ORDER))
  const [sortCol,         setSortCol        ] = useState<SortCol>('impressions')
  const [sortDir,         setSortDir        ] = useState<SortDir>('desc')
  const [search,          setSearch         ] = useState('')
  const [filterTopic,     setFilterTopic    ] = useState<string | undefined>()
  const [filterAuthor,    setFilterAuthor   ] = useState<string | undefined>()
  const [filterLanguage,  setFilterLanguage ] = useState<string | undefined>()
  const [selectedContent, setSelectedContent] = useState<EnrichedContent | null>(null)
  const [page,            setPage           ] = useState(1)

  const allContent = useEnrichedContent(period)

  const topicOptions = useMemo(() =>
    [...new Set(allContent.flatMap(c => c.topics ?? []))]
      .sort()
      .map(t => ({ value: t, label: t }))
  , [allContent])

  const authorOptions = useMemo(() => {
    const contribs = getAllContributors()
    return contribs
      .filter(c => allContent.some(item => item.authorIds?.includes(c.id)))
      .map(c => ({
        value:    c.id,
        label:    c.name,
        initials: c.name.split(' ').map((w: string) => w[0]).slice(0, 2).join(''),
        avatar:   c.photoUrl,
      }))
  }, [allContent])

  const filtered = useMemo(() => {
    let items = allContent.filter(c => activePlatforms.has(c.platform))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter(c => c.title.toLowerCase().includes(q))
    }
    if (filterTopic)    items = items.filter(c => c.topics?.includes(filterTopic))
    if (filterAuthor)   items = items.filter(c => c.authorIds?.includes(filterAuthor))
    if (filterLanguage) items = items.filter(c => c.language === filterLanguage)
    return [...items].sort((a, b) => {
      if (sortCol === 'published') {
        return sortDir === 'desc' ? b.publishedAt.localeCompare(a.publishedAt) : a.publishedAt.localeCompare(b.publishedAt)
      }
      let va = 0, vb = 0
      if      (sortCol === 'impressions') { va = a.metrics.impressions;        vb = b.metrics.impressions }
      else if (sortCol === 'engagement')  { va = a.metrics.weightedEngagement; vb = b.metrics.weightedEngagement }
      else if (sortCol === 'siteClicks')  { va = a.metrics.siteClicks;         vb = b.metrics.siteClicks }
      return sortDir === 'desc' ? vb - va : va - vb
    })
  }, [allContent, activePlatforms, search, sortCol, sortDir, filterTopic, filterAuthor, filterLanguage])

  const allSelected       = activePlatforms.size === JOURNEY_PLATFORM_ORDER.length
  const hasSecondaryFilter = !!(filterTopic || filterAuthor || filterLanguage)
  const totalPages        = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated         = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // typePeers for detail view — items of the same content type in this period
  const typePeers = useMemo(
    () => selectedContent ? allContent.filter(c => c.type === selectedContent.type) : [],
    [allContent, selectedContent]
  )

  if (selectedContent) {
    return (
      <ContentDetail
        item={selectedContent}
        typePeers={typePeers}
        onBack={() => setSelectedContent(null)}
        onSelectStory={onSelectStory}
      />
    )
  }

  function handleSort(col: SortCol) {
    if (col === sortCol) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
    setPage(1)
  }

  function togglePlatform(p: Platform) {
    setActivePlatforms(prev => {
      const next = new Set(prev)
      if (next.has(p)) { if (next.size > 1) next.delete(p) } else next.add(p)
      return next
    })
    setPage(1)
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 28px 56px' }}>

      {/* Platform chips + search */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {JOURNEY_PLATFORM_ORDER.map(p => {
              const isActive = activePlatforms.has(p)
              const { color, label } = PLATFORM_CONFIG[p]
              return (
                <button key={p} onClick={() => togglePlatform(p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', border: `1px solid ${isActive ? color : 'var(--color-border)'}`, borderRadius: 'var(--radius-pill)', backgroundColor: isActive ? `${color}15` : 'var(--color-raised)', cursor: 'pointer', transition: 'all 140ms ease' }}>
                  <PlatformBadge platform={p} variant="icon-sm" style={{ opacity: isActive ? 1 : 0.35 }} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', fontWeight: isActive ? 500 : 400, color: isActive ? color : 'var(--color-fainter)', whiteSpace: 'nowrap' }}>{label}</span>
                </button>
              )
            })}
          </div>
          {!allSelected && (
            <button onClick={() => setActivePlatforms(new Set(JOURNEY_PLATFORM_ORDER))} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)', padding: 0, textDecoration: 'underline' }}>
              Select all platforms
            </button>
          )}
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <MagnifyingGlass weight="fill" size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-faint)', pointerEvents: 'none' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles…" style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-ink)', backgroundColor: 'var(--color-raised)', border: '1px solid var(--color-border)', borderRadius: 8, height: 36, paddingLeft: 32, paddingRight: 12, outline: 'none', width: 220 }} />
        </div>
      </div>

      {/* Secondary filters — language pills · topic · author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hasSecondaryFilter ? 12 : 16, flexWrap: 'wrap' }}>
        {(['ar', 'en'] as const).map(lang => {
          const isActive = filterLanguage === lang
          return (
            <button
              key={lang}
              onClick={() => { setFilterLanguage(isActive ? undefined : lang); setPage(1) }}
              style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 12px', border: `1px solid ${isActive ? 'var(--color-border-strong)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-pill)', backgroundColor: isActive ? 'var(--color-ink)' : 'var(--color-raised)', cursor: 'pointer', transition: 'all 140ms ease', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--color-paper)' : 'var(--color-fainter)' }}
            >
              {lang === 'ar' ? 'Arabic' : 'English'}
            </button>
          )
        })}
        <FilterDropdown
          label="Topic"
          options={topicOptions}
          value={filterTopic}
          onChange={setFilterTopic as (v: string | undefined) => void}
        />
        {authorOptions.length > 0 && (
          <FilterDropdown
            label="Author"
            options={authorOptions}
            value={filterAuthor}
            onChange={setFilterAuthor as (v: string | undefined) => void}
          />
        )}
        {hasSecondaryFilter && (
          <button
            onClick={() => { setFilterTopic(undefined); setFilterAuthor(undefined); setFilterLanguage(undefined) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)', padding: 0, textDecoration: 'underline' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '8px 12px', backgroundColor: 'var(--color-tile)', borderRadius: 'var(--radius-card) var(--radius-card) 0 0', borderBottom: '2px solid var(--color-border)', position: 'relative', zIndex: 5 }}>
          <div />
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 500, color: 'var(--color-fainter)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Content</div>
          <ColHeader col="published"   label="Date"               align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
          <ColHeader col="impressions" label="Impressions"         align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} tip={<MetricTip name={METRIC_INFO.impressions.name} description={METRIC_INFO.impressions.description} />} />
          <ColHeader col="engagement"  label="Engagement" align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} tip={<MetricTip name={METRIC_INFO.weighted_engagement.name} description={METRIC_INFO.weighted_engagement.description} />} />
          <ColHeader col="siteClicks"  label="Site Clicks"         align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} tip={<MetricTip name={METRIC_INFO.site_clicks.name} description={METRIC_INFO.site_clicks.description} />} />
        </div>

        {filtered.length === 0
          ? <EmptyState icon={<Funnel weight="fill" size={28} />} title={search ? `No results for "${search}"` : 'No content matches this filter'} body="Adjust the platform selection or search." padding="40px 24px" />
          : paginated.map(item => <ContentRow key={item.id} item={item} onSelect={() => { setSelectedContent(item); setPage(1) }} />)
        }
      </div>

      {/* Pagination */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
          {filtered.length} items
          {search && ` matching "${search}"`}
          {filterLanguage && ` · ${filterLanguage === 'ar' ? 'Arabic' : 'English'}`}
          {filterTopic && ` · topic: ${filterTopic}`}
          {filterAuthor && ` · author filter active`}
          {totalPages > 1 && ` · page ${page} of ${totalPages}`}
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ height: 30, padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-raised)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: page === 1 ? 'var(--color-fainter)' : 'var(--color-ink)', cursor: page === 1 ? 'default' : 'pointer' }}
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p: number
              if (totalPages <= 7)           p = i + 1
              else if (page <= 4)            p = i + 1
              else if (page >= totalPages - 3) p = totalPages - 6 + i
              else                           p = page - 3 + i
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{ width: 30, height: 30, border: `1px solid ${p === page ? 'var(--color-ink)' : 'var(--color-border)'}`, borderRadius: 6, background: p === page ? 'var(--color-ink)' : 'var(--color-raised)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: p === page ? 'var(--color-paper)' : 'var(--color-muted)', cursor: 'pointer', fontWeight: p === page ? 600 : 400 }}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ height: 30, padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-raised)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: page === totalPages ? 'var(--color-fainter)' : 'var(--color-ink)', cursor: page === totalPages ? 'default' : 'pointer' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
