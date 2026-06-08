import { useState } from 'react'
import {
  Eye, ChartBar, Link, Users, Clock,
  DownloadSimple,
} from '@phosphor-icons/react'
import {
  Button, Card, Chip, FilterChip, KpiTile,
  PercentileBadge, Tag, Tabs, Toggle,
} from '../components'
import { formatCompact, formatMinutes } from '../lib/metrics'
import { getCurrentPeriodTotals, getPreviousPeriodTotals } from '../data/adapter'

const current = getCurrentPeriodTotals()
const previous = getPreviousPeriodTotals()

type TabValue = 'comparison' | 'audience' | 'treatments'
type Period   = 'day' | 'week' | 'month'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div
        style={{
          fontFamily:  'var(--font-ui)',
          fontSize:    'var(--text-label)',
          fontWeight:  500,
          color:       'var(--color-fainter)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
        {children}
      </div>
    </div>
  )
}

export function ComponentGallery() {
  const [tab,    setTab]    = useState<TabValue>('comparison')
  const [period, setPeriod] = useState<Period>('week')
  const [section, setSection] = useState<string | undefined>('Egypt — economy')

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 28px' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontFamily:   'var(--font-display)',
            fontSize:     'var(--text-title-page)',
            fontWeight:   500,
            color:        'var(--color-ink)',
            marginBottom: 8,
          }}
        >
          Phase 1 — Component gallery
        </h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body)', color: 'var(--color-muted)' }}>
          All base components rendered on the warm-paper surface. Click the tabs above to navigate views in Phase 2+.
        </p>
      </div>

      {/* ── Buttons ────────────────────────────────────────── */}
      <Section title="Button">
        <Button variant="primary">Publish report</Button>
        <Button variant="secondary" icon={<DownloadSimple weight="fill" size={14} />}>Export CSV</Button>
        <Button variant="ghost">Clear filters</Button>
        <Button variant="icon" icon={<DownloadSimple weight="fill" size={20} />} aria-label="Download" />
        <Button variant="primary" disabled>Disabled</Button>
      </Section>

      {/* ── Toggle ─────────────────────────────────────────── */}
      <Section title="Toggle (filled pill)">
        <Toggle
          options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
          value={period}
          onChange={setPeriod}
        />
        <Toggle
          options={[{ value: 'ar', label: 'AR' }, { value: 'en', label: 'EN' }]}
          value="ar"
          onChange={() => {}}
        />
      </Section>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <Section title="Tabs (underline — sub-navigation)">
        <div style={{ width: '100%' }}>
          <Tabs
            options={[
              { value: 'comparison', label: 'Comparison' },
              { value: 'audience',   label: 'Audience'   },
              { value: 'treatments', label: 'Treatments' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      </Section>

      {/* ── FilterChip ─────────────────────────────────────── */}
      <Section title="FilterChip">
        <FilterChip label="Section" />
        <FilterChip
          label="Section"
          value={section}
          onClear={() => setSection(undefined)}
          onClick={() => setSection('Egypt — economy')}
        />
        <FilterChip label="Format" />
        <FilterChip label="Topic" value="حرب السودان" onClear={() => {}} />
      </Section>

      {/* ── Tag ────────────────────────────────────────────── */}
      <Section title="Tag (category pill)">
        <Tag>Feature / Investigation</Tag>
        <Tag>Egypt — politics</Tag>
        <Tag>Sudan Nashra</Tag>
        <Tag>News</Tag>
        <Tag>حرية الصحافة</Tag>
      </Section>

      {/* ── Chip (DeltaChip) ───────────────────────────────── */}
      <Section title="Chip — delta benchmark">
        <Chip current={120} previous={100} polarity="good-up" />
        <Chip current={80}  previous={100} polarity="good-up" />
        <Chip current={100} previous={100} polarity="good-up" />
        <Chip current={80}  previous={100} polarity="good-down" />
        <Chip current={0}   previous={0}   polarity="good-up" />
        <Chip current={10}  previous={0}   polarity="neutral-volume" />
      </Section>

      {/* ── PercentileBadge ────────────────────────────────── */}
      <Section title="PercentileBadge (within-Type ranking)">
        {[92, 78, 55, 42, 24, 8].map(p => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PercentileBadge percentile={p} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-faint)' }}>
              P{p}
            </span>
          </div>
        ))}
      </Section>

      {/* ── KpiTile ────────────────────────────────────────── */}
      <Section title="KpiTile (five Overview tiles)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, width: '100%' }}>
          <KpiTile
            label="Impressions"
            icon={<Eye weight="fill" size={14} />}
            value={formatCompact(current.impressions)}
            current={current.impressions}
            previous={previous.impressions}
          />
          <KpiTile
            label="Weighted Engagement"
            icon={<ChartBar weight="fill" size={14} />}
            value={formatCompact(current.weightedEngagement)}
            current={current.weightedEngagement}
            previous={previous.weightedEngagement}
          />
          <KpiTile
            label="Site Clicks"
            icon={<Link weight="fill" size={14} />}
            value={formatCompact(current.siteClicks)}
            current={current.siteClicks}
            previous={previous.siteClicks}
          />
          <KpiTile
            label="Total Followers"
            icon={<Users weight="fill" size={14} />}
            value={formatCompact(current.followerTotal)}
            current={current.followerTotal}
            previous={previous.followerTotal}
          />
          <KpiTile
            label="Attention"
            icon={<Clock weight="fill" size={14} />}
            value={formatMinutes(current.attentionTotalMinutes)}
            current={current.attentionTotalMinutes}
            previous={previous.attentionTotalMinutes}
          />
        </div>
      </Section>

      {/* ── Card ───────────────────────────────────────────── */}
      <Section title="Card">
        <Card style={{ minWidth: 280 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-item)', fontWeight: 500, color: 'var(--color-ink)', marginBottom: 8, direction: 'rtl' }}>
            غزة تحت النار: تغطية ميدانية من شهود العيان
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tag>Feature / Investigation</Tag>
            <Tag>Regional — International</Tag>
          </div>
        </Card>

        <Card style={{ minWidth: 280 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-item)', fontWeight: 500, color: 'var(--color-ink)', marginBottom: 8 }}>
            Gaza Under Fire: Eyewitness Accounts
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tag>Feature / Investigation</Tag>
            <Tag>Gaza War</Tag>
          </div>
        </Card>
      </Section>

      {/* ── Typography specimen ────────────────────────────── */}
      <Section title="Typography">
        {[
          ['display-xl', 'var(--text-display-xl)', 600, 'var(--font-display)', '1,862,000'],
          ['display-l',  'var(--text-display-l)',  600, 'var(--font-display)', '617.9K'],
          ['title-page', 'var(--text-title-page)', 500, 'var(--font-display)', 'Stories'],
          ['title-section','var(--text-title-section)',500,'var(--font-display)','Top performers'],
          ['title-item', 'var(--text-title-item)',  500, 'var(--font-display)', 'غزة تحت النار: تغطية ميدانية'],
          ['body',       'var(--text-body)',         400, 'var(--font-ui)',      'Content published in this period'],
          ['data',       'var(--text-data)',          500, 'var(--font-ui)',     '284,000 impressions'],
          ['label',      'var(--text-label)',         500, 'var(--font-ui)',     'SECTION'],
          ['caption',    'var(--text-caption)',       400, 'var(--font-ui)',     'publish cohort · correlation, not attribution'],
        ].map(([token, size, weight, family, sample]) => (
          <div key={token as string} style={{ width: '100%', display: 'flex', gap: 16, alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-fainter)', minWidth: 100 }}>
              {token as string}
            </span>
            <span style={{ fontFamily: family as string, fontSize: size as string, fontWeight: weight as number, color: 'var(--color-ink)' }}>
              {sample as string}
            </span>
          </div>
        ))}
      </Section>

      {/* ── Colour swatches ────────────────────────────────── */}
      <Section title="Platform palette">
        {[
          ['Facebook',    '#1877F2'],
          ['Website',     '#E37400'],
          ['X',           '#15181C'],
          ['IG Posts',    '#8A3AB9'],
          ['IG Stories',  '#D4537E'],
          ['YouTube',     '#C0392B'],
          ['LinkedIn',    '#08538D'],
          ['Newsletter',  '#E0A526'],
          ['Podcast',     '#1DB954'],
        ].map(([name, hex]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'block', width: 20, height: 20, borderRadius: 4, backgroundColor: hex, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-muted)' }}>
              {name} <span style={{ color: 'var(--color-fainter)' }}>{hex}</span>
            </span>
          </div>
        ))}
      </Section>
    </div>
  )
}
