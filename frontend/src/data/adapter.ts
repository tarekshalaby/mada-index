// Data adapter — Airtable Extension SDK variant.
// Same public API as adapter.ts; reads live data from the Airtable SDK
// (useBase / useRecords) instead of REST API calls.
//
// Architecture
//   • This file contains only pure TypeScript — no React, no JSX, no @airtable/blocks.
//     The React provider component lives in src/data/SdkProvider.tsx.
//   • SdkProvider.tsx calls buildSdkCache() and setCache() to populate the
//     module-level _sdkCache below.  All exported adapter functions read from it.
//   • initAdapter() is re-exported as a no-op so App.tsx compiles unchanged.
//   • The extension build (vite.extension.config.ts) redirects all
//     import '…/data/adapter' specifiers here via a Vite resolveId plugin.

import type {
  Content, ContentType, Platform, Section, Format,
  Story, FollowersSnapshot, DateRange, Contributor, ContributorMonthly,
} from './types'
import {
  SAMPLE_CONTENT, SAMPLE_STORIES, SAMPLE_FOLLOWERS,
  SAMPLE_PREV_PERIOD, SAMPLE_PREV_PLATFORM, SAMPLE_PREV_FOLLOWERS,
  SAMPLE_CONTRIBUTORS, SAMPLE_CONTRIBUTOR_MONTHLY,
} from './sample'

// ─── Cache ────────────────────────────────────────────────────────────────────

export interface Cache {
  content:            Content[]
  stories:            Story[]
  contributors:       Contributor[]
  followers:          FollowersSnapshot[]
  contributorMonthly: ContributorMonthly[]
}

// Written by SdkProvider.tsx; read by the exported adapter functions below.
let _sdkCache: Cache | null = null

/** Called by SdkProvider when the cache is rebuilt from live SDK records. */
export function setCache(cache: Cache): void {
  _sdkCache = cache
}

// ISO timestamp of the most recent Make.com scenario run (from Sync Settings).
let _lastSyncTime: string | null = null

/** Called by SdkProvider after computing the latest 'Last Run Ended' from Sync Settings. */
export function setLastSyncTime(iso: string | null): void {
  _lastSyncTime = iso
}

/** Returns ISO timestamp of the most recent sync, or null if not yet known. */
export function getLastSyncTime(): string | null {
  return _lastSyncTime
}

// ─── SDK record interface ─────────────────────────────────────────────────────
//
// getCellValue() return types by Airtable field type:
//   Text / URL / formula → string | null
//   Number               → number | null
//   Single-select        → { id, name, color } | null
//   Linked records       → { id, name }[]        (never null — empty array)
//   Attachments          → { id, url, filename, … }[]
//   Lookup               → underlying field type, wrapped in an array

export interface SdkRec {
  id: string
  getCellValue(f: string): unknown
}

// ─── SDK field helpers ────────────────────────────────────────────────────────

/** Text / URL / formula field → trimmed string. Also handles single-select objects and Date values
 *  (the interface-alpha SDK returns dateTime fields as JS Date objects, not ISO strings). */
export function ss(r: SdkRec, f: string): string {
  try {
    const v = r.getCellValue(f)
    if (typeof v === 'string') return v.trim()
    if (v instanceof Date) return v.toISOString()
    if (v && typeof v === 'object' && !Array.isArray(v) && 'name' in v)
      return String((v as { name: string }).name).trim()
    return ''
  } catch { return '' }
}

/** Number field → number (0 when absent/null). */
export function sn(r: SdkRec, f: string): number {
  try {
    const v = r.getCellValue(f)
    return typeof v === 'number' ? v : 0
  } catch { return 0 }
}

/** Linked-record field → array of linked record IDs. */
export function sl(r: SdkRec, f: string): string[] {
  try {
    const v = r.getCellValue(f)
    if (!Array.isArray(v)) return []
    return (v as Array<{ id: string }>)
      .filter(item => item && typeof item.id === 'string')
      .map(item => item.id)
  } catch { return [] }
}

/** Attachment field → first attachment URL, or undefined. */
export function sa(r: SdkRec, f: string): string | undefined {
  try {
    const v = r.getCellValue(f)
    if (!Array.isArray(v) || !v.length) return undefined
    const first = v[0] as { url?: string }
    return typeof first?.url === 'string' ? first.url : undefined
  } catch { return undefined }
}

/** Lookup field → raw array (one element per looked-up record). */
export function sla(r: SdkRec, f: string): unknown[] {
  try {
    const v = r.getCellValue(f)
    return Array.isArray(v) ? v : []
  } catch { return [] }
}

// ─── Type / platform mapping (identical to adapter.ts) ────────────────────────

function mapType(type: string): ContentType {
  switch (type.trim()) {
    case 'Article':         return 'article'
    case 'Facebook Post':   return 'facebook-post'
    case 'Instagram Post':  return 'ig-post'
    case 'Instagram Story': return 'ig-story'
    case 'X Post':          return 'x-post'
    case 'YouTube Video':   return 'youtube-video'
    case 'Newsletter':      return 'newsletter'
    case 'LinkedIn Post':   return 'linkedin-post'
    case 'Podcast Episode': return 'podcast-episode'
    default:                return 'article'
  }
}

function mapPlatform(t: ContentType): Platform {
  switch (t) {
    case 'youtube-video':   return 'youtube'
    case 'facebook-post':   return 'facebook'
    case 'ig-post':
    case 'ig-story':        return 'instagram'
    case 'x-post':          return 'x'
    case 'linkedin-post':   return 'linkedin'
    case 'newsletter':      return 'newsletter'
    case 'podcast-episode': return 'podcast'
    default:                return 'website'
  }
}

function mapSection(wpCat: string): Section | undefined {
  if (/سياسة|politics|حقوق|أمن|اعتقال|قضاء/.test(wpCat))   return 'egypt-politics'
  if (/اقتصاد|economy|مال|أعمال|business|بنك/.test(wpCat))                          return 'egypt-economy'
  if (/مجتمع|society|بيئة|صحة|تعليم|health|education/.test(wpCat))                  return 'egypt-society'
  if (/عالم|عربي|regional|international|دولي|فلسطين|غزة|سودان/.test(wpCat)) return 'regional-international'
  if (/ثقافة|culture|فنون|أدب|منتهى|سينما|موسيقى/.test(wpCat)) return 'culture'
  if (/توثيق|شهادات|documentation|witness/.test(wpCat)) return 'documentation-witness'
  return undefined
}

function mapFormat(postType: string): Format | undefined {
  const t = postType.toLowerCase()
  if (t.includes('feature') || t.includes('investigation')) return 'feature-investigation'
  if (t === 'news' || t.includes('news'))                   return 'news'
  if (t.includes('opinion') || t.includes('op-ed'))         return 'op-ed'
  if (t.includes('panorama'))                               return 'panorama'
  if (t.includes('cartoon'))                                return 'cartoon'
  if (t.includes('breaking'))                               return 'breaking-news'
  return undefined
}

// Maps Stories.Article Type lookup values (= WP Post Type single-select names)
// to our Format enum. Values are capitalised e.g. "News", "Feature", "Opinion".
function mapStoryFormat(val: string): Format | undefined {
  switch (val.trim().toLowerCase()) {
    case 'feature':  return 'feature-investigation'
    case 'news':     return 'news'
    case 'opinion':  return 'op-ed'
    case 'panorama': return 'panorama'
    case 'cartoon':  return 'cartoon'
    default:         return undefined
  }
}

function mapFollowerPlatform(name: string): Platform {
  const n = name.toLowerCase()
  if (n.includes('facebook'))                              return 'facebook'
  if (n.includes('instagram'))                             return 'instagram'
  if (n.includes('youtube'))                               return 'youtube'
  if (n.includes('linkedin'))                              return 'linkedin'
  if (n.includes('podcast') || n.includes('spotify'))     return 'podcast'
  if (n === 'x' || n.includes('twitter'))                 return 'x'
  if (n.includes('newsletter') || n.includes('mailchimp')) return 'newsletter'
  return 'website'
}

// ─── Follower aggregation helpers ─────────────────────────────────────────────

// Groups raw snapshots by platform+date.
// • Records within 1% of each other → automation duplicates — keep the max.
// • Records >1% apart on the same platform+date → separate sub-entities
//   (e.g. Newsletter English + Newsletter Arabic) — sum them.
// This gives one clean FollowersSnapshot per platform per date.
function getAggregatedFollowerSnaps(): FollowersSnapshot[] {
  const raw = _sdkCache?.followers ?? SAMPLE_FOLLOWERS
  const groups: Record<string, FollowersSnapshot[]> = {}
  for (const snap of raw) {
    const key = `${snap.platform}:${snap.snapshotDate}`
    if (!groups[key]) groups[key] = []
    groups[key].push(snap)
  }
  return Object.values(groups).map(snaps => {
    // Sort highest first so dedup loop always keeps the larger value
    const sorted = [...snaps].sort((a, b) => b.followerCount - a.followerCount)
    const deduped: FollowersSnapshot[] = []
    for (const snap of sorted) {
      const isDupe = deduped.some(d =>
        Math.abs(d.followerCount - snap.followerCount) / Math.max(d.followerCount, 1) <= 0.01
      )
      if (!isDupe) deduped.push(snap)
    }
    const total = deduped.reduce((s, x) => s + x.followerCount, 0)
    return { ...deduped[0], followerCount: total }
  })
}

// Returns the per-platform follower totals from the most recent snapshot
// on or before `date`. Returns only platforms that have data.
function snapAtOrBefore(
  date:  string,
  snaps: FollowersSnapshot[],
): { values: Partial<Record<Platform, number>>; latestSnapDate: string | null } {
  const byPlatform: Partial<Record<Platform, { count: number; date: string }>> = {}
  for (const snap of snaps) {
    if (snap.snapshotDate > date) continue
    const prev = byPlatform[snap.platform]
    if (!prev || snap.snapshotDate > prev.date) {
      byPlatform[snap.platform] = { count: snap.followerCount, date: snap.snapshotDate }
    }
  }
  const snapDates   = Object.values(byPlatform).map(v => v!.date)
  const latestSnapDate = snapDates.length ? [...snapDates].sort().pop()! : null
  return {
    values: Object.fromEntries(
      Object.entries(byPlatform).map(([p, v]) => [p, v!.count]),
    ) as Partial<Record<Platform, number>>,
    latestSnapDate,
  }
}

// ─── Cache builder ────────────────────────────────────────────────────────────

export function buildSdkCache(
  rawStories:   SdkRec[],
  rawContent:   SdkRec[],
  rawWp:        SdkRec[],
  rawContribs:  SdkRec[],
  rawFollowers: SdkRec[],
  rawFb:        SdkRec[],
  rawIgPosts:   SdkRec[],
  rawIgStories: SdkRec[],
  rawX:         SdkRec[],
  rawLi:        SdkRec[],
  rawYt:        SdkRec[],
  rawMc:        SdkRec[],
  rawPod:       SdkRec[],
): Cache {

  // Platform lookup maps
  const fbById      = new Map(rawFb.map(r => [r.id, r]))
  const igPostById  = new Map(rawIgPosts.map(r => [r.id, r]))
  const igStoryById = new Map(rawIgStories.map(r => [r.id, r]))
  const xById       = new Map(rawX.map(r => [r.id, r]))
  const liById      = new Map(rawLi.map(r => [r.id, r]))
  const ytById      = new Map(rawYt.map(r => [r.id, r]))
  const mcById      = new Map(rawMc.map(r => [r.id, r]))
  const podById     = new Map(rawPod.map(r => [r.id, r]))

  // ── 1. Contributors ────────────────────────────────────────────────────────

  const contribById = new Map<string, Contributor>()
  for (const r of rawContribs) {
    const rawName = ss(r, 'Full Name') || ss(r, 'Name').replace(/^👤\s*/, '').trim()
    if (!rawName) continue
    contribById.set(r.id, {
      id:       r.id,
      name:     rawName,
      slug:     ss(r, 'Slug')  || undefined,
      bio:      ss(r, 'Bio')   || undefined,
      url:      ss(r, 'URL')   || undefined,
      photoUrl: sa(r, 'Photo'),
    })
  }

  // ── 2. Story ↔ Content linkage ─────────────────────────────────────────────

  const contentToStoryId = new Map<string, string>()
  for (const r of rawStories) {
    for (const cId of sl(r, 'Content')) {
      contentToStoryId.set(cId, r.id)
    }
  }

  // ── 3. WP Article by linked Content ID ───────────────────────────────────

  const wpByContentId = new Map<string, SdkRec>()
  for (const wp of rawWp) {
    for (const cId of sl(wp, 'Content')) {
      wpByContentId.set(cId, wp)
    }
  }

  // ── 4. Content items ───────────────────────────────────────────────────────

  const content: Content[] = rawContent
    .filter(r => !!ss(r, 'Published'))
    .map((r): Content => {
      const type     = mapType(ss(r, 'Type'))
      const platform = mapPlatform(type)
      const storyId  = contentToStoryId.get(r.id)
      const wp       = type === 'article' ? wpByContentId.get(r.id) : undefined

      const authorIds = wp
        ? sl(wp, 'Contributors')
            .map(rid => contribById.get(rid)?.id)
            .filter(Boolean) as string[]
        : []

      const thumb = (wp ? sa(wp, 'Thumbnail') : undefined) ?? sa(r, 'Image')

      const section = wp ? mapSection(ss(wp, 'WP Categories')) : undefined
      const format  = wp ? mapFormat(ss(wp, 'Post Type'))       : undefined
      const topics  = wp
        ? ss(wp, 'WP Tags').split(',').map(t => t.trim()).filter(Boolean)
        : undefined

      // Platform-specific record lookup via first linked ID
      const firstLinkedId = (field: string): string | undefined => sl(r, field)[0]
      const fb      = firstLinkedId('Facebook Post')   ? fbById.get(firstLinkedId('Facebook Post')!)      : undefined
      const igPost  = firstLinkedId('Instagram Post')  ? igPostById.get(firstLinkedId('Instagram Post')!) : undefined
      const igStory = firstLinkedId('Instagram Story') ? igStoryById.get(firstLinkedId('Instagram Story')!): undefined
      const xp      = firstLinkedId('X Post')          ? xById.get(firstLinkedId('X Post')!)              : undefined
      const li      = firstLinkedId('LinkedIn Post')   ? liById.get(firstLinkedId('LinkedIn Post')!)      : undefined
      const yt      = firstLinkedId('YouTube Video')   ? ytById.get(firstLinkedId('YouTube Video')!)      : undefined
      const mc      = firstLinkedId('Newsletter')      ? mcById.get(firstLinkedId('Newsletter')!)         : undefined
      const pod     = firstLinkedId('Podcast Episode') ? podById.get(firstLinkedId('Podcast Episode')!)   : undefined

      const pNum = (rec: SdkRec | undefined, key: string): number | undefined => {
        if (!rec) return undefined
        try { return rec.getCellValue(key) != null ? sn(rec, key) : undefined } catch { return undefined }
      }
      const pPct = (rec: SdkRec | undefined, key: string): number | undefined => {
        if (!rec) return undefined
        try { return rec.getCellValue(key) != null ? sn(rec, key) * 100 : undefined } catch { return undefined }
      }

      return {
        id:          r.id,
        type,
        platform,
        language:    ss(r, 'Language').toLowerCase().startsWith('a') ? 'ar' : 'en',
        publishedAt: ss(r, 'Published'),
        title:       ss(r, 'Title') || (wp ? ss(wp, 'Title') : ''),
        thumbnailUrl: thumb,
        url:          ss(r, 'URL') || undefined,
        storyId,
        countsTowardStoryTotal: !!storyId,
        format,
        section,
        topics:    topics?.length ? topics : undefined,
        authorIds: authorIds.length ? authorIds : undefined,
        potentialAudience: undefined,
        metrics: {
          impressions:  sn(r, 'Impressions'),
          // For Facebook posts, use "Total Reactions" from the FB record (sum of breakdown types)
          // rather than Content.Reactions (a number field written by the sync at an earlier point
          // in time). This ensures the header total always matches the breakdown sum.
          reactions:    fb ? (pNum(fb, 'Total Reactions') ?? sn(r, 'Reactions')) : sn(r, 'Reactions'),
          // For Facebook, prefer the source-of-truth FB record values — the Content table
          // fields are written once by the sync and can drift if the FB record is refreshed later.
          comments:     fb ? (pNum(fb, 'Comments') ?? sn(r, 'Comments')) : sn(r, 'Comments'),
          shares:       fb ? (pNum(fb, 'Shares')   ?? sn(r, 'Shares'))   : sn(r, 'Shares'),
          saves:        sn(r, 'Saves'),
          clicks:       sn(r, 'Clicks'),
          videoViews:   sn(r, 'Video Views'),
          watchReadMinutes:      sn(r, 'Attention'),
          // Weighted Engagement is a formula field. If interface-alpha SDK returns 0 for formulas,
          // fall back to computing it from raw components (same weights as the Airtable formula).
          weightedEngagement:    sn(r, 'Weighted Engagement') ||
            (sn(r, 'Clicks') * 5 + sn(r, 'Saves') * 4 + sn(r, 'Comments') * 3 +
             sn(r, 'Shares') * 2 + sn(r, 'Reactions') + sn(r, 'Attention') * 0.5),
          engagementQualityRate: sn(r, 'Engagement Quality Rate'),
          // Interactions is a formula field — fall back to summing raw components.
          interactions:          sn(r, 'Interactions') ||
            (sn(r, 'Reactions') + sn(r, 'Comments') + sn(r, 'Shares') +
             sn(r, 'Saves') + sn(r, 'Clicks')),
          attentionAvg:          sn(r, 'Attention (avg)'),
          penetrationRate:       null,
          // Site Clicks: formula field first, then rollup alternatives.
          siteClicks:
            sn(r, 'Site Clicks') ||
            sn(r, 'Site Clicks: Total') ||
            sn(r, 'Site Clicks (received)'),

          // Article GA4
          sessions:             wp ? sn(wp, 'Sessions')                  : undefined,
          uniqueVisitors:       wp ? sn(wp, 'Unique Visitors')           : undefined,
          engagementRate:       wp ? sn(wp, 'Engagement Rate') * 100     : undefined,
          bounceRate:           wp ? sn(wp, 'Bounce Rate') * 100         : undefined,
          avgEngagementTimeSec: wp ? sn(wp, 'Avg Engagement Time (sec)') : undefined,

          // Facebook
          reactionLike:  pNum(fb, 'Reaction: Like'),
          reactionLove:  pNum(fb, 'Reaction: Love'),
          reactionHaha:  pNum(fb, 'Reaction: Haha'),
          reactionWow:   pNum(fb, 'Reaction: Wow'),
          reactionSorry: pNum(fb, 'Reaction: Sorry'),
          reactionAnger: pNum(fb, 'Reaction: Anger'),

          // YouTube
          avgViewDurationSec: pNum(yt, 'Average View Duration (seconds)'),
          avgViewPct:         pPct(yt, 'Average View Percentage'),
          subscribersGained:  pNum(yt, 'Subscribers Gained'),
          retentionAt50:      pPct(yt, 'Retention at 50%'),
          retentionAt75:      pPct(yt, 'Retention at 75%'),
          retentionAt95:      pPct(yt, 'Retention at 95%'),

          // Podcast
          durationSec:         pNum(pod, 'Duration (seconds)') ?? pNum(yt, 'Duration (seconds)'),
          medianCompletionSec: pNum(pod, 'Median Completion (seconds)'),
          retentionAt25:       pPct(pod, 'Retention at 25%'),
          retentionAt100:      pPct(pod, 'Retention at 100%'),

          // Instagram
          igReach:         pNum(igStory, 'Reach'),
          igProfileVisits: pNum(igStory, 'Profile Visits'),
          igWebsiteTaps:   undefined,
          igPlays:         pNum(igPost, 'Views'),
          igTapsForward:   undefined,
          igTapsBack:      undefined,
          igExits:         undefined,
          igCompletionRate: undefined,

          // X
          xQuotes:        pNum(xp, 'Quote Tweets'),
          xProfileClicks: undefined,

          // LinkedIn
          liClickThroughRate: undefined,
          liEngagementRate:   pPct(li, 'Engagement Rate'),

          // Newsletter
          emailsSent:   pNum(mc, 'Emails Sent'),
          uniqueOpens:  pNum(mc, 'Unique Opens'),
          openRate:     pPct(mc, 'Open Rate'),
          clickRate:    pPct(mc, 'Click Rate'),
          unsubscribes: pNum(mc, 'Unsubscribed'),
        },
      }
    })

  // ── 5. Stories ─────────────────────────────────────────────────────────────

  const contentById = new Map(content.map(c => [c.id, c]))

  const stories: Story[] = rawStories
    .map((r): Story | null => {
      const memberIds = sl(r, 'Content')
      const members   = memberIds.map(id => contentById.get(id)).filter(Boolean) as Content[]
      if (!members.length) return null

      const anchor = members.find(c => c.platform === 'website') ?? members[0]

      // Article Title is a lookup → returns string[]
      const titleArr = sla(r, 'Article Title')
      const titleRaw = typeof titleArr[0] === 'string'
        ? titleArr[0]
        : ss(r, 'Name').replace(/^[^\s]+\s·?\s*/, '')

      // Images lookup — Attachment[][] or Attachment[]
      const imagesArr = sla(r, 'Images')
      const storyThumb = (() => {
        if (!imagesArr.length) return undefined
        const first = imagesArr[0]
        if (Array.isArray(first) && first.length) {
          const att = (first as Array<{ url?: string }>)[0]
          if (typeof att?.url === 'string') return att.url
        }
        if (first && typeof (first as { url?: string }).url === 'string')
          return (first as { url: string }).url
        return undefined
      })() ?? anchor.thumbnailUrl

      const secCounts = new Map<string, number>()
      for (const m of members) {
        if (m.section) secCounts.set(m.section, (secCounts.get(m.section) ?? 0) + 1)
      }
      const topSection = [...secCounts.entries()]
        .sort(([, a], [, b]) => b - a)[0]?.[0] as Section | undefined

      const topicSet = new Set<string>()
      for (const m of members) { m.topics?.forEach(t => topicSet.add(t)) }

      return {
        id:              r.id,
        title:           titleRaw || anchor.title,
        thumbnailUrl:    storyThumb,
        anchorContentId: anchor.id,
        memberIds:       members.map(c => c.id),
        publishedFirst:  ss(r, 'First Published'),
        publishedLast:   ss(r, 'Last Published'),
        format:          (() => {
          // Article Type is a lookup of WP Articles.Post Type → returns [{ id, name, color }]
          const at = sla(r, 'Article Type')
          const first = at[0]
          const t = first && typeof first === 'object' && 'name' in (first as object)
            ? String((first as { name: string }).name)
            : typeof first === 'string' ? first : ''
          return t ? mapStoryFormat(t) : anchor.format
        })(),
        section:         topSection,
        topics:          topicSet.size ? [...topicSet] : undefined,
        rollup: {
          impressions:           sn(r, 'Impressions'),
          weightedEngagement:    sn(r, 'Weighted Engagement'),
          interactions:          sn(r, 'Interactions'),
          siteClicks:            sn(r, 'Site Clicks') || sn(r, 'Clicks'),
          attentionTotalMinutes: sn(r, 'Attention (total)'),
          platformCount:         sn(r, 'Platform count'),
          memberCount:           members.length,
          eqr:                   sn(r, 'Engagement Quality Rate'),
        },
      }
    })
    .filter(Boolean) as Story[]

  // ── 6. Followers ───────────────────────────────────────────────────────────

  const followers: FollowersSnapshot[] = rawFollowers
    .filter(r => {
      if (!ss(r, 'Snapshot Date')) return false
      // Exclude "Website Arabic" and "Website English" rows — these are GA
      // article-pageview ceilings used as a Penetration denominator, not real
      // follower/subscriber counts. Including them overstates Total Followers.
      const name = ss(r, 'Platform').toLowerCase()
      if (name === 'website arabic' || name === 'website english') return false
      return true
    })
    .map((r, i) => ({
      id:            `fl-${i}`,
      platform:      mapFollowerPlatform(ss(r, 'Platform')),
      snapshotDate:  ss(r, 'Snapshot Date'),
      followerCount: sn(r, 'Follower Count'),
    }))

  // ── 7. Contributor monthly (computed from content) ─────────────────────────

  const monthlyMap = new Map<string, ContributorMonthly>()
  for (const c of content) {
    if (!c.authorIds?.length) continue
    const month = c.publishedAt.slice(0, 7)
    for (const authorId of c.authorIds) {
      const key = `${authorId}:${month}`
      const e   = monthlyMap.get(key) ?? {
        contributorId: authorId, month, articles: 0, impressions: 0, weightedEngagement: 0,
      }
      monthlyMap.set(key, {
        ...e,
        articles:           e.articles + 1,
        impressions:        e.impressions + c.metrics.impressions,
        weightedEngagement: e.weightedEngagement + c.metrics.weightedEngagement,
      })
    }
  }
  const contributorMonthly = [...monthlyMap.values()]
    .sort((a, b) =>
      a.contributorId !== b.contributorId
        ? a.contributorId.localeCompare(b.contributorId)
        : a.month.localeCompare(b.month),
    )

  return { content, stories, contributors: [...contribById.values()], followers, contributorMonthly }
}

// ─── Period helpers ───────────────────────────────────────────────────────────

function contentInRange(start: string, end: string): Content[] {
  const all = _sdkCache?.content ?? SAMPLE_CONTENT
  return all.filter(c => {
    const d = c.publishedAt.slice(0, 10)
    return d >= start && d <= end
  })
}

function contentForMonth(month: string): Content[] {
  const all = _sdkCache?.content ?? SAMPLE_CONTENT
  return all.filter(c => c.publishedAt.startsWith(month))
}

function periodToRange(period: string): { start: string; end: string } | null {
  if (period === 'may-26')  return { start: '2026-05-01', end: '2026-05-31' }
  if (period === 'apr-26')  return { start: '2026-04-01', end: '2026-04-30' }
  if (period === 'mar-26')  return { start: '2026-03-01', end: '2026-03-31' }
  if (period === 'q1-26')   return { start: '2026-01-01', end: '2026-03-31' }
  if (period === 'q2-26')   return { start: '2026-04-01', end: '2026-06-30' }
  if (period === 'h1-26')   return { start: '2026-01-01', end: '2026-06-30' }
  if (period === 'year-26') return { start: '2026-01-01', end: '2026-12-31' }

  const all = _sdkCache?.content ?? SAMPLE_CONTENT
  if (!all.length) return null
  const latestDate = all.map(c => c.publishedAt.slice(0, 10)).sort().pop()!
  const endD = new Date(latestDate + 'T00:00:00Z')

  let days = 0
  if (period === '7d')  days = 7
  if (period === '30d') days = 30
  if (period === '90d') days = 90
  if (!days) return null

  const startD = new Date(endD)
  startD.setUTCDate(endD.getUTCDate() - (days - 1))
  return { start: startD.toISOString().slice(0, 10), end: latestDate }
}

function prevPeriodRange(period: string): { start: string; end: string } | null {
  const range = periodToRange(period)
  if (!range) return null
  const startD = new Date(range.start + 'T00:00:00Z')
  const days   = Math.round(
    (new Date(range.end + 'T00:00:00Z').getTime() - startD.getTime()) / 86400000,
  ) + 1
  const prevEndD   = new Date(startD)
  prevEndD.setUTCDate(startD.getUTCDate() - 1)
  const prevStartD = new Date(prevEndD)
  prevStartD.setUTCDate(prevEndD.getUTCDate() - (days - 1))
  return {
    start: prevStartD.toISOString().slice(0, 10),
    end:   prevEndD.toISOString().slice(0, 10),
  }
}

// ─── Public exports (same API as adapter.ts) ──────────────────────────────────

/** No-op in the SDK adapter — SdkProvider handles data loading. */
export async function initAdapter(
  onProgress?: (pct: number, label: string) => void,
): Promise<void> {
  onProgress?.(100, 'Ready')
}

export function getContent(_range?: DateRange): Content[] {
  return _sdkCache?.content ?? SAMPLE_CONTENT
}

export function getContentById(id: string): Content | undefined {
  return (_sdkCache?.content ?? SAMPLE_CONTENT).find(c => c.id === id)
}

export function getContentByStory(storyId: string): Content[] {
  return (_sdkCache?.content ?? SAMPLE_CONTENT).filter(c => c.storyId === storyId)
}

export function getStories(_range?: DateRange): Story[] {
  return [...(_sdkCache?.stories ?? SAMPLE_STORIES)].sort(
    (a, b) => b.rollup.weightedEngagement - a.rollup.weightedEngagement,
  )
}

export function getStoryById(id: string): Story | undefined {
  return (_sdkCache?.stories ?? SAMPLE_STORIES).find(s => s.id === id)
}

export function getFollowersHistory(_range?: DateRange): FollowersSnapshot[] {
  if (!_sdkCache) return SAMPLE_FOLLOWERS
  // Return aggregated snaps: automation duplicates removed, newsletter sub-platforms summed
  return _sdkCache.followers.length ? getAggregatedFollowerSnaps() : SAMPLE_FOLLOWERS
}

export function getLatestFollowerTotal(): number {
  const snaps = getAggregatedFollowerSnaps()
  const latestDate = snaps.map(s => s.snapshotDate).sort().pop() ?? ''
  const { values } = snapAtOrBefore(latestDate, snaps)
  return Object.values(values).reduce((sum, n) => sum + n, 0)
}

/** Returns false when there is only one distinct snapshot date (no meaningful delta). */
export function hasSufficientFollowerHistory(): boolean {
  const snaps       = getAggregatedFollowerSnaps()
  const distinctDates = new Set(snaps.map(s => s.snapshotDate))
  return distinctDates.size >= 2
}

export interface PeriodTotals {
  impressions:           number
  weightedEngagement:    number
  siteClicks:            number
  followerTotal:         number
  attentionTotalMinutes: number
}

function totalsFromContent(items: Content[]): Omit<PeriodTotals, 'followerTotal'> {
  return {
    impressions:           items.reduce((s, c) => s + c.metrics.impressions, 0),
    weightedEngagement:    items.reduce((s, c) => s + c.metrics.weightedEngagement, 0),
    siteClicks:            items.reduce((s, c) => s + c.metrics.siteClicks, 0),
    attentionTotalMinutes: items.reduce((s, c) => s + c.metrics.watchReadMinutes, 0),
  }
}

export function getPeriodContent(period: string): Content[] {
  const range = periodToRange(period)
  if (!range) return _sdkCache?.content ?? SAMPLE_CONTENT
  return contentInRange(range.start, range.end)
}

export function isLiveData(): boolean { return !!_sdkCache }

export function getCurrentPeriodTotals(
  period = 'may-26',
  _range?: DateRange,
): PeriodTotals {
  const range = periodToRange(period)
  const items = range
    ? contentInRange(range.start, range.end)
    : (_sdkCache?.content ?? SAMPLE_CONTENT)
  return { ...totalsFromContent(items), followerTotal: getLatestFollowerTotal() }
}

export function getPreviousPeriodTotals(
  period = 'may-26',
  _range?: DateRange,
): PeriodTotals {
  if (_sdkCache) {
    const prev  = prevPeriodRange(period)
    const items = prev ? contentInRange(prev.start, prev.end) : []
    return { ...totalsFromContent(items), followerTotal: getLatestFollowerTotal() }
  }
  return SAMPLE_PREV_PERIOD
}

type PlatformAgg = { impressions: number; we: number; siteClicks: number; posts: number }

export function getPrevPlatformAggregates(): Record<string, PlatformAgg> {
  if (!_sdkCache) return SAMPLE_PREV_PLATFORM
  const aprilContent = contentForMonth('2026-04')
  const result: Record<string, PlatformAgg> = {}
  for (const c of aprilContent) {
    const p = c.platform
    const e = result[p] ?? { impressions: 0, we: 0, siteClicks: 0, posts: 0 }
    result[p] = {
      impressions: e.impressions + c.metrics.impressions,
      we:          e.we          + c.metrics.weightedEngagement,
      siteClicks:  e.siteClicks  + c.metrics.siteClicks,
      posts:       e.posts + 1,
    }
  }
  return result
}

/** @deprecated Use getFollowersForPeriod(period).start instead. */
export function getPrevFollowersByPlatform(): Partial<Record<Platform, number>> {
  // Kept for backward compat; AudienceTab now uses getFollowersForPeriod.
  if (!_sdkCache?.followers.length) return SAMPLE_PREV_FOLLOWERS
  const snaps      = getAggregatedFollowerSnaps()
  const sortedDates = [...new Set(snaps.map(s => s.snapshotDate))].sort()
  if (sortedDates.length < 2) return {}
  return snapAtOrBefore(sortedDates[sortedDates.length - 2], snaps).values
}

export interface TopicSummary {
  topic:              string
  weightedEngagement: number
  impressions:        number
  storyCount:         number
}

export function getTopicSummaries(limit = 5, period?: string): TopicSummary[] {
  let stories = _sdkCache?.stories ?? SAMPLE_STORIES
  if (period && _sdkCache) {
    const range = periodToRange(period)
    if (range) {
      const periodContent = contentInRange(range.start, range.end)
      const storyIds = new Set(
        periodContent.map(c => c.storyId).filter(Boolean) as string[],
      )
      stories = stories.filter(s => storyIds.has(s.id))
    }
  }
  const map = new Map<string, TopicSummary>()
  for (const story of stories) {
    for (const topic of story.topics ?? []) {
      const e = map.get(topic) ?? { topic, weightedEngagement: 0, impressions: 0, storyCount: 0 }
      map.set(topic, {
        topic,
        weightedEngagement: e.weightedEngagement + story.rollup.weightedEngagement,
        impressions:         e.impressions         + story.rollup.impressions,
        storyCount:          e.storyCount          + 1,
      })
    }
  }
  return [...map.values()]
    .sort((a, b) => b.weightedEngagement - a.weightedEngagement)
    .slice(0, limit)
}

export interface SeriesSummary {
  series: string
  weightedEngagement: number
  impressions: number
  storyCount: number
}

export function getSeriesSummaries(limit = 5, period?: string): SeriesSummary[] {
  let stories = _sdkCache?.stories ?? SAMPLE_STORIES
  if (period && _sdkCache) {
    const range = periodToRange(period)
    if (range) {
      const periodContent = contentInRange(range.start, range.end)
      const storyIds = new Set(
        periodContent.map(c => c.storyId).filter(Boolean) as string[],
      )
      stories = stories.filter(s => storyIds.has(s.id))
    }
  }
  const map = new Map<string, SeriesSummary>()
  for (const story of stories) {
    if (!story.series) continue
    const e = map.get(story.series) ?? { series: story.series, weightedEngagement: 0, impressions: 0, storyCount: 0 }
    map.set(story.series, {
      series:             e.series,
      weightedEngagement: e.weightedEngagement + story.rollup.weightedEngagement,
      impressions:        e.impressions         + story.rollup.impressions,
      storyCount:         e.storyCount          + 1,
    })
  }
  return [...map.values()]
    .sort((a, b) => b.weightedEngagement - a.weightedEngagement)
    .slice(0, limit)
}

export function getStoriesForPeriod(period: string): Story[] {
  if (!_sdkCache) return SAMPLE_STORIES
  const range = periodToRange(period)
  if (!range) return _sdkCache.stories
  const periodContent = contentInRange(range.start, range.end)
  const storyIds = new Set(
    periodContent.map(c => c.storyId).filter(Boolean) as string[],
  )
  return _sdkCache.stories.filter(s => storyIds.has(s.id))
}

export function getAllContributors(): Contributor[] {
  return _sdkCache?.contributors ?? SAMPLE_CONTRIBUTORS
}

export function getContributorById(id: string): Contributor | undefined {
  return (_sdkCache?.contributors ?? SAMPLE_CONTRIBUTORS).find(c => c.id === id)
}

export function getContributorsByIds(ids: string[]): Contributor[] {
  const all = _sdkCache?.contributors ?? SAMPLE_CONTRIBUTORS
  return ids.map(id => all.find(c => c.id === id)).filter(Boolean) as Contributor[]
}

export function getContentByContributor(contributorId: string): Content[] {
  return (_sdkCache?.content ?? SAMPLE_CONTENT).filter(
    c => c.authorIds?.includes(contributorId),
  )
}

export interface ContributorStats {
  articleCount:       number
  impressions:        number
  weightedEngagement: number
  avgEqr:             number
  siteClicks:         number
  storyCount:         number
}

export function getContributorStats(contributorId: string): ContributorStats {
  const items       = getContentByContributor(contributorId)
  const impressions = items.reduce((s, c) => s + c.metrics.impressions, 0)
  const we          = items.reduce((s, c) => s + c.metrics.weightedEngagement, 0)
  const eqrs        = items.map(c => c.metrics.engagementQualityRate)
  const avgEqr      = eqrs.length ? eqrs.reduce((s, v) => s + v, 0) / eqrs.length : 0
  const storyIds    = new Set(items.map(c => c.storyId).filter(Boolean))
  return {
    articleCount:       items.length,
    impressions,
    weightedEngagement: we,
    avgEqr,
    siteClicks:         items.reduce((s, c) => s + c.metrics.siteClicks, 0),
    storyCount:         storyIds.size,
  }
}

export function getAllContributorStats(): { contributor: Contributor; stats: ContributorStats }[] {
  return (_sdkCache?.contributors ?? SAMPLE_CONTRIBUTORS)
    .map(c => ({ contributor: c, stats: getContributorStats(c.id) }))
    .filter(({ stats }) => stats.articleCount > 0)
    .sort((a, b) => b.stats.impressions - a.stats.impressions)
}

export function getContributorMonthly(contributorId: string): ContributorMonthly[] {
  return (_sdkCache?.contributorMonthly ?? SAMPLE_CONTRIBUTOR_MONTHLY)
    .filter(m => m.contributorId === contributorId)
    .sort((a, b) => a.month.localeCompare(b.month))
}

export function getLatestFollowersByPlatform(): Partial<Record<Platform, number>> {
  const snaps      = getAggregatedFollowerSnaps()
  const latestDate = snaps.map(s => s.snapshotDate).sort().pop() ?? ''
  return snapAtOrBefore(latestDate, snaps).values
}

// ─── Period-aware follower query ──────────────────────────────────────────────
// Returns follower totals at the end of the given period, and at the start
// (for a delta badge). comparisonLabel is null when there is no prior snapshot
// to compare against (e.g. first week of recording — don't show the Chip).
export function getFollowersForPeriod(period: string): {
  end:             Partial<Record<Platform, number>>
  start:           Partial<Record<Platform, number>>
  comparisonLabel: string | null
} {
  const snaps     = getAggregatedFollowerSnaps()
  const range     = periodToRange(period)
  const allDates  = snaps.map(s => s.snapshotDate).sort()
  const endDate   = range?.end   ?? allDates[allDates.length - 1] ?? ''
  const startDate = range?.start ?? allDates[0] ?? ''

  const { values: end,   latestSnapDate: endSnap   } = snapAtOrBefore(endDate,   snaps)
  const { values: start, latestSnapDate: startSnap } = snapAtOrBefore(startDate, snaps)

  // No meaningful comparison if start and end land on the same real snapshot
  if (!startSnap || !endSnap || startSnap === endSnap) {
    return { end, start: {}, comparisonLabel: null }
  }

  const d = new Date(startSnap + 'T12:00:00')
  const comparisonLabel = 'vs. ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { end, start, comparisonLabel }
}
