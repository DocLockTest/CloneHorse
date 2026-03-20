import { generatePersonas } from './persona-generator.mjs'
import { buildAgentPrompt, parseAgentResponse } from './agent-prompt.mjs'

/** Faction labels assigned based on position + confidence patterns. */
const FACTIONS = ['bullCoalition', 'bearAlliance', 'contrarians', 'neutralMass', 'volHawk']

/** Simulation Runner — OASIS-style env.step() loop.
 * Generates personas, runs multi-tick debate, tracks faction formation,
 * and records opinion evolution. Supports both real LLM and mock inference. */
export class SimulationRunner {
  constructor({ inferenceAdapter, batchSize = 50, convergenceThreshold = 0.85 } = {}) {
    this.inferenceAdapter = inferenceAdapter ?? defaultMockAdapter
    this.batchSize = batchSize
    this.convergenceThreshold = convergenceThreshold
  }

  /** Run a full simulation.
   * @param marketContext — { id, title, venue, marketPriceYes, fairValueYes, subcategory, ... }
   * @param graphEntities — array of { type, name, domain } from knowledge graph
   * @param expertHypotheses — string[] of expert claims from world state
   * @param agentCount — number of agents (default 1000)
   * @param maxTicks — maximum simulation rounds (default 50)
   * @returns SimulationResult */
  async run({ marketContext, graphEntities = [], expertHypotheses = [], agentCount = 1000, maxTicks = 50 }) {
    const personas = generatePersonas({ graphEntities, count: agentCount })
    const startedAt = new Date().toISOString()

    // State per agent: current position, history of position changes
    const agentStates = new Map()
    for (const p of personas) {
      agentStates.set(p.id, {
        persona: p,
        position: 'NEUTRAL',
        confidence: 0,
        reasoning: '',
        positionHistory: [],
        posts: [], // content this agent has "posted" into the feed pool
      })
    }

    const feedPool = [] // shared content pool — agents post here, neighbors read from here
    const tickSnapshots = []

    let completedTicks = 0
    let earlyStop = false

    for (let tick = 1; tick <= maxTicks; tick++) {
      // 1. Build neighbor feeds (each agent sees a random sample from the pool)
      // 2. Run inference for each agent in batches
      // 3. Update positions, add posts to feed pool
      // 4. Record tick snapshot
      // 5. Check convergence

      const tickResults = []

      // Process agents in batches for inference efficiency
      for (let i = 0; i < personas.length; i += this.batchSize) {
        const batch = personas.slice(i, i + this.batchSize)
        const prompts = batch.map((persona) => {
          const state = agentStates.get(persona.id)
          const neighborFeed = this._sampleFeed(feedPool, persona.id, 5)
          return {
            personaId: persona.id,
            prompt: buildAgentPrompt({
              persona,
              marketContext,
              neighborFeed,
              expertHypotheses,
              tick,
            }),
          }
        })

        // Run batch inference
        const responses = await this.inferenceAdapter(prompts.map((p) => p.prompt))

        // Process responses
        for (let j = 0; j < batch.length; j++) {
          const persona = batch[j]
          const state = agentStates.get(persona.id)
          const parsed = parseAgentResponse(responses[j])

          const positionChanged = parsed.position !== state.position
          state.position = parsed.position
          state.confidence = parsed.confidence
          state.reasoning = parsed.reasoning
          state.positionHistory.push({ tick, ...parsed })

          // Agents with high confidence post to the feed pool
          if (parsed.confidence > 0.6 && parsed.reasoning) {
            const post = `[${persona.expertise[0]}] ${parsed.position} (${Math.round(parsed.confidence * 100)}%): ${parsed.reasoning}`
            state.posts.push(post)
            feedPool.push({ agentId: persona.id, content: post, tick })
          }

          tickResults.push({ personaId: persona.id, ...parsed, positionChanged })
        }
      }

      // Build tick snapshot
      const snapshot = this._buildTickSnapshot(tick, agentStates, personas)
      tickSnapshots.push(snapshot)
      completedTicks = tick

      // Check convergence
      if (snapshot.consensus >= this.convergenceThreshold) {
        earlyStop = true
        break
      }
    }

    return {
      marketId: marketContext.id,
      agentCount,
      maxTicks,
      completedTicks,
      earlyStop,
      startedAt,
      completedAt: new Date().toISOString(),
      ticks: tickSnapshots,
      finalState: this._buildFinalState(agentStates, personas),
      feedPoolSize: feedPool.length,
    }
  }

  /** Sample random posts from the feed pool (excluding the requesting agent's own posts). */
  _sampleFeed(feedPool, excludeAgentId, count) {
    const eligible = feedPool.filter((p) => p.agentId !== excludeAgentId)
    if (eligible.length <= count) return eligible.map((p) => p.content)

    // Weighted toward recent ticks
    const sorted = [...eligible].sort((a, b) => b.tick - a.tick)
    return sorted.slice(0, count).map((p) => p.content)
  }

  /** Build a snapshot of the simulation state at a given tick. */
  _buildTickSnapshot(tick, agentStates, personas) {
    const positions = { YES: 0, NO: 0, NEUTRAL: 0 }
    const factionCounts = { bullCoalition: 0, bearAlliance: 0, contrarians: 0, neutralMass: 0, volHawk: 0 }
    let totalConfidence = 0
    let positionChanges = 0

    for (const persona of personas) {
      const state = agentStates.get(persona.id)
      positions[state.position]++
      totalConfidence += state.confidence

      // Assign to faction
      const faction = this._assignFaction(state, persona)
      factionCounts[faction]++

      // Count position changes this tick
      const history = state.positionHistory
      if (history.length >= 2 && history[history.length - 1].position !== history[history.length - 2].position) {
        positionChanges++
      }
    }

    const total = personas.length
    const majorityPosition = positions.YES >= positions.NO ? 'YES' : 'NO'
    const majorityFraction = Math.max(positions.YES, positions.NO) / total

    return {
      tick,
      positions: { yes: positions.YES / total, no: positions.NO / total, neutral: positions.NEUTRAL / total },
      factions: Object.fromEntries(Object.entries(factionCounts).map(([k, v]) => [k, v / total])),
      consensus: majorityFraction,
      volatility: positionChanges / total,
      avgConfidence: totalConfidence / total,
      majorityPosition,
    }
  }

  /** Assign an agent to a faction based on position, confidence, and expertise. */
  _assignFaction(state, persona) {
    if (state.position === 'NEUTRAL') return 'neutralMass'
    if (state.position === 'YES' && state.confidence > 0.6) return 'bullCoalition'
    if (state.position === 'NO' && state.confidence > 0.6) return 'bearAlliance'
    if (state.confidence > 0.7 && persona.expertise.includes('finance')) return 'volHawk'
    return 'contrarians'
  }

  /** Build the final state summary after all ticks. */
  _buildFinalState(agentStates, personas) {
    const byExpertise = {}
    for (const persona of personas) {
      const state = agentStates.get(persona.id)
      const key = persona.expertise[0]
      if (!byExpertise[key]) byExpertise[key] = { yes: 0, no: 0, neutral: 0, count: 0, totalConfidence: 0 }
      byExpertise[key][state.position.toLowerCase()]++
      byExpertise[key].count++
      byExpertise[key].totalConfidence += state.confidence
    }

    // Convert to pYes per expertise
    const expertDivergence = {}
    for (const [key, data] of Object.entries(byExpertise)) {
      expertDivergence[key] = {
        pYes: data.count > 0 ? data.yes / data.count : 0,
        avgConfidence: data.count > 0 ? data.totalConfidence / data.count : 0,
        count: data.count,
      }
    }

    return { expertDivergence }
  }
}

/** Default mock adapter — returns deterministic responses based on prompt content.
 * Used for testing without a real LLM. */
async function defaultMockAdapter(prompts) {
  return prompts.map((prompt) => {
    // Deterministic: hash the prompt to get a consistent position
    let hash = 0
    for (let i = 0; i < prompt.length; i++) hash = ((hash << 5) - hash + prompt.charCodeAt(i)) | 0
    const val = Math.abs(hash % 100)

    if (val < 35) return '{"position":"YES","confidence":0.65,"reasoning":"Market appears underpriced given procedural evidence."}'
    if (val < 65) return '{"position":"NO","confidence":0.55,"reasoning":"Current price already reflects the most likely outcome."}'
    if (val < 85) return '{"position":"NEUTRAL","confidence":0.40,"reasoning":"Insufficient evidence to take a strong position."}'
    return '{"position":"YES","confidence":0.80,"reasoning":"Strong procedural signals support higher fair value."}'
  })
}

export { defaultMockAdapter }
