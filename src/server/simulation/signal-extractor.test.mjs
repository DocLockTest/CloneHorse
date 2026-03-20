import { describe, it, expect } from 'vitest'
import { extractSignal } from './signal-extractor.mjs'

describe('SignalExtractor', () => {
  function makeSimResult(overrides = {}) {
    return {
      marketId: 'mkt-epa-june',
      agentCount: 1000,
      completedTicks: 10,
      earlyStop: false,
      ticks: [
        {
          tick: 10,
          positions: { yes: 0.32, no: 0.48, neutral: 0.20 },
          factions: {
            bullCoalition: 0.25,
            bearAlliance: 0.38,
            contrarians: 0.18,
            neutralMass: 0.19,
            volHawk: 0.00,
          },
          consensus: 0.48,
          volatility: 0.15,
          avgConfidence: 0.62,
          majorityPosition: 'NO',
        },
      ],
      finalState: {
        expertDivergence: {
          legal: { pYes: 0.18, avgConfidence: 0.72, count: 120 },
          finance: { pYes: 0.30, avgConfidence: 0.65, count: 200 },
          political: { pYes: 0.42, avgConfidence: 0.58, count: 180 },
          general: { pYes: 0.48, avgConfidence: 0.52, count: 500 },
        },
      },
      ...overrides,
    }
  }

  it('extracts a complete signal from simulation results', () => {
    const signal = extractSignal(makeSimResult(), 0.43)

    expect(signal.rawPYes).toBe(0.32)
    expect(signal.weightedPYes).toBeGreaterThan(0)
    expect(signal.weightedPYes).toBeLessThan(1)
    expect(signal.polarization).toBeGreaterThan(0)
    expect(signal.volatility).toBe(0.15)
    expect(signal.consensus).toBe(0.48)
    expect(signal.agentCount).toBe(1000)
    expect(signal.completedTicks).toBe(10)
  })

  it('calculates EV correctly', () => {
    const signal = extractSignal(makeSimResult(), 0.43)

    // EV = p * (1 - price) - (1 - p) * price
    // With weighted pYes around 0.33 and price 0.43:
    // EV should be negative (simulation says ~33% YES but market prices at 43%)
    expect(signal.ev).toBeLessThan(0)
    expect(signal.side).toBe('NO')
  })

  it('shows expert divergence', () => {
    const signal = extractSignal(makeSimResult(), 0.43)

    expect(signal.expertDivergence.legal.pYes).toBe(0.18)
    expect(signal.expertDivergence.general.pYes).toBe(0.48)
    // Legal experts are more bearish than general public
    expect(signal.expertDivergence.legal.pYes).toBeLessThan(signal.expertDivergence.general.pYes)
  })

  it('weights expert opinions higher than general public', () => {
    const signal = extractSignal(makeSimResult(), 0.43)

    // Weighted pYes differs from raw because expertise weighting
    // amplifies professional groups relative to their population share
    expect(signal.weightedPYes).not.toBeCloseTo(signal.rawPYes, 2)
    expect(signal.weightedPYes).toBeGreaterThan(0)
    expect(signal.weightedPYes).toBeLessThan(1)
  })

  it('handles empty simulation result', () => {
    const result = extractSignal({ ticks: [], finalState: {}, completedTicks: 0, agentCount: 0 }, 0.5)
    expect(result).toBeNull()
  })

  it('includes faction breakdown', () => {
    const signal = extractSignal(makeSimResult(), 0.43)

    expect(signal.factionBreakdown.bullCoalition).toBe(0.25)
    expect(signal.factionBreakdown.bearAlliance).toBe(0.38)
    const sum = Object.values(signal.factionBreakdown).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 1)
  })

  it('calculates signal confidence', () => {
    const signal = extractSignal(makeSimResult(), 0.43)
    expect(signal.signalConfidence).toBeGreaterThan(0)
    expect(signal.signalConfidence).toBeLessThanOrEqual(1)
  })
})
