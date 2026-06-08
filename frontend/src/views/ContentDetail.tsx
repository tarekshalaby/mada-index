// Piece detail view — drilled into from the Content table.
// Shows the full metric set for the piece, in platform-native terms.
// For articles: GA4 metrics, contributor byline.
// For YouTube/Podcast: retention curves.
// For Newsletter: open/click rates.
// For Facebook: reaction breakdown.
// Parent story shown as a mini story card.

import { useMemo }      from 'react'
import {
  ArrowLeft, Eye, Heart, ChatCircle, ShareNetwork, BookmarkSimple,
  Play, Timer, UserCircle, Link, ArrowUpRight, ArrowsClockwise,
  Quotes, ChartBar, Envelope, Microphone, Article,
  ThumbsUp, SmileyWink, StarFour, SmileySad, SmileyAngry,
  CursorClick, Gauge,
} from '@phosphor-icons/react'
import type { Content, ContentType } from '../data/types'
import { getStoryById, getContentByStory, getContributorsByIds } from '../data/adapter'
import { HonestyLabel } from '../components/HonestyLabel'
import { Tag }          from '../components/Tag'
import { PlatformBadge, PLATFORM_CONFIG, JOURNEY_PLATFORM_ORDER } from '../components/PlatformBadge'
import { Tooltip, MetricTip } from '../components/Tooltip'
import { METRIC_INFO, FORMAT_LABELS, SECTION_LABELS, CONTENT_TYPE_LABELS, LANGUAGE_LABELS, formatDateShort } from '../lib/labels'
import { formatCompact, formatMinutes } from '../lib/metrics'

interface ContentDetailProps {
  item:           Content
  onBack:         () => void
  onSelectStory?: (id: string) => void
}

// ─── Platform-appropriate image aspect ratio (for the placeholder only) ────────
const PLACEHOLDER_RATIO: Record<ContentType, string> = {
  'article':         '16/9',
  'facebook-post':   '1/1',
  'ig-post':         '1/1',
  'ig-story':        '9/16',
  'x-post':          '16/9',
  'linkedin-post':   '1.91/1',
  'youtube-video':   '16/9',
  'newsletter':      '16/9',
  'podcast-episode': '1/1',
}

// ─── Stat block ───────────────────────────────────────────────────────────────

function Stat({
  label, value, description, tipKey, note, icon,
}: {
  label: string; value: string; description?: string
  tipKey?: keyof typeof METRIC_INFO; note?: string
  icon?: React.ReactNode
}) {
  const tip = tipKey ? METRIC_INFO[tipKey] : undefined
  const labelEl = (
    <div style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          4,
      fontFamily:   'var(--font-ui)',
      fontSize:     'var(--text-caption)',
      color:        'var(--color-faint)',
      marginBottom: 5,
      cursor:       tip ? 'help' : 'default',
      borderBottom: tip ? '1px dotted var(--color-border-strong)' : 'none',
    }}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.7 }}>{icon}</span>}
      {label}
    </div>
  )
  return (
    <div>
      {tip
        ? <Tooltip tip={<MetricTip name={tip.name} description={tip.description} />} placement="below">{labelEl}</Tooltip>
        : labelEl
      }
      <div style={{
        fontFamily:         'var(--font-display)',
        fontSize:           'var(--text-display-l)',
        fontWeight:         600,
        color:              'var(--color-ink)',
        fontVariantNumeric: 'tabular-nums lining-nums',
        lineHeight:         1,
        letterSpacing:      '-0.01em',
        marginBottom:       (description || note) ? 4 : 0,
      }}>
        {value}
      </div>
      {description && (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', fontStyle: 'italic' }}>
          {description}
        </div>
      )}
      {note && (
        <HonestyLabel>{note}</HonestyLabel>
      )}
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily:    'var(--font-ui)',
      fontSize:      'var(--text-caption)',
      fontWeight:    600,
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      color:         'var(--color-fainter)',
      marginBottom:  14,
    }}>
      {children}
    </div>
  )
}

// ─── Retention bar row ────────────────────────────────────────────────────────

function RetentionBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', width: 24, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, backgroundColor: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--color-ink)', borderRadius: 3 }} />
      </div>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', width: 40, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(1)}%</span>
    </div>
  )
}

// ─── Content detail ───────────────────────────────────────────────────────────

export function ContentDetail({ item, onBack, onSelectStory }: ContentDetailProps) {
  const m          = item.metrics
  const isArticle  = item.type === 'article'
  const isYouTube  = item.type === 'youtube-video'
  const isPodcast  = item.type === 'podcast-episode'
  const isFacebook = item.type === 'facebook-post'
  const isNewsletter = item.type === 'newsletter'
  const isArabic   = item.language === 'ar'
  const { Icon }   = PLATFORM_CONFIG[item.platform]

  const parentStory = item.storyId ? getStoryById(item.storyId) : undefined
  const contributors = isArticle && item.authorIds ? getContributorsByIds(item.authorIds) : []

  const storyPlatforms = useMemo(() => {
    if (!parentStory) return []
    const members = getContentByStory(parentStory.id)
    const seen = new Set<string>()
    return JOURNEY_PLATFORM_ORDER.filter(p => {
      const has = members.some(c => c.platform === p)
      if (has && !seen.has(p)) { seen.add(p); return true }
      return false
    })
  }, [parentStory])

  // Has platform-specific native extras?
  const hasFbReactions  = isFacebook && (
    (m.reactionLike ?? 0) > 0 || (m.reactionLove ?? 0) > 0 || (m.reactionHaha ?? 0) > 0 ||
    (m.reactionWow ?? 0) > 0  || (m.reactionSorry ?? 0) > 0 || (m.reactionAnger ?? 0) > 0
  )
  const hasYtExtras     = isYouTube  && (m.avgViewDurationSec !== undefined || m.avgViewPct !== undefined)
  const hasPodExtras    = isPodcast  && (m.durationSec !== undefined)
  const hasNewsExtras   = isNewsletter && (m.emailsSent !== undefined)
  const hasArticleGA4   = isArticle  && (m.sessions !== undefined)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px 56px' }}>

      {/* Back */}
      <div style={{ padding: '20px 0 16px' }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-label)', color: 'var(--color-muted)', padding: 0 }}
        >
          <ArrowLeft weight="bold" size={14} />
          All content
        </button>
      </div>

      {/* ── Two-column: data LEFT · image RIGHT ──────────────────────────── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 320px',
        gap:                 '0 40px',
        alignItems:          'start',
        marginBottom:        28,
      }}>

        {/* LEFT: title, byline, meta, metrics grid */}
        <div>
          {/* Title */}
          <div dir="auto" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-page)', fontWeight: isArabic ? 600 : 500, color: 'var(--color-ink)', lineHeight: 1.45, marginBottom: 12 }}>
            {item.title}
          </div>

          {/* Contributor byline — articles only */}
          {contributors.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              {contributors.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Photo or initials fallback */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                    backgroundColor: c.photoUrl ? 'transparent' : 'var(--color-ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--color-border)',
                  }}>
                    {c.photoUrl
                      ? <img src={c.photoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, color: 'var(--color-paper)', letterSpacing: '0.02em' }}>
                          {c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </span>
                    }
                  </div>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', fontWeight: 500, color: 'var(--color-ink)' }}>
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Meta row: platform badge, content type, date, language, link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <PlatformBadge platform={item.platform} variant="icon-label" size={14} />
            <Tag>{CONTENT_TYPE_LABELS[item.type]}</Tag>
            {item.format  && <Tag>{FORMAT_LABELS[item.format]}</Tag>}
            {item.section && <Tag>{SECTION_LABELS[item.section]}</Tag>}
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)' }}>
              {formatDateShort(item.publishedAt)} · {LANGUAGE_LABELS[item.language]}
            </span>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display:      'inline-flex',
                  alignItems:   'center',
                  gap:          4,
                  fontFamily:   'var(--font-ui)',
                  fontSize:     'var(--text-caption)',
                  color:        'var(--color-muted)',
                  textDecoration: 'none',
                  border:       '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-btn)',
                  padding:      '3px 10px',
                  transition:   'border-color 120ms ease, color 120ms ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-ink)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-strong)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
                }}
              >
                <ArrowUpRight weight="bold" size={11} />
                View on {PLATFORM_CONFIG[item.platform].label}
              </a>
            )}
          </div>

          {/* ── Normalised metrics grid */}
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap:                 '20px 24px',
            backgroundColor:     'var(--color-tile)',
            border:              '1px solid var(--color-border)',
            borderRadius:        'var(--radius-card)',
            padding:             '20px 24px',
          }}>
            <Stat
              icon={<Eye weight="fill" size={12} />}
              label={isArticle ? 'Views' : isNewsletter ? 'Opens' : isPodcast ? 'Streams' : 'Impressions'}
              value={formatCompact(m.impressions)}
              tipKey="impressions"
            />

            {!isPodcast && (
              <Stat icon={<ChartBar weight="fill" size={12} />} label="Weighted Engagement" value={formatCompact(m.weightedEngagement)} tipKey="weighted_engagement" />
            )}

            {!isPodcast && (
              <div>
                <Stat icon={<Gauge weight="fill" size={12} />} label="Quality Rate" value={m.engagementQualityRate.toFixed(1)} tipKey="eqr" />
                {(isArticle || isYouTube) && <HonestyLabel>index · can exceed 100</HonestyLabel>}
              </div>
            )}

            {m.watchReadMinutes > 0 && !isFacebook && (
              <Stat
                icon={<Timer weight="fill" size={12} />}
                label={isArticle ? 'Total read time' : isYouTube ? 'Total watch time' : 'Total listen time'}
                value={formatMinutes(m.watchReadMinutes)}
                tipKey="attention"
              />
            )}

            {m.siteClicks > 0 && (
              <Stat icon={<ArrowUpRight weight="fill" size={12} />} label="Site Clicks" value={formatCompact(m.siteClicks)} tipKey="site_clicks" />
            )}

            {m.saves > 0 && (
              <Stat icon={<BookmarkSimple weight="fill" size={12} />} label={item.platform === 'x' ? 'Bookmarks' : 'Saves'} value={formatCompact(m.saves)} />
            )}

            {m.clicks > 0 && !isNewsletter && (
              <Stat icon={<Link weight="fill" size={12} />} label="Link Clicks" value={formatCompact(m.clicks)} />
            )}

            {m.penetrationRate !== null && m.penetrationRate !== undefined && (
              <div>
                <Stat icon={<Gauge weight="fill" size={12} />} label="Penetration Rate" value={`${m.penetrationRate.toFixed(1)}%`} />
                <HonestyLabel>index · can exceed 100%</HonestyLabel>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: hero image — natural platform ratio, sticky */}
        <div style={{ position: 'sticky', top: 70 }}>
          <div style={{
            borderRadius:    'var(--radius-section)',
            overflow:        'hidden',
            border:          '1px solid var(--color-border)',
            backgroundColor: '#F1EAD9',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            ...(item.thumbnailUrl ? {} : { aspectRatio: PLACEHOLDER_RATIO[item.type], maxHeight: 380 }),
          }}>
            {item.thumbnailUrl
              ? <img
                  src={item.thumbnailUrl}
                  alt=""
                  style={{ width: '100%', height: 'auto', maxHeight: 380, display: 'block', objectFit: 'contain' }}
                />
              : <Icon weight="fill" size={48} color="var(--color-border-strong)" />
            }
          </div>
        </div>
      </div>

      {/* ── Article: GA4 reading experience ──────────────────────────────── */}
      {isArticle && (hasArticleGA4 || m.attentionAvg > 0) && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 24, backgroundColor: 'var(--color-raised)' }}>
          <SectionLabel>Reading experience · GA4</SectionLabel>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {m.attentionAvg > 0 && <Stat icon={<Timer weight="fill" size={12} />} label="Avg read time" value={`${m.attentionAvg.toFixed(1)} min`} />}
            {m.sessions      !== undefined && <Stat icon={<Eye weight="fill" size={12} />}        label="Sessions"       value={formatCompact(m.sessions)} />}
            {m.uniqueVisitors !== undefined && <Stat icon={<UserCircle weight="fill" size={12} />} label="Unique visitors" value={formatCompact(m.uniqueVisitors)} />}
            {m.engagementRate !== undefined && <Stat icon={<ChartBar weight="fill" size={12} />}   label="Engagement rate" value={`${m.engagementRate.toFixed(1)}%`} description="engaged sessions / total" />}
            {m.bounceRate    !== undefined && <Stat icon={<ArrowUpRight weight="fill" size={12} />} label="Bounce rate"   value={`${m.bounceRate.toFixed(1)}%`} />}
            {m.avgEngagementTimeSec !== undefined && <Stat icon={<Timer weight="fill" size={12} />} label="Avg time on page" value={`${Math.round(m.avgEngagementTimeSec)}s`} />}
          </div>
        </div>
      )}

      {/* ── Facebook: interactions + reaction breakdown (Phosphor icons) ── */}
      {isFacebook && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 24, backgroundColor: 'var(--color-raised)' }}>
          <SectionLabel>Performance · Facebook</SectionLabel>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: hasFbReactions ? 24 : 0 }}>
            {m.reactions  > 0 && <Stat icon={<ThumbsUp    weight="fill" size={12} />} label="Reactions"    value={formatCompact(m.reactions)}  />}
            {m.comments   > 0 && <Stat icon={<ChatCircle  weight="fill" size={12} />} label="Comments"     value={formatCompact(m.comments)}   />}
            {m.shares     > 0 && <Stat icon={<ShareNetwork weight="fill" size={12} />} label="Shares"      value={formatCompact(m.shares)}     />}
            {m.videoViews > 0 && <Stat icon={<Play        weight="fill" size={12} />} label="Video views"  value={formatCompact(m.videoViews)} />}
            {m.videoViews > 0 && m.watchReadMinutes > 0 && (
              <Stat icon={<Timer weight="fill" size={12} />} label="Total watch time" value={formatMinutes(m.watchReadMinutes)} />
            )}
          </div>

          {/* Reaction breakdown — Phosphor icons, bold numbers, no emojis, no bars */}
          {hasFbReactions && (
            <>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', marginBottom: 12 }}>
                Reaction breakdown
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '12px 16px' }}>
                {([
                  { Icon: ThumbsUp,    color: '#1877F2', label: 'Like',  val: m.reactionLike  },
                  { Icon: Heart,       color: '#F33E58', label: 'Love',  val: m.reactionLove  },
                  { Icon: SmileyWink,  color: '#F7B125', label: 'Haha',  val: m.reactionHaha  },
                  { Icon: StarFour,    color: '#F7B125', label: 'Wow',   val: m.reactionWow   },
                  { Icon: SmileySad,   color: '#F7B125', label: 'Care',  val: m.reactionSorry },
                  { Icon: SmileyAngry, color: '#E9710F', label: 'Angry', val: m.reactionAnger },
                ] as { Icon: React.ComponentType<{ weight: string; size: number; color: string }>; color: string; label: string; val?: number }[])
                  .filter(r => (r.val ?? 0) > 0)
                  .map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <r.Icon weight="fill" size={16} color={r.color} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1, marginBottom: 2 }}>
                          {formatCompact(r.val!)}
                        </div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>{r.label}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Instagram post: reach, engagement, video ──────────────────────── */}
      {(item.type === 'ig-post' || item.type === 'ig-story') && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 24, backgroundColor: 'var(--color-raised)' }}>
          <SectionLabel>{item.type === 'ig-story' ? 'Story performance · Instagram' : 'Performance · Instagram'}</SectionLabel>
          {item.type === 'ig-post' ? (
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {m.igReach        !== undefined && <Stat icon={<Eye          weight="fill" size={12} />} label="Reach (unique)"   value={formatCompact(m.igReach)} />}
              {m.reactions       > 0          && <Stat icon={<Heart        weight="fill" size={12} />} label="Likes"           value={formatCompact(m.reactions)} />}
              {m.comments        > 0          && <Stat icon={<ChatCircle   weight="fill" size={12} />} label="Comments"        value={formatCompact(m.comments)} />}
              {m.saves           > 0          && <Stat icon={<BookmarkSimple weight="fill" size={12} />} label="Saves"         value={formatCompact(m.saves)} />}
              {m.shares          > 0          && <Stat icon={<ShareNetwork  weight="fill" size={12} />} label="Shares"        value={formatCompact(m.shares)} />}
              {m.videoViews      > 0          && <Stat icon={<Play          weight="fill" size={12} />} label="Video views"   value={formatCompact(m.videoViews)} />}
              {m.igProfileVisits !== undefined && <Stat icon={<UserCircle   weight="fill" size={12} />} label="Profile visits" value={formatCompact(m.igProfileVisits)} />}
              {m.igWebsiteTaps   !== undefined && <Stat icon={<Link         weight="fill" size={12} />} label="Link taps"     value={formatCompact(m.igWebsiteTaps)} />}
            </div>
          ) : (
            /* ig-story: fields from the Instagram Stories table */
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <Stat icon={<Eye weight="fill" size={12} />} label="Views" value={formatCompact(m.impressions)} />
              {m.igReach         !== undefined && m.igReach > 0         && <Stat icon={<Eye           weight="fill" size={12} />} label="Unique reach"   value={formatCompact(m.igReach)} />}
              {m.comments         > 0                                    && <Stat icon={<ChatCircle    weight="fill" size={12} />} label="Replies"        value={formatCompact(m.comments)} />}
              {m.shares           > 0                                    && <Stat icon={<ShareNetwork  weight="fill" size={12} />} label="Shares"         value={formatCompact(m.shares)} />}
              {m.igProfileVisits !== undefined && m.igProfileVisits > 0 && <Stat icon={<UserCircle    weight="fill" size={12} />} label="Profile visits" value={formatCompact(m.igProfileVisits)} />}
            </div>
          )}
        </div>
      )}

      {/* ── X (Twitter): full engagement breakdown ────────────────────────── */}
      {item.type === 'x-post' && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 24, backgroundColor: 'var(--color-raised)' }}>
          <SectionLabel>Performance · X</SectionLabel>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {m.reactions       > 0          && <Stat icon={<Heart          weight="fill" size={12} />} label="Likes"          value={formatCompact(m.reactions)} />}
            {m.shares          > 0          && <Stat icon={<ArrowsClockwise weight="fill" size={12} />} label="Reposts"       value={formatCompact(m.shares)} />}
            {m.comments        > 0          && <Stat icon={<ChatCircle     weight="fill" size={12} />} label="Replies"        value={formatCompact(m.comments)} />}
            {m.saves           > 0          && <Stat icon={<BookmarkSimple  weight="fill" size={12} />} label="Bookmarks"    value={formatCompact(m.saves)} />}
            {m.xQuotes        !== undefined && <Stat icon={<Quotes          weight="fill" size={12} />} label="Quotes"        value={formatCompact(m.xQuotes)} />}
            {m.xProfileClicks !== undefined && <Stat icon={<UserCircle      weight="fill" size={12} />} label="Profile clicks" value={formatCompact(m.xProfileClicks)} />}
            {m.clicks          > 0          && <Stat icon={<Link            weight="fill" size={12} />} label="Link clicks"  value={formatCompact(m.clicks)} />}
          </div>
        </div>
      )}

      {/* ── LinkedIn: professional reach + CTR ───────────────────────────── */}
      {item.type === 'linkedin-post' && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 24, backgroundColor: 'var(--color-raised)' }}>
          <SectionLabel>Performance · LinkedIn</SectionLabel>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {m.reactions          > 0          && <Stat icon={<ThumbsUp      weight="fill" size={12} />} label="Reactions"        value={formatCompact(m.reactions)} />}
            {m.comments           > 0          && <Stat icon={<ChatCircle    weight="fill" size={12} />} label="Comments"         value={formatCompact(m.comments)} />}
            {m.shares             > 0          && <Stat icon={<ShareNetwork  weight="fill" size={12} />} label="Shares"           value={formatCompact(m.shares)} />}
            {m.clicks             > 0          && <Stat icon={<CursorClick   weight="fill" size={12} />} label="Clicks"           value={formatCompact(m.clicks)} />}
            {m.liClickThroughRate !== undefined && <Stat icon={<Gauge        weight="fill" size={12} />} label="CTR"              value={`${m.liClickThroughRate.toFixed(2)}%`} />}
            {m.liEngagementRate   !== undefined && <Stat icon={<ChartBar     weight="fill" size={12} />} label="Engagement rate"  value={`${m.liEngagementRate.toFixed(2)}%`} />}
          </div>
        </div>
      )}

      {/* ── YouTube: view metrics + retention ────────────────────────────── */}
      {hasYtExtras && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 24, backgroundColor: 'var(--color-raised)' }}>
          <SectionLabel>View performance · YouTube</SectionLabel>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 20 }}>
            {m.durationSec !== undefined && (
              <Stat icon={<Timer weight="fill" size={12} />} label="Duration" value={`${Math.floor(m.durationSec / 60)}:${String(m.durationSec % 60).padStart(2, '0')}`} />
            )}
            {m.avgViewDurationSec !== undefined && (
              <Stat icon={<Timer weight="fill" size={12} />} label="Avg view duration" value={`${Math.floor(m.avgViewDurationSec / 60)}:${String(Math.round(m.avgViewDurationSec % 60)).padStart(2, '0')}`} />
            )}
            {m.avgViewPct !== undefined && (
              <Stat icon={<Gauge weight="fill" size={12} />} label="Avg viewed" value={`${m.avgViewPct.toFixed(1)}%`} />
            )}
            {m.subscribersGained !== undefined && (
              <Stat icon={<UserCircle weight="fill" size={12} />} label="Subscribers gained" value={`+${m.subscribersGained}`} />
            )}
          </div>
          {(m.retentionAt50 !== undefined) && (
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', marginBottom: 10 }}>Audience retention</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {m.retentionAt50  !== undefined && <RetentionBar label="50%" pct={m.retentionAt50}  />}
                {m.retentionAt75  !== undefined && <RetentionBar label="75%" pct={m.retentionAt75}  />}
                {m.retentionAt95  !== undefined && <RetentionBar label="95%" pct={m.retentionAt95}  />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Podcast: completion + retention ──────────────────────────────── */}
      {hasPodExtras && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 24, backgroundColor: 'var(--color-raised)' }}>
          <SectionLabel>Listen performance · Podcast</SectionLabel>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 20 }}>
            {m.durationSec !== undefined && (
              <Stat icon={<Microphone weight="fill" size={12} />} label="Duration" value={`${Math.floor(m.durationSec / 60)} min`} />
            )}
            {m.medianCompletionSec !== undefined && m.durationSec !== undefined && (
              <Stat
                icon={<Timer weight="fill" size={12} />}
                label="Median completion"
                value={`${Math.round((m.medianCompletionSec / m.durationSec) * 100)}%`}
                description={`${Math.floor(m.medianCompletionSec / 60)} min median`}
              />
            )}
            {m.retentionAt100 !== undefined && (
              <Stat icon={<Gauge weight="fill" size={12} />} label="Completion rate" value={`${m.retentionAt100.toFixed(1)}%`} description="reached end" />
            )}
          </div>
          {m.retentionAt25 !== undefined && (
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)', marginBottom: 10 }}>Audience retention</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {m.retentionAt25  !== undefined && <RetentionBar label="25%" pct={m.retentionAt25}  />}
                {m.retentionAt50  !== undefined && <RetentionBar label="50%" pct={m.retentionAt50}  />}
                {m.retentionAt75  !== undefined && <RetentionBar label="75%" pct={m.retentionAt75}  />}
                {m.retentionAt100 !== undefined && <RetentionBar label="End" pct={m.retentionAt100} />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Newsletter: open + click rates ───────────────────────────────── */}
      {hasNewsExtras && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 24, backgroundColor: 'var(--color-raised)' }}>
          <SectionLabel>Delivery performance · Mailchimp</SectionLabel>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {m.emailsSent  !== undefined && <Stat icon={<Envelope     weight="fill" size={12} />} label="Sent"         value={formatCompact(m.emailsSent)} />}
            {m.uniqueOpens !== undefined && <Stat icon={<Eye          weight="fill" size={12} />} label="Unique opens" value={formatCompact(m.uniqueOpens)} />}
            {m.openRate    !== undefined && <Stat icon={<Gauge        weight="fill" size={12} />} label="Open rate"    value={`${m.openRate.toFixed(1)}%`} />}
            {m.clicks > 0 && m.emailsSent !== undefined && (
              <Stat icon={<CursorClick weight="fill" size={12} />} label="Click rate" value={`${((m.clicks / m.emailsSent) * 100).toFixed(2)}%`} />
            )}
            {m.unsubscribes !== undefined && m.unsubscribes > 0 && (
              <Stat icon={<Article weight="fill" size={12} />} label="Unsubscribes" value={String(m.unsubscribes)} />
            )}
          </div>
        </div>
      )}

      {/* ── Parent story card ─────────────────────────────────────────────── */}
      {parentStory && (
        <div style={{
          border:          '1px solid var(--color-border)',
          borderRadius:    'var(--radius-card)',
          overflow:        'hidden',
          backgroundColor: 'var(--color-raised)',
        }}>
          {/* Card header label */}
          <div style={{
            padding:         '7px 16px',
            borderBottom:    '1px solid var(--color-border)',
            backgroundColor: 'var(--color-tile)',
            fontFamily:      'var(--font-ui)',
            fontSize:        'var(--text-caption)',
            fontWeight:      600,
            letterSpacing:   '0.06em',
            textTransform:   'uppercase',
            color:           'var(--color-fainter)',
          }}>
            Part of story
          </div>

          {/* Story card body */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
            {/* Thumbnail */}
            {parentStory.thumbnailUrl && (
              <div style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)' }}>
                <img src={parentStory.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            )}

            {/* Title + platforms */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div dir="auto" style={{
                fontFamily:      'var(--font-display)',
                fontSize:        16,
                fontWeight:      600,
                color:           'var(--color-ink)',
                lineHeight:      1.4,
                marginBottom:    8,
                overflow:        'hidden',
                display:         '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {parentStory.title}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                {storyPlatforms.map(p => (
                  <PlatformBadge key={p} platform={p} variant="icon-sm" />
                ))}
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)', marginLeft: 4 }}>
                  {parentStory.rollup.memberCount} pieces · {parentStory.rollup.platformCount} platforms
                </span>
              </div>
            </div>

            {/* Story-level impressions */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-section)', fontWeight: 600, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: 1, marginBottom: 3 }}>
                {formatCompact(parentStory.rollup.impressions)}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>impressions</div>
            </div>

            {/* View story CTA */}
            {onSelectStory && (
              <button
                onClick={() => onSelectStory(parentStory.id)}
                style={{
                  display:         'inline-flex',
                  alignItems:      'center',
                  gap:             5,
                  background:      'none',
                  border:          '1px solid var(--color-border-strong)',
                  borderRadius:    'var(--radius-btn)',
                  padding:         '0 12px',
                  height:          32,
                  fontFamily:      'var(--font-ui)',
                  fontSize:        'var(--text-label)',
                  color:           'var(--color-muted)',
                  cursor:          'pointer',
                  whiteSpace:      'nowrap',
                  flexShrink:      0,
                  transition:      'all 120ms ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-tile)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
              >
                View story →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
