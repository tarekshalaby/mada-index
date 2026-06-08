// Airtable Extension SDK provider.
// This is the ONLY file that imports from @airtable/blocks.
// It checks that all required tables are accessible, then calls useRecords()
// for each table and builds the cache via buildSdkCache() from adapter-sdk.ts.

import React, { useMemo }         from 'react'
import { useBase, useRecords }    from '@airtable/blocks/interface/ui'
import { buildSdkCache, setCache } from './adapter'
import type { SdkRec }            from './adapter'

const REQUIRED_TABLES = [
  'Stories', 'Content', 'WordPress Articles', 'Contributors', 'Followers',
  'Facebook Posts', 'Instagram Posts', 'Instagram Stories', 'X Posts',
  'LinkedIn Posts', 'YouTube Videos', 'MailChimp Emails', 'Podcast Episodes',
]

/**
 * Wrap your app in this provider in the extension entry point (extension.tsx).
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
  const rawStories   = useRecords(base.getTableByName('Stories'))          as SdkRec[]
  const rawContent   = useRecords(base.getTableByName('Content'))          as SdkRec[]
  const rawWp        = useRecords(base.getTableByName('WordPress Articles')) as SdkRec[]
  const rawContribs  = useRecords(base.getTableByName('Contributors'))      as SdkRec[]
  const rawFollowers = useRecords(base.getTableByName('Followers'))         as SdkRec[]
  const rawFb        = useRecords(base.getTableByName('Facebook Posts'))    as SdkRec[]
  const rawIgPosts   = useRecords(base.getTableByName('Instagram Posts'))   as SdkRec[]
  const rawIgStories = useRecords(base.getTableByName('Instagram Stories')) as SdkRec[]
  const rawX         = useRecords(base.getTableByName('X Posts'))           as SdkRec[]
  const rawLi        = useRecords(base.getTableByName('LinkedIn Posts'))    as SdkRec[]
  const rawYt        = useRecords(base.getTableByName('YouTube Videos'))    as SdkRec[]
  const rawMc        = useRecords(base.getTableByName('MailChimp Emails'))  as SdkRec[]
  const rawPod       = useRecords(base.getTableByName('Podcast Episodes'))  as SdkRec[]

  const cache = useMemo(
    () =>
      buildSdkCache(
        rawStories, rawContent, rawWp,      rawContribs, rawFollowers,
        rawFb,      rawIgPosts, rawIgStories, rawX,      rawLi,
        rawYt,      rawMc,      rawPod,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      rawStories, rawContent, rawWp,      rawContribs, rawFollowers,
      rawFb,      rawIgPosts, rawIgStories, rawX,      rawLi,
      rawYt,      rawMc,      rawPod,
    ],
  )

  // Write to module-level cache in adapter-sdk.ts synchronously during render.
  // SdkProviderInner wraps App, so child views always see current data.
  setCache(cache)

  return <>{children}</>
}
