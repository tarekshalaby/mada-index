// printReport.ts — generates a clean, self-contained HTML document for PDF export.
// No React. No Airtable. Pure string generation.
// Called by ReportsView's Print button — opens a new tab so Airtable's chrome
// is completely absent from the output.

import { formatCompact, formatMinutes } from './metrics'
import { PLATFORM_CONFIG, JOURNEY_PLATFORM_ORDER } from '../components/PlatformBadge'
import type { Platform, Story } from '../data/types'

export interface PrintData {
  periodLabel:         string
  impressions:         number
  weightedEng:         number
  attentionMinutes:    number
  byPlatform:          Partial<Record<Platform, number>>
  topStories:          Story[]
  platformRows:        Array<{ platform: Platform; posts: number; impressions: number; we: number; siteClicks: number }>
  contentMix:          { groups: Array<{ label: string; count: number; color: string }>; total: number }
  totalFollowers:      number
  followersByPlatform: Partial<Record<Platform, number>>
  filterTopic?:        string
  topicAggregate?:     { impressions: number; we: number; pieces: number; platforms: number } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dot(color: string): string {
  return `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${color};flex-shrink:0;"></span>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildPrintHTML(data: PrintData, generatedDate: string): string {
  const {
    periodLabel, impressions, weightedEng, attentionMinutes,
    byPlatform, topStories, platformRows, contentMix,
    totalFollowers, followersByPlatform, filterTopic, topicAggregate,
  } = data

  // ── 1. Impression mix bar ──────────────────────────────────────────
  const mixSegments = JOURNEY_PLATFORM_ORDER
    .filter(p => (byPlatform[p] ?? 0) > 0)
    .map(p => ({ p, pct: impressions > 0 ? (byPlatform[p]! / impressions) * 100 : 0, n: byPlatform[p]! }))

  const mixBar = mixSegments
    .map(({ p, pct }) =>
      `<div style="flex:0 0 ${pct}%;background:${PLATFORM_CONFIG[p].color};"></div>`,
    ).join('')

  const mixLegend = mixSegments
    .map(({ p, pct, n }) =>
      `<div style="display:flex;align-items:center;gap:5px;margin-right:18px;margin-bottom:5px;">
        ${dot(PLATFORM_CONFIG[p].color)}
        <span style="color:#555;font-size:10.5px;">${esc(PLATFORM_CONFIG[p].label)}</span>
        <span style="color:#999;font-size:10.5px;font-variant-numeric:tabular-nums;">${pct.toFixed(1)}% · ${formatCompact(n)}</span>
      </div>`,
    ).join('')

  // ── 2. Top stories ─────────────────────────────────────────────────
  const storiesHTML = topStories.map((s, i) => `
    <tr style="page-break-inside:avoid;">
      <td style="padding:11px 14px 11px 0;border-bottom:1px solid #eaeaea;width:24px;font-family:'Newsreader',Georgia,serif;font-size:15px;font-weight:600;color:#d0d0d0;text-align:right;vertical-align:top;">${i + 1}</td>
      <td style="padding:11px 0;border-bottom:1px solid #eaeaea;vertical-align:top;">
        <div style="display:flex;align-items:flex-start;gap:12px;">
          ${s.thumbnailUrl
            ? `<img src="${esc(s.thumbnailUrl)}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:5px;flex-shrink:0;border:1px solid #eaeaea;" />`
            : ''}
          <div>
            <div dir="auto" style="font-family:'Newsreader',Georgia,serif;font-size:13px;font-weight:600;color:#1a1a1a;line-height:1.5;margin-bottom:3px;">${esc(s.title || '—')}</div>
            <div style="font-size:10px;color:#aaa;">${s.rollup.memberCount ?? 1} platform${(s.rollup.memberCount ?? 1) !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </td>
      <td style="padding:11px 0 11px 24px;border-bottom:1px solid #eaeaea;text-align:right;vertical-align:top;white-space:nowrap;">
        <div style="font-family:'Newsreader',Georgia,serif;font-size:15px;font-weight:600;color:#1a1a1a;font-variant-numeric:tabular-nums;line-height:1.2;">${formatCompact(s.rollup.impressions)}</div>
        <div style="font-size:10px;color:#aaa;margin-top:2px;">impressions</div>
      </td>
      <td style="padding:11px 0 11px 20px;border-bottom:1px solid #eaeaea;text-align:right;vertical-align:top;white-space:nowrap;">
        <div style="font-family:'Newsreader',Georgia,serif;font-size:15px;font-weight:600;color:#1a1a1a;font-variant-numeric:tabular-nums;line-height:1.2;">${formatCompact(s.rollup.weightedEngagement)}</div>
        <div style="font-size:10px;color:#aaa;margin-top:2px;">Engagement</div>
      </td>
    </tr>`).join('')

  // ── 3. Platform breakdown table ────────────────────────────────────
  const platformTableRows = platformRows.map(row => `
    <tr style="page-break-inside:avoid;">
      <td style="padding:9px 8px 9px 0;border-bottom:1px solid #eaeaea;">
        <div style="display:flex;align-items:center;gap:7px;">
          ${dot(PLATFORM_CONFIG[row.platform].color)}
          <span style="font-size:12px;color:#1a1a1a;">${esc(PLATFORM_CONFIG[row.platform].label)}</span>
        </div>
      </td>
      <td style="padding:9px 8px;border-bottom:1px solid #eaeaea;text-align:right;font-size:12px;font-weight:500;color:${row.posts > 0 ? '#1a1a1a' : '#ccc'};font-variant-numeric:tabular-nums;">${row.posts > 0 ? row.posts : '—'}</td>
      <td style="padding:9px 8px;border-bottom:1px solid #eaeaea;text-align:right;font-size:12px;font-weight:500;color:${row.impressions > 0 ? '#1a1a1a' : '#ccc'};font-variant-numeric:tabular-nums;">${row.impressions > 0 ? formatCompact(row.impressions) : '—'}</td>
      <td style="padding:9px 8px;border-bottom:1px solid #eaeaea;text-align:right;font-size:12px;font-weight:500;color:${row.we > 0 ? '#1a1a1a' : '#ccc'};font-variant-numeric:tabular-nums;">${row.we > 0 ? formatCompact(row.we) : '—'}</td>
      <td style="padding:9px 0 9px 8px;border-bottom:1px solid #eaeaea;text-align:right;font-size:12px;font-weight:500;color:${row.siteClicks > 0 ? '#1a1a1a' : '#ccc'};font-variant-numeric:tabular-nums;">${row.siteClicks > 0 ? formatCompact(row.siteClicks) : '—'}</td>
    </tr>`).join('')

  // ── 4. Content mix ─────────────────────────────────────────────────
  const contentBar = contentMix.groups
    .map(g => `<div title="${esc(g.label)}: ${g.count}" style="flex:${g.count};background:${g.color};min-width:2px;"></div>`)
    .join('')

  const contentLegend = contentMix.groups
    .map(g => `
      <div style="display:flex;align-items:center;gap:5px;margin-right:16px;margin-bottom:5px;">
        ${dot(g.color)}
        <span style="font-size:10.5px;color:#555;">${esc(g.label)}</span>
        <span style="font-size:10.5px;font-weight:600;color:#1a1a1a;font-variant-numeric:tabular-nums;">${g.count}</span>
        <span style="font-size:10.5px;color:#aaa;">(${Math.round(g.count / contentMix.total * 100)}%)</span>
      </div>`)
    .join('')

  // ── 5. Audience ────────────────────────────────────────────────────
  const followersList = JOURNEY_PLATFORM_ORDER
    .filter(p => followersByPlatform[p])
    .map(p => `
      <div style="display:flex;align-items:center;gap:6px;margin-right:22px;margin-bottom:5px;">
        ${dot(PLATFORM_CONFIG[p].color)}
        <span style="font-size:10.5px;color:#555;">${esc(PLATFORM_CONFIG[p].label)}</span>
        <span style="font-size:10.5px;font-weight:600;color:#1a1a1a;font-variant-numeric:tabular-nums;">${formatCompact(followersByPlatform[p]!)}</span>
      </div>`)
    .join('')

  // ── 6. Campaign (only if a topic was selected in the filter) ───────
  const campaignHTML = filterTopic && topicAggregate ? `
    <div style="margin-top:24px;padding-top:24px;border-top:1px solid #e0e0e0;page-break-inside:avoid;">
      <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#aaa;margin-bottom:18px;">Campaign performance</div>
      <div style="background:#f7f7f5;border:1px solid #e0e0e0;border-radius:6px;padding:20px 24px;">
        <div style="font-family:'Newsreader',Georgia,serif;font-size:15px;font-weight:600;color:#1a1a1a;margin-bottom:18px;">${esc(filterTopic)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px 40px;">
          ${[
            ['Impressions', formatCompact(topicAggregate.impressions)],
            ['Weighted Engagement', formatCompact(topicAggregate.we)],
            ['Stories', String(topicAggregate.pieces)],
            ['Platforms', String(topicAggregate.platforms)],
          ].map(([label, value]) => `
            <div>
              <div style="font-size:9px;color:#aaa;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.07em;">${label}</div>
              <div style="font-family:'Newsreader',Georgia,serif;font-size:24px;font-weight:600;color:#1a1a1a;font-variant-numeric:tabular-nums;line-height:1;">${value}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>` : ''

  // ── Full HTML document ─────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mada Index — ${esc(periodLabel)} Performance Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: A4;
    margin: 22mm 20mm 20mm;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    background: #ffffff;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
    font-size: 13px;
    line-height: 1.5;
  }

  /* Screen preview wrapper */
  @media screen {
    .page { max-width: 740px; margin: 0 auto; padding: 40px 32px 64px; }
    .screen-toolbar {
      display: flex;
      justify-content: flex-end;
      max-width: 740px;
      margin: 24px auto 0;
      padding: 0 32px;
    }
    .screen-toolbar button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #1a1a1a;
      color: #fff;
      border: none;
      padding: 9px 18px;
      border-radius: 5px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
      letter-spacing: 0.01em;
    }
    .screen-toolbar button:hover { background: #333; }
  }
  @media print {
    .page { padding: 0; }
    .screen-toolbar { display: none; }
  }

  /* ─── Document header ─── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding-bottom: 18px;
    border-bottom: 2px solid #1a1a1a;
    margin-bottom: 32px;
  }
  .wordmark {
    font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
    font-size: 24px;
    font-weight: 600;
    color: #1a1a1a;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .report-period {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 14px;
    color: #666;
    margin-top: 5px;
  }
  .doc-meta {
    text-align: right;
  }
  .report-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #aaa;
  }
  .generated {
    font-size: 10px;
    color: #bbb;
    margin-top: 4px;
  }

  /* ─── Sections ─── */
  .section {
    margin-top: 28px;
    padding-top: 24px;
    border-top: 1px solid #e0e0e0;
    page-break-inside: avoid;
  }
  .section-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: #bbb;
    margin-bottom: 20px;
  }

  /* ─── KPIs ─── */
  .kpi-row { display: flex; gap: 0 56px; flex-wrap: wrap; margin-bottom: 22px; }
  .kpi-label {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #999;
    margin-bottom: 7px;
  }
  .kpi-value {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 36px;
    font-weight: 600;
    color: #1a1a1a;
    font-variant-numeric: tabular-nums lining-nums;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .kpi-note {
    font-size: 10px;
    color: #aaa;
    font-style: italic;
    margin-top: 5px;
  }

  /* ─── Bars ─── */
  .mix-bar {
    display: flex;
    height: 10px;
    border-radius: 5px;
    overflow: hidden;
    gap: 2px;
    margin-bottom: 12px;
  }
  .legend-row { display: flex; flex-wrap: wrap; }

  /* ─── Tables ─── */
  table { width: 100%; border-collapse: collapse; }
  th {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #aaa;
    padding: 6px 8px 10px;
    border-bottom: 2px solid #dedede;
    text-align: right;
    white-space: nowrap;
  }
  th:first-child { text-align: left; padding-left: 0; }
  td:last-child  { padding-right: 0; }

  /* ─── Note text ─── */
  .note { margin-top: 9px; font-size: 10px; color: #bbb; }

  /* ─── Footer ─── */
  .doc-footer {
    margin-top: 48px;
    padding-top: 12px;
    border-top: 1px solid #eaeaea;
    display: flex;
    justify-content: space-between;
    font-size: 9.5px;
    color: #ccc;
  }
</style>
</head>
<body>

<div class="screen-toolbar">
  <button onclick="window.print()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
    Save as PDF
  </button>
</div>

<div class="page">

  <!-- Document header -->
  <div class="doc-header">
    <div>
      <div class="wordmark">Mada Index</div>
      <div class="report-period">${esc(periodLabel)}</div>
    </div>
    <div class="doc-meta">
      <div class="report-label">Performance Report</div>
      <div class="generated">Generated ${esc(generatedDate)}</div>
    </div>
  </div>

  <!-- 1. Reach & Engagement -->
  <div class="section" style="border-top:none;padding-top:0;margin-top:0;">
    <div class="section-label">Reach &amp; Engagement</div>
    <div class="kpi-row">
      <div>
        <div class="kpi-label">Impressions</div>
        <div class="kpi-value">${formatCompact(impressions)}</div>
      </div>
      <div>
        <div class="kpi-label">Weighted Engagement</div>
        <div class="kpi-value">${formatCompact(weightedEng)}</div>
      </div>
      <div>
        <div class="kpi-label">Attention</div>
        <div class="kpi-value">${formatMinutes(attentionMinutes)}</div>
        <div class="kpi-note">time spent with our work</div>
      </div>
    </div>
    <div class="mix-bar">${mixBar}</div>
    <div class="legend-row">${mixLegend}</div>
  </div>

  <!-- 2. Top stories -->
  <div class="section">
    <div class="section-label">Top stories</div>
    <table>
      <tbody>${storiesHTML}</tbody>
    </table>
    <div class="note">Story-level rollups · ranked by Weighted Engagement</div>
  </div>

  <!-- 3. Platform breakdown -->
  <div class="section">
    <div class="section-label">Platform breakdown</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left;">Platform</th>
          <th>Posts</th>
          <th>Impressions</th>
          <th>Engagement</th>
          <th>Site Clicks</th>
        </tr>
      </thead>
      <tbody>${platformTableRows}</tbody>
    </table>
  </div>

  <!-- 4. Content mix + Audience — side by side -->
  <div class="section" style="display:grid;grid-template-columns:1fr 1fr;gap:40px;page-break-inside:avoid;">

    <div>
      <div class="section-label" style="margin-top:0;">Content mix</div>
      <div class="mix-bar">${contentBar}</div>
      <div class="legend-row">${contentLegend}</div>
      <div class="note">${contentMix.total} pieces total · each counted once</div>
    </div>

    <div>
      <div class="section-label" style="margin-top:0;">Audience</div>
      <div style="margin-bottom:14px;">
        <div class="kpi-label">Total followers</div>
        <div class="kpi-value" style="font-size:28px;">${formatCompact(totalFollowers)}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;padding-top:12px;border-top:1px solid #eaeaea;">
        ${followersList}
      </div>
    </div>

  </div>

  ${campaignHTML}

  <!-- Footer -->
  <div class="doc-footer">
    <span>Mada Index · Mada Masr</span>
    <span>${esc(generatedDate)}</span>
  </div>

</div>
</body>
</html>`
}
