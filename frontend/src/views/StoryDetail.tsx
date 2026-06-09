import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Eye, ChartBar, Link, Clock, ShareNetwork, CalendarBlank } from '@phosphor-icons/react'
import { getAllContributors, getContent } from '../data/adapter'
import type { Story, Content, ContentType, Platform, Contributor } from '../data/types'
import { PercentileBadge } from '../components/PercentileBadge'
import { computePercentileRank, getPercentileBand, formatCompact, formatMinutes } from '../lib/metrics'
import { HonestyLabel } from '../components/HonestyLabel'
import { PlatformBadge, PLATFORM_CONFIG, JOURNEY_PLATFORM_ORDER } from '../components/PlatformBadge'
import { Tag } from '../components/Tag'
import { Tooltip, MetricTip } from '../components/Tooltip'
import { FORMAT_LABELS, SECTION_LABELS, LANGUAGE_LABELS, METRIC_INFO, formatDateShort, formatDateSpan } from '../lib/labels'

interface StoryDetailProps {
  story: Story
  members: Content[]
  peerStories?: Story[]    // current period's stories — for header tile percentile badges
  onBack: () => void
  onSelectContent?: (id: string) => void
}

// ─── Member card ─────────────────────────────────────────────────────────────
// Per-post card in the journey. §10.8: Views / WE / EQR / saves per post.

function MemberCard({ content, eqPeers, onClick }: { content: Content; eqPeers?: number[]; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const m = content.metrics
  const isNotCounted = !content.countsTowardStoryTotal
  const isArticle    = content.type === 'article'
  const isYouTube    = content.type === 'youtube-video'
  const isPodcast    = content.type === 'podcast-episode'
  const isNewsletter = content.type === 'newsletter'
  const isArabic     = content.language === 'ar'

  // Thumbnail / fallback glyph tile
  const Thumb = () => {
    const { Icon } = PLATFORM_CONFIG[content.platform]
    return (
      <div
        style={{
          position:        'relative',
          width:           80,
          height:          54,
          borderRadius:    6,
          overflow:        'hidden',
          flexShrink:      0,
          border:          '1px solid var(--color-border)',
          backgroundColor: '#F1EAD9',
        }}
      >
        {content.thumbnailUrl ? (
          <img
            src={content.thumbnailUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon weight="fill" size={22} color="var(--color-fainter)" />
          </div>
        )}
        {/* Source badge — platform glyph in platform colour, bottom-right corner */}
        <span
          style={{
            position:        'absolute',
            bottom:          3,
            right:           3,
            // IG post = #8A3AB9 (matches PLATFORM_CONFIG), IG story = #D4537E
            backgroundColor: content.platform === 'instagram' && content.type === 'ig-story'
              ? '#D4537E'
              : PLATFORM_CONFIG[content.platform].color,
            borderRadius:    3,
            width:           16,
            height:          16,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          <Icon weight="fill" size={10} color="white" />
        </span>
      </div>
    )
  }

  // EQ percentile within Type (all content of same ContentType, all periods)
  const eqPctl = eqPeers && eqPeers.length >= 4
    ? computePercentileRank(m.engagementQualityRate, eqPeers)
    : undefined

  // Metric stat items — no abbreviations, content-type aware
  // badge: if set, render PercentileBadge instead of plain value
  // rawHover: text shown on badge hover (raw EQR index)
  const statItems: { label: string; value: string; tipKey?: keyof typeof METRIC_INFO; badge?: number; rawHover?: string }[] = []
  if (isArticle) {
    statItems.push({ label: 'Views',           value: formatCompact(m.impressions),                      tipKey: 'impressions' })
    if (m.attentionAvg > 0)
      statItems.push({ label: 'Avg read',      value: `${m.attentionAvg.toFixed(1)} min` })
    statItems.push(eqPctl !== undefined
      ? { label: 'Engagement Quality', value: '', tipKey: 'eqr', badge: eqPctl, rawHover: `Raw index: ${m.engagementQualityRate.toFixed(1)}` }
      : { label: 'Engagement Quality', value: m.engagementQualityRate.toFixed(0), tipKey: 'eqr' })
  } else if (isYouTube) {
    statItems.push({ label: 'Views',           value: formatCompact(m.impressions),                      tipKey: 'impressions' })
    statItems.push({ label: 'Avg watch',       value: `${m.attentionAvg.toFixed(1)} min` })
    statItems.push(eqPctl !== undefined
      ? { label: 'Engagement Quality', value: '', tipKey: 'eqr', badge: eqPctl, rawHover: `Raw index: ${m.engagementQualityRate.toFixed(1)}` }
      : { label: 'Engagement Quality', value: m.engagementQualityRate.toFixed(0), tipKey: 'eqr' })
  } else if (isPodcast) {
    statItems.push({ label: 'Streams',         value: formatCompact(m.impressions) })
    if (m.attentionAvg > 0)
      statItems.push({ label: 'Avg listen',    value: `${m.attentionAvg.toFixed(0)} min` })
  } else if (isNewsletter) {
    statItems.push({ label: 'Opens',           value: formatCompact(m.impressions) })
    statItems.push({ label: 'Link clicks',     value: formatCompact(m.clicks) })
  } else {
    // Social posts — no "Imp", no "WE"
    statItems.push({ label: 'Impressions',     value: formatCompact(m.impressions),                      tipKey: 'impressions' })
    statItems.push({ label: 'Weighted Engagement', value: formatCompact(m.weightedEngagement),            tipKey: 'weighted_engagement' })
    statItems.push(eqPctl !== undefined
      ? { label: 'Engagement Quality', value: '', tipKey: 'eqr', badge: eqPctl, rawHover: `Raw index: ${m.engagementQualityRate.toFixed(1)}` }
      : { label: 'Engagement Quality', value: m.engagementQualityRate.toFixed(1), tipKey: 'eqr' })
    if (m.saves > 0)
      statItems.push({ label: 'Saves',         value: formatCompact(m.saves) })
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { if (onClick) setHovered(true)  }}
      onMouseLeave={() => { if (onClick) setHovered(false) }}
      style={{
        backgroundColor: 'var(--color-raised)',
        border:          `1px solid ${hovered ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
        borderRadius:    'var(--radius-card)',
        padding:         16,
        opacity:         isNotCounted ? 0.75 : 1,
        display:         'flex',
        flexDirection:   'column',
        gap:             10,
        minWidth:        0,
        cursor:          onClick ? 'pointer' : 'default',
        transition:      'border-color 120ms ease',
      }}
    >
      {/* Top row: thumbnail + meta */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Thumb />
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Date + language */}
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        6,
            marginBottom: 5,
          }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
              {formatDateShort(content.publishedAt)}
            </span>
            {content.language !== 'na' && (
              <span style={{
                fontFamily:      'var(--font-ui)',
                fontSize:        'var(--text-caption)',
                color:           'var(--color-fainter)',
                backgroundColor: 'var(--color-tile)',
                borderRadius:    3,
                padding:         '1px 4px',
              }}>
                {LANGUAGE_LABELS[content.language]}
              </span>
            )}
          </div>
          {/* Title — dir="auto" so Arabic flows RTL, English LTR */}
          <div
            dir="auto"
            style={{
              fontFamily:      'var(--font-display)',
              fontSize:        isArabic ? 15 : 'var(--text-title-row)',
              fontWeight:      isArabic ? 600 : 500,
              color:           'var(--color-ink)',
              lineHeight:      isArabic ? 1.5 : 1.4,
              overflow:        'hidden',
              display:         '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {content.title}
          </div>
        </div>
      </div>

      {/* Honesty label for newsletters not counted */}
      {isNotCounted && (
        <HonestyLabel>mentioned in · not counted</HonestyLabel>
      )}

      {/* Metrics — tooltip on any labelled metric; EQ shows as percentile badge */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {statItems.map(({ label, value, tipKey, badge, rawHover }) => {
          const tip = tipKey ? METRIC_INFO[tipKey] : undefined
          const labelEl = (
            <span style={{
              fontFamily:   'var(--font-ui)',
              fontSize:     'var(--text-caption)',
              color:        'var(--color-faint)',
              cursor:       tip ? 'help' : 'default',
              borderBottom: tip ? '1px dotted var(--color-border-strong)' : 'none',
            }}>
              {label}
            </span>
          )
          const valueEl = badge !== undefined ? (
            rawHover ? (
              <Tooltip tip={<span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)' }}>{rawHover}</span>}>
                <span style={{ cursor: 'help' }}>
                  <PercentileBadge percentile={badge} />
                </span>
              </Tooltip>
            ) : (
              <PercentileBadge percentile={badge} />
            )
          ) : (
            <span style={{
              fontFamily:         'var(--font-ui)',
              fontSize:           'var(--text-data)',
              fontWeight:         500,
              color:              'var(--color-ink)',
              fontVariantNumeric: 'tabular-nums lining-nums',
            }}>
              {value}
            </span>
          )
          return (
            <span key={label} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {tip ? (
                <Tooltip tip={<MetricTip name={tip.name} description={tip.description} />}>
                  {labelEl}
                </Tooltip>
              ) : labelEl}
              {valueEl}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Journey group ────────────────────────────────────────────────────────────
// One platform's section of the journey. §10.8: group header (site-click total +
// post count) then member cards.

function JourneyGroup({ platform, members, eqPctlByType, onSelectContent }: { platform: Platform; members: Content[]; eqPctlByType?: (type: ContentType) => number[]; onSelectContent?: (id: string) => void }) {
  const sorted      = [...members].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
  const siteClicks  = members.reduce((s, c) => s + c.metrics.siteClicks, 0)
  const isInstagram = platform === 'instagram'
  const dateRange   = formatDateSpan(sorted[0].publishedAt, sorted[sorted.length - 1].publishedAt)
  const postLabel   = members.length === 1 ? 'piece' : 'pieces'

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Group header */}
      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          flexWrap:     'wrap',
          gap:          10,
          paddingBottom: 10,
          marginBottom:  12,
          borderBottom:  '1px solid var(--color-border)',
        }}
      >
        <PlatformBadge platform={platform} variant="icon-label" size={16} />

        <span style={{ color: 'var(--color-border-strong)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)' }}>·</span>

        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', color: 'var(--color-faint)' }}>
          {members.length} {postLabel}
        </span>

        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', color: 'var(--color-fainter)' }}>
          {dateRange}
        </span>

        {siteClicks > 0 && !isInstagram && (
          <>
            <span style={{ color: 'var(--color-border-strong)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)' }}>·</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', color: 'var(--color-faint)' }}>
              {formatCompact(siteClicks)} site clicks
            </span>
          </>
        )}

        {isInstagram && (
          <HonestyLabel>partial attribution (IG)</HonestyLabel>
        )}
      </div>

      {/* Member cards */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap:                 12,
        }}
      >
        {sorted.map(member => (
          <MemberCard
            key={member.id}
            content={member}
            eqPeers={eqPctlByType ? eqPctlByType(member.type) : undefined}
            onClick={onSelectContent ? () => onSelectContent(member.id) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Story detail ─────────────────────────────────────────────────────────────

export function StoryDetail({ story, members, peerStories, onBack, onSelectContent }: StoryDetailProps) {
  // Scroll to top when the detail opens
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [story.id])

  // Header tile percentiles vs current-period peers (suppress when < 4 peers)
  const peerMetrics = useMemo(() => {
    if (!peerStories || peerStories.length < 4) return null
    return {
      impressions: computePercentileRank(story.rollup.impressions,           peerStories.map(s => s.rollup.impressions)),
      we:          computePercentileRank(story.rollup.weightedEngagement,     peerStories.map(s => s.rollup.weightedEngagement)),
      siteClicks:  computePercentileRank(story.rollup.siteClicks,             peerStories.map(s => s.rollup.siteClicks)),
      attention:   computePercentileRank(story.rollup.attentionTotalMinutes,  peerStories.map(s => s.rollup.attentionTotalMinutes)),
    }
  }, [story, peerStories])

  // EQ peer values by ContentType — all content in cache, grouped for O(1) per-card lookup
  const eqPctlByType = useMemo((): (type: ContentType) => number[] => {
    const allContent = getContent()
    const byType = new Map<ContentType, number[]>()
    for (const c of allContent) {
      const arr = byType.get(c.type) ?? []
      arr.push(c.metrics.engagementQualityRate)
      byType.set(c.type, arr)
    }
    return (type: ContentType) => byType.get(type) ?? []
  }, [])

  // Group members by platform, maintain canonical journey order
  const byPlatform = new Map<Platform, Content[]>()
  for (const member of members) {
    const existing = byPlatform.get(member.platform) ?? []
    byPlatform.set(member.platform, [...existing, member])
  }
  const orderedGroups = JOURNEY_PLATFORM_ORDER
    .filter(p => byPlatform.has(p))
    .map(p => ({ platform: p, members: byPlatform.get(p)! }))

  // Unique contributors across all members (deduplicated)
  const allContribs = getAllContributors()
  const seenContributors = new Map<string, Contributor>()
  for (const m of members) {
    for (const id of m.authorIds ?? []) {
      const c = allContribs.find(x => x.id === id)
      if (c) seenContributors.set(c.id, c)
    }
  }
  const uniqueContributors = [...seenContributors.values()]

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 28px 48px' }}>

      {/* Back button */}
      <div style={{ padding: '20px 0 16px' }}>
        <button
          onClick={onBack}
          style={{
            display:    'inline-flex',
            alignItems: 'center',
            gap:        6,
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            fontFamily: 'var(--font-ui)',
            fontSize:   'var(--text-label)',
            color:      'var(--color-muted)',
            padding:    0,
          }}
        >
          <ArrowLeft weight="bold" size={14} />
          All stories
        </button>
      </div>

      {/* ── 2-column hero: 4:3 image left · title + stats right ── */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 36,
          marginBottom:        32,
          alignItems:          'start',
        }}
      >
        {/* Left: 4:3 image (or typographic fallback) */}
        <div
          style={{
            aspectRatio:     '4 / 3',
            borderRadius:    'var(--radius-section)',
            overflow:        'hidden',
            border:          '1px solid var(--color-border)',
            backgroundColor: '#F1EAD9',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          {story.thumbnailUrl ? (
            <img
              src={story.thumbnailUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize:   80,
              fontWeight: 600,
              color:      'var(--color-border-strong)',
              lineHeight: 1,
            }}>
              م
            </span>
          )}
        </div>

        {/* Right: title · tags · rollup stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            dir="auto"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize:   'var(--text-title-page)',
              fontWeight: 600,
              color:      'var(--color-ink)',
              lineHeight: 1.45,
            }}
          >
            {story.title}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {story.format  && <Tag>{FORMAT_LABELS[story.format]}</Tag>}
            {story.section && <Tag>{SECTION_LABELS[story.section]}</Tag>}
            {story.topics?.slice(0, 3).map(t => <Tag key={t}>{t}</Tag>)}
          </div>

          {/* 2×3 rollup stats grid */}
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: '1fr 1fr',
              gap:                 '20px 16px',
              marginTop:           8,
            }}
          >
            {([
              { label: 'Impressions',         value: formatCompact(story.rollup.impressions),                       icon: <Eye weight="fill" size={13} />,           tipKey: 'impressions'         as const, pctl: peerMetrics?.impressions },
              { label: 'Weighted Engagement', value: formatCompact(story.rollup.weightedEngagement),                icon: <ChartBar weight="fill" size={13} />,      tipKey: 'weighted_engagement' as const, pctl: peerMetrics?.we },
              { label: 'Site Clicks',         value: formatCompact(story.rollup.siteClicks),                        icon: <Link weight="fill" size={13} />,          tipKey: 'site_clicks'         as const, pctl: peerMetrics?.siteClicks },
              { label: 'Attention',           value: formatMinutes(story.rollup.attentionTotalMinutes),              icon: <Clock weight="fill" size={13} />,         tipKey: 'attention'           as const, pctl: peerMetrics?.attention },
              { label: 'Platforms',           value: String(story.rollup.platformCount),                            icon: <ShareNetwork weight="fill" size={13} />,  tipKey: 'platforms'           as const, pctl: undefined },
              { label: 'Period',              value: formatDateSpan(story.publishedFirst, story.publishedLast),      icon: <CalendarBlank weight="fill" size={13} />, tipKey: null,                           pctl: undefined },
            ] as { label: string; value: string; icon: React.ReactNode; tipKey: keyof typeof METRIC_INFO | null; pctl: number | undefined }[]).map(({ label, value, icon, tipKey, pctl }) => {
              const tip = tipKey ? METRIC_INFO[tipKey] : null
              const labelInner = (
                <span style={{
                  display:      'inline-flex',
                  alignItems:   'center',
                  gap:          4,
                  fontFamily:   'var(--font-ui)',
                  fontSize:     'var(--text-caption)',
                  color:        'var(--color-faint)',
                  cursor:       tip ? 'help' : 'default',
                  borderBottom: tip ? '1px dotted var(--color-border-strong)' : 'none',
                }}>
                  {icon}{label}
                </span>
              )
              return (
                <div key={label}>
                  <div style={{ marginBottom: 5 }}>
                    {tip ? (
                      <Tooltip tip={<MetricTip name={tip.name} description={tip.description} />}>
                        {labelInner}
                      </Tooltip>
                    ) : labelInner}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                    {pctl !== undefined && (() => {
                      // 5-colour quintile scale: green → lime → amber → orange → red
                      const barColor = pctl >= 80 ? '#22C55E'
                        : pctl >= 60             ? '#84CC16'
                        : pctl >= 40             ? '#F59E0B'
                        : pctl >= 20             ? '#F97316'
                        :                          '#EF4444'
                      return (
                        <div style={{
                          width:           3,
                          borderRadius:    2,
                          backgroundColor: barColor,
                          flexShrink:      0,
                          opacity:         0.85,
                        }} />
                      )
                    })()}
                    <div style={{
                      fontFamily:         'var(--font-display)',
                      fontSize:           'var(--text-display-l)',
                      fontWeight:         600,
                      color:              'var(--color-ink)',
                      fontVariantNumeric: 'tabular-nums lining-nums',
                      lineHeight:         1,
                      letterSpacing:      '-0.01em',
                    }}>
                      {value}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Contributors ─────────────────────────────────── */}
      {uniqueContributors.length > 0 && (
        <div
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          16,
            marginBottom: 28,
            padding:      '12px 0',
            borderBottom: '1px solid var(--color-border)',
            flexWrap:     'wrap',
          }}
        >
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', flexShrink: 0 }}>
            Team
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
            {uniqueContributors.map(c => {
              const initials = c.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
              return (
                <div key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: c.photoUrl ? 'transparent' : 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.photoUrl
                      ? <img src={c.photoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700, color: 'var(--color-paper)' }}>{initials}</span>
                    }
                  </div>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-muted)' }}>
                    {c.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── The journey ───────────────────────────────────── */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize:   'var(--text-title-section)',
            fontWeight: 500,
            color:      'var(--color-ink)',
            margin:     0,
          }}
        >
          The journey
        </h2>
        <HonestyLabel>lifetime metrics</HonestyLabel>
        <HonestyLabel>publish cohort</HonestyLabel>
      </div>

      {orderedGroups.map(({ platform, members: groupMembers }) => (
        <JourneyGroup key={platform} platform={platform} members={groupMembers} eqPctlByType={eqPctlByType} onSelectContent={onSelectContent} />
      ))}
    </div>
  )
}
