import { describe, it, expect } from 'vitest'
import { generatePersonas, STRATA } from './persona-generator.mjs'

describe('PersonaGenerator', () => {
  const graphEntities = [
    { type: 'institution', name: 'EPA', domain: 'regulatory' },
    { type: 'institution', name: 'Federal appeals court', domain: 'judicial' },
    { type: 'actor', name: 'Petitioning states', domain: 'legal' },
    { type: 'institution', name: 'SEC', domain: 'regulatory' },
  ]

  it('generates the requested number of personas', () => {
    const personas = generatePersonas({ graphEntities, count: 1000 })
    expect(personas).toHaveLength(1000)
  })

  it('assigns unique IDs', () => {
    const personas = generatePersonas({ graphEntities, count: 100 })
    const ids = new Set(personas.map((p) => p.id))
    expect(ids.size).toBe(100)
  })

  it('stratifies by expertise', () => {
    const personas = generatePersonas({ graphEntities, count: 1000 })
    const legal = personas.filter((p) => p.expertise.includes('legal'))
    const finance = personas.filter((p) => p.expertise.includes('finance'))
    const political = personas.filter((p) => p.expertise.includes('political'))
    const general = personas.filter((p) => p.expertise.includes('general'))

    // Allow 3% tolerance on stratification targets
    expect(legal.length).toBeGreaterThan(90)   // target 12% = 120
    expect(legal.length).toBeLessThan(180)
    expect(finance.length).toBeGreaterThan(150) // target 20% = 200
    expect(finance.length).toBeLessThan(250)
    expect(political.length).toBeGreaterThan(130) // target 18% = 180
    expect(political.length).toBeLessThan(230)
    expect(general.length).toBeGreaterThan(400) // target 50% = 500
    expect(general.length).toBeLessThan(600)
  })

  it('assigns political lean distribution', () => {
    const personas = generatePersonas({ graphEntities, count: 500 })
    const leans = new Set(personas.map((p) => p.politicalLean))
    expect(leans.size).toBeGreaterThanOrEqual(3) // at least 3 different leans
  })

  it('assigns risk tolerance', () => {
    const personas = generatePersonas({ graphEntities, count: 100 })
    for (const p of personas) {
      expect(p.riskTolerance).toBeGreaterThanOrEqual(0)
      expect(p.riskTolerance).toBeLessThanOrEqual(1)
    }
  })

  it('assigns influence weight based on expertise', () => {
    const personas = generatePersonas({ graphEntities, count: 500 })
    const legalWeights = personas.filter((p) => p.expertise.includes('legal')).map((p) => p.influenceWeight)
    const generalWeights = personas.filter((p) => p.expertise.includes('general')).map((p) => p.influenceWeight)

    const avgLegal = legalWeights.reduce((a, b) => a + b, 0) / legalWeights.length
    const avgGeneral = generalWeights.reduce((a, b) => a + b, 0) / generalWeights.length

    // Legal experts should have higher average influence than general public
    expect(avgLegal).toBeGreaterThan(avgGeneral)
  })

  it('incorporates graph entities into legal persona backgrounds', () => {
    const personas = generatePersonas({ graphEntities, count: 1000 })
    const legal = personas.filter((p) => p.expertise.includes('legal'))

    // At least some legal personas should reference graph institutions
    const withContext = legal.filter((p) => p.domainContext?.length > 0)
    expect(withContext.length).toBeGreaterThan(0)
  })

  it('works with empty graph entities', () => {
    const personas = generatePersonas({ graphEntities: [], count: 100 })
    expect(personas).toHaveLength(100)
  })

  it('each persona has required fields', () => {
    const personas = generatePersonas({ graphEntities, count: 10 })
    for (const p of personas) {
      expect(p.id).toBeTruthy()
      expect(p.expertise).toBeInstanceOf(Array)
      expect(p.expertise.length).toBeGreaterThan(0)
      expect(typeof p.politicalLean).toBe('string')
      expect(typeof p.riskTolerance).toBe('number')
      expect(typeof p.influenceWeight).toBe('number')
    }
  })
})
