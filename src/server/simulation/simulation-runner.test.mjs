import { describe, it, expect } from 'vitest'
import { SimulationRunner, defaultMockAdapter } from './simulation-runner.mjs'
import { parseAgentResponse, buildAgentPrompt } from './agent-prompt.mjs'

describe('agent-prompt', () => {
  it('builds a structured prompt', () => {
    const prompt = buildAgentPrompt({
      persona: { expertise: ['legal'], politicalLean: 'centrist', riskTolerance: 0.5, domainContext: ['EPA'] },
      marketContext: { title: 'Will EPA rule be blocked?', marketPriceYes: 0.43, venue: 'Kalshi', subcategory: 'court-ruling' },
      neighborFeed: ['[legal] YES: Procedural speed favors block'],
      expertHypotheses: ['Briefing schedule tightened', 'Market underpricing speed'],
      tick: 3,
    })
    expect(prompt).toContain('legal')
    expect(prompt).toContain('EPA')
    expect(prompt).toContain('43')
    expect(prompt).toContain('tick 3')
  })

  it('parses valid JSON response', () => {
    const result = parseAgentResponse('{"position":"YES","confidence":0.75,"reasoning":"Strong evidence"}')
    expect(result.position).toBe('YES')
    expect(result.confidence).toBe(0.75)
    expect(result.reasoning).toBe('Strong evidence')
  })

  it('parses JSON from markdown code block', () => {
    const result = parseAgentResponse('```json\n{"position":"NO","confidence":0.6,"reasoning":"Overpriced"}\n```')
    expect(result.position).toBe('NO')
  })

  it('falls back on unparseable response', () => {
    const result = parseAgentResponse('I think YES is likely')
    expect(result.position).toBe('YES')
    expect(result.confidence).toBe(0.5)
  })

  it('handles null/empty input', () => {
    expect(parseAgentResponse(null).position).toBe('NEUTRAL')
    expect(parseAgentResponse('').position).toBe('NEUTRAL')
  })
})

describe('SimulationRunner', () => {
  const marketContext = {
    id: 'mkt-epa-june',
    title: 'Will a federal appeals court block the EPA rule by June 30?',
    venue: 'Kalshi',
    marketPriceYes: 0.43,
    fairValueYes: 0.57,
    subcategory: 'court-ruling',
  }

  const graphEntities = [
    { type: 'institution', name: 'EPA', domain: 'regulatory' },
    { type: 'institution', name: 'Federal appeals court', domain: 'judicial' },
  ]

  const expertHypotheses = [
    'Tighter briefing schedule increases odds of pre-deadline action.',
    'Market is underpricing procedural speed.',
  ]

  it('runs a simulation with mock adapter', async () => {
    const runner = new SimulationRunner({ batchSize: 100 })
    const result = await runner.run({
      marketContext,
      graphEntities,
      expertHypotheses,
      agentCount: 100,
      maxTicks: 5,
    })

    expect(result.marketId).toBe('mkt-epa-june')
    expect(result.agentCount).toBe(100)
    expect(result.completedTicks).toBeGreaterThanOrEqual(1)
    expect(result.completedTicks).toBeLessThanOrEqual(5)
    expect(result.ticks.length).toBe(result.completedTicks)
    expect(result.startedAt).toBeTruthy()
    expect(result.completedAt).toBeTruthy()
  })

  it('produces tick snapshots with required fields', async () => {
    const runner = new SimulationRunner({ batchSize: 50 })
    const result = await runner.run({
      marketContext,
      graphEntities,
      expertHypotheses,
      agentCount: 50,
      maxTicks: 3,
    })

    const tick = result.ticks[0]
    expect(tick.tick).toBe(1)
    expect(tick.positions.yes + tick.positions.no + tick.positions.neutral).toBeCloseTo(1, 1)
    expect(tick.consensus).toBeGreaterThan(0)
    expect(tick.consensus).toBeLessThanOrEqual(1)
    expect(tick.avgConfidence).toBeGreaterThan(0)
    expect(tick.majorityPosition).toMatch(/YES|NO/)

    // Factions should sum to ~1
    const factionSum = Object.values(tick.factions).reduce((a, b) => a + b, 0)
    expect(factionSum).toBeCloseTo(1, 1)
  })

  it('produces expert divergence in final state', async () => {
    const runner = new SimulationRunner({ batchSize: 100 })
    const result = await runner.run({
      marketContext,
      graphEntities,
      expertHypotheses,
      agentCount: 200,
      maxTicks: 3,
    })

    const divergence = result.finalState.expertDivergence
    expect(divergence.legal).toBeTruthy()
    expect(divergence.finance).toBeTruthy()
    expect(divergence.general).toBeTruthy()
    expect(divergence.legal.pYes).toBeGreaterThanOrEqual(0)
    expect(divergence.legal.pYes).toBeLessThanOrEqual(1)
    expect(divergence.legal.count).toBeGreaterThan(0)
  })

  it('stops early on consensus', async () => {
    // Custom adapter that always returns the same position
    const unanimousAdapter = async (prompts) =>
      prompts.map(() => '{"position":"YES","confidence":0.95,"reasoning":"Unanimous"}')

    const runner = new SimulationRunner({
      inferenceAdapter: unanimousAdapter,
      convergenceThreshold: 0.85,
      batchSize: 100,
    })

    const result = await runner.run({
      marketContext,
      graphEntities,
      expertHypotheses,
      agentCount: 100,
      maxTicks: 50,
    })

    expect(result.earlyStop).toBe(true)
    expect(result.completedTicks).toBeLessThan(50)
  })

  it('builds feed pool from high-confidence agents', async () => {
    const runner = new SimulationRunner({ batchSize: 50 })
    const result = await runner.run({
      marketContext,
      graphEntities,
      expertHypotheses,
      agentCount: 50,
      maxTicks: 3,
    })

    // After multiple ticks, some agents should have posted to the feed
    expect(result.feedPoolSize).toBeGreaterThan(0)
  })

  it('works with minimal inputs', async () => {
    const runner = new SimulationRunner({ batchSize: 10 })
    const result = await runner.run({
      marketContext: { id: 'test', title: 'Test?', marketPriceYes: 0.5, venue: 'Test' },
      agentCount: 10,
      maxTicks: 2,
    })
    expect(result.agentCount).toBe(10)
    expect(result.completedTicks).toBe(2)
  })
})
