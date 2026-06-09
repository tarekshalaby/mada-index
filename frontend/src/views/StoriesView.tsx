import { useState, useMemo, useEffect } from 'react'
import { Eye, ChartBar, Link, Newspaper, CalendarBlank } from '@phosphor-icons/react'
import { getStories, getStoriesForPeriod, getContentByStory, getContentById, getAllContributors } from '../data/adapter'
import type { Story, Format, Section, Contributor } from '../data/types'
import { Tag }              from '../components/Tag'
import { Toggle }           from '../components/Toggle'
import { EmptyState }       from '../components/EmptyState'
import { FilterDropdown }   from '../components/FilterDropdown'
import { PlatformBadge, JOURNEY_PLATFORM_ORDER } from '../components/PlatformBadge'
import { prevPeriodOf, type Period } from '../components/DateRangeControl'
import { Tooltip, MetricTip } from '../components/Tooltip'
import { HonestyLabel }     from '../components/HonestyLabel'
import { formatCompact, computePercentileRank, computeDeltaPct } from '../lib/metrics'
import { FORMAT_LABELS, SECTION_LABELS, METRIC_INFO, formatDateSpan } from '../lib/labels'
import { PercentileBadge }  from '../components/PercentileBadge'
import { StoryDetail }      from './StoryDetail'
import { ContentDetail }    from './ContentDetail'

type SortMetric = 'we' | 'impressions' | 'site-clicks' | 'date'

const SORT_OPTIONS = [
  {
    value: 'date'         as SortMetric,
    label: 'Date',
    icon:  <CalendarBlank weight="fill" size={13} />,
  },
  {
    value: 'we'           as SortMetric,
    label: 'Weighted Engagement',
    icon:  <ChartBar weight="fill" size={13} />,
  },
  {
    value: 'impressions'  as SortMetric,
    label: 'Impressions',
    icon:  <Eye weight="fill" size={13} />,
  },
  {
    value: 'site-clicks'  as SortMetric,
    label: 'Site Clicks',
    icon:  <Link weight="fill" size={13} />,
  },
]

const PAGE_SIZE = 30

// ─── Story row ────────────────────────────────────────────────────────────────

function StoryRow({ story, sortBy, pctl, onClick }: {
  story: Story
  sortBy: SortMetric
  pctl?: number      // percentile of primary metric vs current-period peers
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  // Unique platforms in canonical dissemination order
  const platforms = useMemo(() => {
    const members = getContentByStory(story.id)
    const seen = new Set<string>()
    return JOURNEY_PLATFORM_ORDER.filter(p => {
      const has = members.some(c => c.platform === p)
      if (has && !seen.has(p)) { seen.add(p); return true }
      return false
    })
  }, [story.id])

  // Contributors across all article members of this story
  const contributors = useMemo(() => {
    const members     = getContentByStory(story.id)
    const allContribs = getAllContributors()
    const seen        = new Map<string, Contributor>()
    for (const m of members) {
      for (const id of m.authorIds ?? []) {
        const c = allContribs.find(x => x.id === id)
        if (c) seen.set(c.id, c)
      }
    }
    return [...seen.values()]
  }, [story.id])

  const { metricValue, metricLabel, metricInfo } = useMemo(() => {
    if (sortBy === 'we') return {
      metricValue: formatCompact(story.rollup.weightedEngagement),
      metricLabel: 'Weighted Engagement',
      metricInfo:  METRIC_INFO.weighted_engagement,
    }
    if (sortBy === 'impressions') return {
      metricValue: formatCompact(story.rollup.impressions),
      metricLabel: 'Impressions',
      metricInfo:  METRIC_INFO.impressions,
    }
    return {
      metricValue: formatCompact(story.rollup.siteClicks),
      metricLabel: 'Site Clicks',
      metricInfo:  METRIC_INFO.site_clicks,
    }
  }, [sortBy, story.rollup])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:         'flex',
        alignItems:      'center',
        gap:             20,
        padding:         '18px 0',
        borderBottom:    '1px solid var(--color-border)',
        cursor:          'pointer',
        transition:      'background-color 140ms ease',
        backgroundColor: hovered ? 'rgba(36,31,24,0.025)' : 'transparent',
        outline:         'none',
        marginLeft:      hovered ? -12 : 0,
        paddingLeft:     hovered ? 12 : 0,
        borderRadius:    hovered ? 8 : 0,
      }}
    >
      {/* Thumbnail — 1:1 square (§7: 1:1 for list density) */}
      <div
        style={{
          width:           96,
          height:          96,
          borderRadius:    8,
          overflow:        'hidden',
          flexShrink:      0,
          border:          '1px solid var(--color-border)',
          backgroundColor: '#F1EAD9',
        }}
      >
        {story.thumbnailUrl ? (
          <img
            src={story.thumbnailUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width:           '100%',
            height:          '100%',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            backgroundColor: '#F1EAD9',
          }}>
            {/* Arabic م glyph as a typographic fallback — warm, editorial */}
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize:   32,
              fontWeight: 600,
              color:      'var(--color-border-strong)',
              lineHeight: 1,
            }}>
              م
            </span>
          </div>
        )}
      </div>

      {/* Content — title, tags, platform indicators */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title — dir="auto" so Arabic flows RTL, English LTR */}
        <div
          dir="auto"
          style={{
            fontFamily:          'var(--font-display)',
            fontSize:            18,          // title-item for Arabic: 17+1px = 18px
            fontWeight:          600,          // stronger for Arabic headlines
            color:               'var(--color-ink)',
            lineHeight:          1.5,          // extra leading for Arabic
            marginBottom:        8,
            overflow:            'hidden',
            display:             '-webkit-box',
            WebkitLineClamp:     2,
            WebkitBoxOrient:     'vertical',
          }}
        >
          {story.title}
        </div>

        {/* Category tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {story.format  && <Tag>{FORMAT_LABELS[story.format]}</Tag>}
          {story.section && <Tag>{SECTION_LABELS[story.section]}</Tag>}
        </div>

        {/* Platform icons + date span + contributors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {platforms.map(p => (
              <PlatformBadge key={p} platform={p} variant="icon-sm" />
            ))}
          </div>
          <span style={{ color: 'var(--color-border-strong)' }}>·</span>
          <span style={{
            fontFamily: 'var(--font-ui)',
            fontSize:   'var(--text-caption)',
            color:      'var(--color-fainter)',
          }}>
            {formatDateSpan(story.publishedFirst, story.publishedLast)}
          </span>
          {contributors.length > 0 && (
            <>
              <span style={{ color: 'var(--color-border-strong)' }}>·</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {contributors.map(c => {
                  const initials = c.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
                  return (
                    <div key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: c.photoUrl ? 'transparent' : 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.photoUrl
                          ? <img src={c.photoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700, color: 'var(--color-paper)' }}>{initials}</span>
                        }
                      </div>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Primary metric — column-flex so rows are only as wide as their content */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        <div style={{
          fontFamily:         'var(--font-display)',
          fontSize:           'var(--text-title-section)',
          fontWeight:         600,
          color:              'var(--color-ink)',
          fontVariantNumeric: 'tabular-nums lining-nums',
          lineHeight:         1,
        }}>
          {metricValue}
        </div>

        {/* Label + badge: sit naturally next to each other, no spreading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Tooltip tip={<MetricTip name={metricInfo.name} description={metricInfo.description} />}>
            <span style={{
              fontFamily:   'var(--font-ui)',
              fontSize:     'var(--text-caption)',
              color:        'var(--color-faint)',
              cursor:       'help',
              borderBottom: '1px dotted var(--color-border-strong)',
              whiteSpace:   'nowrap',
            }}>
              {metricLabel}
            </span>
          </Tooltip>
          {pctl !== undefined && <PercentileBadge percentile={pctl} />}
        </div>

        {/* Secondary: impressions when sorted by site-clicks or date */}
        {(sortBy === 'site-clicks' || sortBy === 'date') && (
          <div style={{
            fontFamily:         'var(--font-ui)',
            fontSize:           'var(--text-caption)',
            color:              'var(--color-fainter)',
            fontVariantNumeric: 'tabular-nums lining-nums',
          }}>
            {formatCompact(story.rollup.impressions)} impressions
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Stories view ─────────────────────────────────────────────────────────────

interface StoriesViewProps {
  period?:         string
  /** Open a specific story immediately (e.g. when navigating from Overview) */
  initialStoryId?: string | null
  /** Called when App should clear the pending story */
  onBack?: () => void
}

export function StoriesView({ period, initialStoryId, onBack }: StoriesViewProps) {
  const [selectedId,        setSelectedId       ] = useState<string | null>(initialStoryId ?? null)
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null)
  const [sortBy,            setSortBy           ] = useState<SortMetric>('impressions')
  const [filterSection, setFilterSection] = useState<Section | undefined>()
  const [filterFormat,  setFilterFormat ] = useState<Format | undefined>()
  const [filterTopic,   setFilterTopic  ] = useState<string | undefined>()
  const [filterAuthor,  setFilterAuthor ] = useState<string | undefined>()
  const [visibleCount,  setVisibleCount ] = useState<number>(PAGE_SIZE)

  // Period-filtered stories (falls back to all stories when no period map or no live data)
  const allStories = useMemo(
    () => period ? getStoriesForPeriod(period) : getStories(),
    [period]
  )

  // Available filter options derived from the story data
  const sectionOptions = useMemo(() =>
    [...new Set(allStories.map(s => s.section).filter(Boolean) as Section[])]
      .map(v => ({ value: v, label: SECTION_LABELS[v] })),
  [allStories])

  const formatOptions = useMemo(() =>
    [...new Set(allStories.map(s => s.format).filter(Boolean) as Format[])]
      .map(v => ({ value: v, label: FORMAT_LABELS[v] })),
  [allStories])

  const topicOptions = useMemo(() =>
    [...new Set(allStories.flatMap(s => s.topics ?? []))]
      .map(t => ({ value: t, label: t })),
  [allStories])

  // Contributor options — only those who authored content in at least one story
  const authorOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const s of allStories) {
      for (const id of s.memberIds) {
        const c = getContentById(id)
        c?.authorIds?.forEach(a => seen.add(a))
      }
    }
    return getAllContributors()
      .filter(c => seen.has(c.id))
      .map(c => ({
        value:    c.id,
        label:    c.name,
        initials: c.name.split(' ').map((w: string) => w[0]).slice(0, 2).join(''),
        avatar:   c.photoUrl,
      }))
  }, [allStories])

  // Sort, then filter
  const sorted = useMemo(() => {
    return [...allStories].sort((a, b) => {
      if (sortBy === 'we')          return b.rollup.weightedEngagement - a.rollup.weightedEngagement
      if (sortBy === 'impressions') return b.rollup.impressions        - a.rollup.impressions
      if (sortBy === 'site-clicks') return b.rollup.siteClicks        - a.rollup.siteClicks
      // date: most recent first
      return b.publishedFirst.localeCompare(a.publishedFirst)
    })
  }, [allStories, sortBy])

  const filtered = useMemo(() => {
    let items = sorted
    if (filterSection) items = items.filter(s => s.section === filterSection)
    if (filterFormat)  items = items.filter(s => s.format  === filterFormat)
    if (filterTopic)   items = items.filter(s => s.topics?.includes(filterTopic))
    if (filterAuthor)  items = items.filter(s =>
      s.memberIds.some(id => getContentById(id)?.authorIds?.includes(filterAuthor))
    )
    return items
  }, [sorted, filterSection, filterFormat, filterTopic, filterAuthor])

  // Reset pagination when filters or sort change
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [sortBy, filterSection, filterFormat, filterTopic, filterAuthor, period])

  // Decision ②: aggregate header when any editorial cut filter is active
  const hasFilter = !!(filterSection || filterFormat || filterTopic || filterAuthor)
  const aggregate = useMemo(() => ({
    impressions: filtered.reduce((s, x) => s + x.rollup.impressions, 0),
    we:          filtered.reduce((s, x) => s + x.rollup.weightedEngagement, 0),
    siteClicks:  filtered.reduce((s, x) => s + x.rollup.siteClicks, 0),
  }), [filtered])

  // Prior-period aggregate for delta arrows — apply the same active filters to prev period
  const prevAggregate = useMemo(() => {
    if (!period) return null
    const prev = prevPeriodOf(period as Period)
    if (!prev) return null
    let items = getStoriesForPeriod(prev)
    if (filterSection) items = items.filter(s => s.section === filterSection)
    if (filterFormat)  items = items.filter(s => s.format  === filterFormat)
    if (filterTopic)   items = items.filter(s => s.topics?.includes(filterTopic))
    if (filterAuthor)  { const fa = filterAuthor; items = items.filter(s =>
      s.memberIds.some((id: string) => getContentById(id)?.authorIds?.includes(fa))
    ) }
    return {
      count:      items.length,
      impressions: items.reduce((s, x) => s + x.rollup.impressions, 0),
      we:          items.reduce((s, x) => s + x.rollup.weightedEngagement, 0),
      siteClicks:  items.reduce((s, x) => s + x.rollup.siteClicks, 0),
    }
  }, [period, filterSection, filterFormat, filterTopic, filterAuthor])

  // Per-row quality percentiles — computed once for the full filtered list
  const percentileMap = useMemo(() => {
    if (sortBy === 'date') return new Map<string, number>()
    const getVal = (s: Story) =>
      sortBy === 'impressions' ? s.rollup.impressions :
      sortBy === 'we'          ? s.rollup.weightedEngagement :
                                 s.rollup.siteClicks
    const vals = filtered.map(getVal)
    const map  = new Map<string, number>()
    for (const s of filtered) map.set(s.id, computePercentileRank(getVal(s), vals))
    return map
  }, [filtered, sortBy])

  const activeFilterLabel = [
    filterSection && SECTION_LABELS[filterSection],
    filterFormat  && FORMAT_LABELS[filterFormat],
    filterTopic,
    filterAuthor  && authorOptions.find(a => a.value === filterAuthor)?.label,
  ].filter(Boolean).join(' · ') || undefined

  if (selectedId) {
    const story = allStories.find(s => s.id === selectedId)
    if (!story) return null

    // If user clicked a content piece inside the story → show ContentDetail inline
    if (selectedContentId) {
      const contentItem = getContentById(selectedContentId)
      if (contentItem) {
        return (
          <ContentDetail
            item={contentItem}
            onBack={() => setSelectedContentId(null)}
          />
        )
      }
    }

    return (
      <StoryDetail
        story={story}
        members={getContentByStory(selectedId)}
        peerStories={allStories}
        onBack={() => { setSelectedId(null); setSelectedContentId(null); onBack?.() }}
        onSelectContent={(id) => setSelectedContentId(id)}
      />
    )
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 28px 56px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-page)', fontWeight: 500, color: 'var(--color-ink)', margin: 0 }}>
          Stories
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <FilterDropdown label="Section" options={sectionOptions} value={filterSection} onChange={setFilterSection as (v: string | undefined) => void} />
          <FilterDropdown label="Story type"  options={formatOptions}  value={filterFormat}  onChange={setFilterFormat  as (v: string | undefined) => void} />
          <FilterDropdown label="Topic"   options={topicOptions}   value={filterTopic}   onChange={setFilterTopic} />
          {authorOptions.length > 0 && (
            <FilterDropdown label="Author" options={authorOptions} value={filterAuthor} onChange={setFilterAuthor as (v: string | undefined) => void} />
          )}
          <Toggle options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {/* Decision ②: aggregate header when a filter is active */}
      {hasFilter && filtered.length > 0 && (
        <div style={{ backgroundColor: 'var(--color-tile)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 20 }}>
          <div dir="auto" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-item)', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 10 }}>
            {activeFilterLabel}
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 10 }}>
            {([
              { label: 'Stories',             value: String(filtered.length),             prev: prevAggregate?.count       ?? null },
              { label: 'Impressions',         value: formatCompact(aggregate.impressions), prev: prevAggregate?.impressions ?? null },
              { label: 'Weighted Engagement', value: formatCompact(aggregate.we),          prev: prevAggregate?.we          ?? null },
              { label: 'Site Clicks',         value: formatCompact(aggregate.siteClicks),  prev: prevAggregate?.siteClicks  ?? null },
            ] as { label: string; value: string; prev: number | null }[]).map(({ label, value, prev }) => {
              const current =
                label === 'Stories'             ? filtered.length :
                label === 'Impressions'         ? aggregate.impressions :
                label === 'Weighted Engagement' ? aggregate.we :
                                                  aggregate.siteClicks
              const delta = computeDeltaPct(current, prev)
              const deltaPositive = delta !== null && delta >= 0
              return (
                <div key={label}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', marginBottom: 3 }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1 }}>{value}</div>
                    {delta !== null ? (
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 500, color: deltaPositive ? 'var(--color-good-text)' : 'var(--color-bad-text)', fontVariantNumeric: 'tabular-nums lining-nums' }}>
                        {deltaPositive ? '+' : ''}{delta.toFixed(0)}%
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <HonestyLabel>story rollup totals · publish cohort</HonestyLabel>
        </div>
      )}

      {/* Column header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 0, borderBottom: '2px solid var(--color-border)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        <span>{filtered.length} {filtered.length === 1 ? 'story' : 'stories'}{hasFilter && ` · filtered`}</span>
        <span>Sorted by {sortBy === 'impressions' ? 'Impressions' : sortBy === 'we' ? 'Weighted Engagement' : sortBy === 'date' ? 'Most recent' : 'Site Clicks'}</span>
      </div>

      {/* Story rows — or empty state */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Newspaper weight="fill" size={28} />}
          title="No stories in this period"
          body="Try adjusting the filters or selecting a different date range."
        />
      ) : (
        <>
          {filtered.slice(0, visibleCount).map(story => (
            <StoryRow
              key={story.id}
              story={story}
              sortBy={sortBy}
              pctl={percentileMap.get(story.id)}
              onClick={() => setSelectedId(story.id)}
            />
          ))}
          {visibleCount < filtered.length && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
              <button
                onClick={() => setVisibleCount(n => n + PAGE_SIZE)}
                style={{
                  background:   'none',
                  border:       '1px solid var(--color-border-strong)',
                  borderRadius: 'var(--radius-btn)',
                  padding:      '8px 20px',
                  fontFamily:   'var(--font-ui)',
                  fontSize:     'var(--text-label)',
                  color:        'var(--color-muted)',
                  cursor:       'pointer',
                }}
              >
                Show {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
                <span style={{ color: 'var(--color-fainter)', marginLeft: 6 }}>
                  ({filtered.length - visibleCount} remaining)
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
