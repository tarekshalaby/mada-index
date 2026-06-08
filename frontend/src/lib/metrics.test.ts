import { describe, it, expect } from 'vitest'
import {
  computeWeightedEngagement,
  computeEQR,
  computeInteractions,
  computeAttentionAvg,
  computePercentileRank,
  getPercentileBand,
  computeBenchmarkState,
  computeDeltaPct,
  platformForType,
  formatCompact,
  formatDelta,
} from './metrics'

describe('computeWeightedEngagement', () => {
  it('applies weights per the spec (Clicks×5 + Saves×4 + Comments×3 + Shares×2 + Reactions×1 + Watch×0.5)', () => {
    const result = computeWeightedEngagement({
      clicks: 10,
      saves: 10,
      comments: 10,
      shares: 10,
      reactions: 10,
      watchReadMinutes: 10,
    })
    // 10*5 + 10*4 + 10*3 + 10*2 + 10*1 + 10*0.5 = 50+40+30+20+10+5 = 155
    expect(result).toBe(155)
  })

  it('returns 0 for zero inputs', () => {
    expect(computeWeightedEngagement({
      clicks: 0, saves: 0, comments: 0, shares: 0, reactions: 0, watchReadMinutes: 0,
    })).toBe(0)
  })

  it('correctly weights time for long-form content', () => {
    // Article: 45000 pageviews, 3 min avg → 135000 total minutes
    const result = computeWeightedEngagement({
      clicks: 0, saves: 0, comments: 0, shares: 0, reactions: 0,
      watchReadMinutes: 135000,
    })
    expect(result).toBe(67500) // 135000 * 0.5
  })
})

describe('computeEQR', () => {
  it('returns (WE / impressions) × 100', () => {
    expect(computeEQR(67500, 45000)).toBeCloseTo(150)
  })

  it('can exceed 100 for attention-heavy content (index, not a capped %)', () => {
    const eqr = computeEQR(500, 100)
    expect(eqr).toBe(500)
    expect(eqr).toBeGreaterThan(100)
  })

  it('returns 0 when impressions is 0', () => {
    expect(computeEQR(1000, 0)).toBe(0)
  })
})

describe('computeInteractions', () => {
  it('sums all interaction signals', () => {
    expect(computeInteractions({ reactions: 100, comments: 50, shares: 30, saves: 20, clicks: 10 }))
      .toBe(210)
  })
})

describe('computeAttentionAvg', () => {
  it('divides total minutes by impressions', () => {
    expect(computeAttentionAvg(135000, 45000)).toBeCloseTo(3.0)
  })

  it('returns 0 when impressions is 0', () => {
    expect(computeAttentionAvg(1000, 0)).toBe(0)
  })
})

describe('computePercentileRank', () => {
  it('ranks 0 for the minimum value', () => {
    expect(computePercentileRank(1, [1, 2, 3, 4, 5])).toBe(0)
  })

  it('ranks near 100 for the maximum value', () => {
    const result = computePercentileRank(5, [1, 2, 3, 4, 5])
    expect(result).toBeGreaterThanOrEqual(75)
  })

  it('returns 50 for an empty cohort', () => {
    expect(computePercentileRank(100, [])).toBe(50)
  })

  it('a median value ranks near 50', () => {
    const result = computePercentileRank(50, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
    expect(result).toBeGreaterThan(30)
    expect(result).toBeLessThan(70)
  })
})

describe('getPercentileBand', () => {
  it('top for ≥75', () => expect(getPercentileBand(75)).toBe('top'))
  it('top for 100',  () => expect(getPercentileBand(100)).toBe('top'))
  it('bottom for ≤25', () => expect(getPercentileBand(25)).toBe('bottom'))
  it('bottom for 0',  () => expect(getPercentileBand(0)).toBe('bottom'))
  it('middle for 50', () => expect(getPercentileBand(50)).toBe('middle'))
})

describe('computeBenchmarkState', () => {
  it('good when good-up metric increases', () => {
    expect(computeBenchmarkState(120, 100, 'good-up')).toBe('good')
  })

  it('bad when good-up metric decreases', () => {
    expect(computeBenchmarkState(80, 100, 'good-up')).toBe('bad')
  })

  it('good when good-down metric decreases', () => {
    expect(computeBenchmarkState(80, 100, 'good-down')).toBe('good')
  })

  it('neutral for dead-band change (<1%)', () => {
    expect(computeBenchmarkState(100.5, 100, 'good-up')).toBe('neutral')
  })

  it('neutral-volume never colours', () => {
    expect(computeBenchmarkState(50, 100, 'neutral-volume')).toBe('neutral')
  })

  it('neutral when previous is 0', () => {
    expect(computeBenchmarkState(100, 0, 'good-up')).toBe('neutral')
  })
})

describe('platformForType', () => {
  it('maps article to website', () => expect(platformForType('article')).toBe('website'))
  it('maps ig-post to instagram', () => expect(platformForType('ig-post')).toBe('instagram'))
  it('maps ig-story to instagram', () => expect(platformForType('ig-story')).toBe('instagram'))
  it('maps x-post to x', () => expect(platformForType('x-post')).toBe('x'))
  it('maps newsletter to newsletter', () => expect(platformForType('newsletter')).toBe('newsletter'))
})

describe('formatCompact', () => {
  it('formats millions', () => expect(formatCompact(1_500_000)).toBe('1.5M'))
  it('formats thousands', () => expect(formatCompact(42_000)).toBe('42.0K'))
  it('passes through small numbers', () => expect(formatCompact(850)).toBe('850'))
})

describe('computeDeltaPct', () => {
  it('computes positive delta', () => {
    expect(computeDeltaPct(120, 100)).toBeCloseTo(20)
  })

  it('computes negative delta', () => {
    expect(computeDeltaPct(80, 100)).toBeCloseTo(-20)
  })

  it('returns null when previous is 0', () => {
    expect(computeDeltaPct(100, 0)).toBeNull()
  })
})

describe('formatDelta', () => {
  it('shows + for positive', () => expect(formatDelta(21)).toBe('+21%'))
  it('shows - for negative', () => expect(formatDelta(-15)).toBe('-15%'))
  it('returns em dash for null', () => expect(formatDelta(null)).toBe('—'))
})
