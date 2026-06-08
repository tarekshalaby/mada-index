// ─── Content types ────────────────────────────────────────────────────────────

export type ContentType =
  | 'article'
  | 'facebook-post'
  | 'ig-post'
  | 'ig-story'
  | 'x-post'
  | 'linkedin-post'
  | 'youtube-video'
  | 'newsletter'
  | 'podcast-episode'

// The 8 channel platforms — Instagram posts and stories both map to 'instagram'
export type Platform =
  | 'website'
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'youtube'
  | 'linkedin'
  | 'newsletter'
  | 'podcast'

export type Language = 'ar' | 'en' | 'both' | 'na'

export type Format =
  | 'news'
  | 'news-feature'
  | 'feature-investigation'
  | 'op-ed'
  | 'panorama'
  | 'cartoon'
  | 'newsletter'
  | 'podcast'
  | 'video'
  | 'breaking-news'
  | 'story-of-the-day'
  | 'platform-native'

export type Section =
  | 'egypt-politics'
  | 'egypt-economy'
  | 'egypt-society'
  | 'regional-international'
  | 'culture'
  | 'documentation-witness'

// ─── Contributors ─────────────────────────────────────────────────────────────

export interface Contributor {
  id: string
  name: string
  slug?: string
  bio?: string
  url?: string
  photoUrl?: string
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface ContentMetrics {
  // Raw inputs (platform-mapped)
  impressions: number
  reactions: number
  comments: number
  shares: number
  saves: number
  clicks: number           // native link clicks (only some platforms)
  videoViews: number
  watchReadMinutes: number // total engaged minutes across all sessions

  // Derived (computed client-side)
  weightedEngagement: number
  engagementQualityRate: number  // can exceed 100 — render as index
  interactions: number           // reactions+comments+shares+saves+clicks
  attentionAvg: number           // watchReadMinutes / impressions
  penetrationRate: number | null // impressions / potentialAudience × 100

  // Site clicks: Bitly/t.co/Mailchimp links → madamasr.com (separate from native clicks)
  siteClicks: number

  // ── Platform-native extras (optional — only present where the source exposes them) ──
  // Facebook
  reactionLike?: number
  reactionLove?: number
  reactionHaha?: number
  reactionWow?: number
  reactionSorry?: number
  reactionAnger?: number
  // Article (GA4)
  sessions?: number
  uniqueVisitors?: number
  engagementRate?: number       // engaged sessions / sessions × 100
  bounceRate?: number           // (1 − engagementRate) × 100
  avgEngagementTimeSec?: number // GA4 userEngagementDuration
  // Newsletter (Mailchimp)
  emailsSent?: number
  uniqueOpens?: number
  openRate?: number             // unique opens / sent × 100
  clickRate?: number            // unique clicks / sent × 100
  unsubscribes?: number
  // YouTube
  avgViewDurationSec?: number
  avgViewPct?: number           // 0–100
  subscribersGained?: number
  retentionAt50?: number        // % of audience reaching 50%
  retentionAt75?: number
  retentionAt95?: number
  // Podcast
  durationSec?: number
  medianCompletionSec?: number
  retentionAt25?: number
  retentionAt100?: number       // completion rate

  // Instagram
  igReach?: number              // unique accounts reached (vs. total impressions)
  igProfileVisits?: number      // profile visits driven by this post
  igWebsiteTaps?: number        // bio-link taps (posts) or link-sticker taps (stories)
  igPlays?: number              // reel / video plays
  igTapsForward?: number        // stories: taps to next story
  igTapsBack?: number           // stories: taps back
  igExits?: number              // stories: exits / swipe-aways
  igCompletionRate?: number     // stories: % who watched to end (0–100)

  // X / Twitter
  xQuotes?: number              // quote tweets (distinct from retweets/shares)
  xProfileClicks?: number       // profile header clicks from this tweet

  // LinkedIn
  liClickThroughRate?: number   // clicks / impressions × 100
  liEngagementRate?: number     // (clicks + reactions + comments + shares) / impressions × 100
}

// ─── Content ──────────────────────────────────────────────────────────────────

export interface Content {
  id: string
  type: ContentType
  platform: Platform
  language: Language
  publishedAt: string       // ISO date string
  title: string
  thumbnailUrl?: string
  url?: string

  storyId?: string          // link to the parent Story
  countsTowardStoryTotal: boolean  // false for newsletters/roundups spanning multiple stories

  // Editorial classification (inherited from Story via the anchor article)
  format?: Format
  section?: Section
  series?: string
  topics?: string[]
  authorIds?: string[]       // IDs into the Contributors table

  // Potential audience (used for penetration rate denominator)
  potentialAudience?: number

  metrics: ContentMetrics
}

// ─── Story ────────────────────────────────────────────────────────────────────

export interface StoryRollup {
  impressions: number
  weightedEngagement: number
  interactions: number
  siteClicks: number
  attentionTotalMinutes: number
  platformCount: number
  memberCount: number
  eqr: number              // story WE / story impressions × 100
}

export interface Story {
  id: string
  title: string
  thumbnailUrl?: string
  anchorContentId: string   // the primary article
  memberIds: string[]       // all linked Content rows
  publishedFirst: string    // ISO date — first piece published
  publishedLast: string     // ISO date — last piece published

  // Editorial classification (from anchor article)
  format?: Format
  section?: Section
  series?: string
  topics?: string[]

  rollup: StoryRollup
}

// ─── Followers ────────────────────────────────────────────────────────────────

export interface FollowersSnapshot {
  id: string
  platform: Platform
  snapshotDate: string   // ISO date (weekly)
  followerCount: number
}

// ─── Contributor monthly aggregates (for profile trend charts) ────────────────

export interface ContributorMonthly {
  contributorId: string
  month:         string   // 'YYYY-MM'
  articles:      number
  impressions:   number
  weightedEngagement: number
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface DateRange {
  start: string
  end: string
}

// Metric polarity — governs DeltaChip colour (good/bad decoupled from up/down)
export type MetricPolarity = 'good-up' | 'good-down' | 'neutral-volume'

export type BenchmarkState = 'good' | 'bad' | 'neutral'
export type PercentileBand = 'top' | 'middle' | 'bottom'
