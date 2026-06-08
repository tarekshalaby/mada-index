import type { Format, Section, ContentType, Language } from '../data/types'

export const FORMAT_LABELS: Record<Format, string> = {
  'news':                  'News',
  'news-feature':          'News Feature',
  'feature-investigation': 'Feature',     // Article Type lookup value is "Feature"
  'op-ed':                 'Opinion',     // Article Type lookup value is "Opinion"
  'panorama':              'Panorama',
  'cartoon':               'Cartoon',
  'newsletter':            'Newsletter',
  'podcast':               'Podcast',
  'video':                 'Video',
  'breaking-news':         'Breaking News',
  'story-of-the-day':      'Story of the Day',
  'platform-native':       'Platform Native',
}

export const SECTION_LABELS: Record<Section, string> = {
  'egypt-politics':          'Egypt — politics',
  'egypt-economy':           'Egypt — economy',
  'egypt-society':           'Egypt — society',
  'regional-international':  'Regional & International',
  'culture':                 'Culture',
  'documentation-witness':   'Documentation & Witness',
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  'article':          'Article',
  'facebook-post':    'Facebook Post',
  'ig-post':          'Instagram Post',
  'ig-story':         'Instagram Story',
  'x-post':           'X Post',
  'linkedin-post':    'LinkedIn Post',
  'youtube-video':    'YouTube Video',
  'newsletter':       'Newsletter',
  'podcast-episode':  'Podcast Episode',
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  'ar':   'AR',
  'en':   'EN',
  'both': 'AR/EN',
  'na':   '—',
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateSpan(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  if (s.toDateString() === e.toDateString()) return formatDateShort(start)
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}`
  }
  return `${formatDateShort(start)} – ${formatDateShort(end)}`
}

// ─── Metric info (for tooltips) ───────────────────────────────────────────────

export const METRIC_INFO = {
  impressions: {
    name: 'Impressions',
    description: 'Total times content was displayed — pageviews for articles, impressions for social posts, opens for newsletters.',
  },
  weighted_engagement: {
    name: 'Weighted Engagement',
    description: 'Clicks×5 + Saves×4 + Comments×3 + Shares×2 + Reactions×1 + Watch time×0.5. Intent-led: clicks and saves are weighted highest because they show the strongest intent to read the article.',
  },
  eqr: {
    name: 'Engagement Quality Rate',
    description: 'Weighted Engagement ÷ Impressions × 100. Reads as an index, not a percentage — it can exceed 100 for long-form content with high watch or read time.',
  },
  site_clicks: {
    name: 'Site Clicks',
    description: 'Tracked clicks to madamasr.com via Bitly, t.co, and Mailchimp links. Shows how effectively social posts drove readers to the website.',
  },
  attention: {
    name: 'Attention',
    description: 'Total minutes of reading, watching, or listening — aggregated across all articles, videos, and podcast episodes in this story.',
  },
  save_rate: {
    name: 'Save Rate',
    description: 'Saves ÷ Impressions × 100. People who save content plan to return and read it — one of the strongest quality signals available.',
  },
  platforms: {
    name: 'Platforms',
    description: 'Number of distinct channels this story appeared on — from the original article through social posts, newsletter mentions, and podcasts.',
  },
} as const
