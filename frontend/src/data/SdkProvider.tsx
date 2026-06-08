// Airtable Extension SDK provider.
// This is the ONLY file that imports from @airtable/blocks.
// It checks that all required tables are accessible, then calls useRecords()
// for each table and builds the cache via buildSdkCache() from adapter.ts.

import React, { useMemo }          from 'react'
import { useBase, useRecords }     from '@airtable/blocks/interface/ui'
import { buildSdkCache, setCache, setLastSyncTime, ss } from './adapter'
import type { SdkRec }                                   from './adapter'

const REQUIRED_TABLES = [
  'Stories', 'Content', 'WordPress Articles', 'Contributors', 'Followers',
  'Facebook Posts', 'Instagram Posts', 'Instagram Stories', 'X Posts',
  'LinkedIn Posts', 'YouTube Videos', 'MailChimp Emails', 'Podcast Episodes',
  'Sync Settings',
]

// Critical Content fields — without these, period filtering and KPIs can't work.
const CRITICAL_CONTENT_FIELDS = [
  'Published', 'Type', 'Language', 'Impressions',
  'Weighted Engagement', 'Reactions', 'Comments', 'Shares',
  'Saves', 'Attention', 'Site Clicks',
]

/**
 * Wrap your app in this provider in the extension entry point (index.tsx).
 * Checks that all required tables are accessible, then populates the adapter
 * cache from live base data so all views work without any changes.
 */
export function SdkDataProvider({ children }: { children: React.ReactNode }) {
  const base    = useBase()
  const missing = REQUIRED_TABLES.filter(t => !base.getTableByNameIfExists(t))

  if (missing.length > 0) {
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui', fontSize: 14, color: '#333' }}>
        <strong>Interface setup incomplete — missing tables:</strong>
        <ul style={{ marginTop: 8 }}>
          {missing.map(t => <li key={t}>{t}</li>)}
        </ul>
        <p style={{ marginTop: 12, color: '#666' }}>
          Open the Interface Designer and expose these tables to the extension.
        </p>
      </div>
    )
  }

  return <SdkProviderInner base={base}>{children}</SdkProviderInner>
}

/**
 * Inner provider — only mounts when all tables are confirmed accessible.
 * All useRecords() calls are unconditional (same order every render — required
 * by the rules of hooks).
 */
function SdkProviderInner({
  base,
  children,
}: {
  base: ReturnType<typeof useBase>
  children: React.ReactNode
}) {
  // One useRecords() call per table — unconditional, same order every render
  const rawStories   = useRecords(base.getTableByName('Stories'))           as SdkRec[]
  const rawContent   = useRecords(base.getTableByName('Content'))           as SdkRec[]
  const rawWp        = useRecords(base.getTableByName('WordPress Articles')) as SdkRec[]
  const rawContribs  = useRecords(base.getTableByName('Contributors'))       as SdkRec[]
  const rawFollowers = useRecords(base.getTableByName('Followers'))          as SdkRec[]
  const rawFb        = useRecords(base.getTableByName('Facebook Posts'))     as SdkRec[]
  const rawIgPosts   = useRecords(base.getTableByName('Instagram Posts'))    as SdkRec[]
  const rawIgStories = useRecords(base.getTableByName('Instagram Stories'))  as SdkRec[]
  const rawX         = useRecords(base.getTableByName('X Posts'))            as SdkRec[]
  const rawLi        = useRecords(base.getTableByName('LinkedIn Posts'))     as SdkRec[]
  const rawYt        = useRecords(base.getTableByName('YouTube Videos'))     as SdkRec[]
  const rawMc        = useRecords(base.getTableByName('MailChimp Emails'))   as SdkRec[]
  const rawPod       = useRecords(base.getTableByName('Podcast Episodes'))   as SdkRec[]
  const rawSync      = useRecords(base.getTableByName('Sync Settings'))       as SdkRec[]

  const cache = useMemo(
    () =>
      buildSdkCache(
        rawStories, rawContent, rawWp,       rawContribs, rawFollowers,
        rawFb,      rawIgPosts, rawIgStories, rawX,       rawLi,
        rawYt,      rawMc,      rawPod,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      rawStories, rawContent, rawWp,       rawContribs, rawFollowers,
      rawFb,      rawIgPosts, rawIgStories, rawX,       rawLi,
      rawYt,      rawMc,      rawPod,
    ],
  )

  // Write to module-level cache synchronously during render.
  // SdkProviderInner wraps App, so child views always see current data.
  setCache(cache)

  // Latest 'Last Run Ended' across all Sync Settings rows = when data was last refreshed.
  // ss() handles Date objects (interface-alpha SDK returns dateTime as JS Date).
  const latestSync = rawSync
    .map(r => ss(r, 'Last Run Ended'))
    .filter(Boolean)
    .sort()
    .pop() ?? null
  setLastSyncTime(latestSync)

  // ── Diagnostic ────────────────────────────────────────────────────────────
  // Inspect which fields the Interface Designer exposes to getCellValue().
  // In interface-alpha, only "visible" fields (configured in the right panel's
  // Fields ⚙️) are accessible. Missing fields throw → caught as '' / 0.
  const contentTable = base.getTableByName('Content')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessibleNames: string[] = (contentTable as any).fields?.map((f: any) => f.name) ?? []
  const accessibleSet  = new Set(accessibleNames)
  const missingCritical = CRITICAL_CONTENT_FIELDS.filter(f => !accessibleSet.has(f))

  // Always log to console so a DevTools check gives instant answers.
  console.info('[MadaIndex]', {
    rawContent:       rawContent.length,
    cacheContent:     cache.content.length,
    rawFollowers:     rawFollowers.length,
    cacheFollowers:   cache.followers.length,
    contentFields:    accessibleNames.length ? accessibleNames : '(table.fields not exposed by SDK)',
    missingCritical:  missingCritical,
  })

  // Show a visible setup banner if we can confirm fields are missing.
  const showFieldsBanner = accessibleNames.length > 0 && missingCritical.length > 0

  // Fallback banner: records loaded from SDK but all filtered out (Published field missing or null).
  // Shown when table.fields isn't exposed by the SDK so we can't enumerate accessible fields.
  const showCountBanner  = !showFieldsBanner && rawContent.length > 0 && cache.content.length === 0

  return (
    <>
      {showFieldsBanner && (
        <div style={{
          background: '#fffbf0',
          borderBottom: '2px solid #f59e0b',
          padding: '10px 16px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 12,
          color: '#92400e',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
          lineHeight: 1.5,
        }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span>
            <strong>Content fields not configured.</strong>
            {' '}In the Interface Designer right panel, click ⚙️ next to "Fields" → find the <strong>Content</strong> table → enable all fields (or at minimum:{' '}
            <em>{missingCritical.join(', ')}</em>).
            {' '}Do the same for Stories, WordPress Articles, and all platform tables.
          </span>
        </div>
      )}
      {showCountBanner && (
        <div style={{
          background: '#fff3cd',
          borderBottom: '2px solid #ffc107',
          padding: '10px 16px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 12,
          color: '#856404',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
          lineHeight: 1.5,
        }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span>
            <strong>{rawContent.length} Content records loaded, 0 passed date filter.</strong>
            {' '}The <strong>Published</strong> field is likely not in the Interface Designer's configured fields.
            {' '}Click ⚙️ next to "Fields" → Content table → enable Published + all metric fields.
            {' '}Open DevTools (F12 → Console) for full field diagnostics.
          </span>
        </div>
      )}
      {children}
    </>
  )
}
