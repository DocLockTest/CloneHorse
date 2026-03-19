import { WorldStateEngine } from './world-state-engine.mjs'

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item'
}

export class GraphStore {
  async getWorldGraph() {
    throw new Error('Not implemented')
  }

  async getClaimNeighborhood() {
    throw new Error('Not implemented')
  }

  async getLinkedMarkets() {
    throw new Error('Not implemented')
  }

  async getActorSubgraph() {
    throw new Error('Not implemented')
  }
}

export class MemoryGraphStore extends GraphStore {
  constructor({ worldStateEngine = new WorldStateEngine(), markets = [] } = {}) {
    super()
    this.worldStateEngine = worldStateEngine
    this.markets = markets
  }

  setMarkets(markets = []) {
    this.markets = markets
  }

  #marketById(marketId) {
    return this.markets.find((market) => market.id === marketId) ?? null
  }

  #worldStateFor(marketId) {
    const market = this.#marketById(marketId)
    return market ? this.worldStateEngine.buildWorldState(market) : null
  }

  async getWorldGraph(marketId) {
    const world = this.#worldStateFor(marketId)
    if (!world) return { nodes: [], edges: [] }

    const marketNodeId = `market:${marketId}`
    const nodes = [
      { id: marketNodeId, type: 'Market', label: world.title },
      ...world.institutions.map((label) => ({ id: `institution:${slug(label)}`, type: 'Institution', label })),
      ...world.actors.map((label) => ({ id: `actor:${slug(label)}`, type: 'Actor', label })),
      ...world.claims.map((label) => ({ id: `claim:${slug(label)}`, type: 'Claim', label })),
      ...world.catalystTimeline.map((item) => ({ id: `catalyst:${slug(item.label)}`, type: 'Catalyst', label: item.label, timing: item.timing ?? null })),
    ]

    const edges = [
      ...world.institutions.map((label) => ({ from: `institution:${slug(label)}`, to: marketNodeId, type: 'OVERSEES' })),
      ...world.actors.map((label) => ({ from: `actor:${slug(label)}`, to: marketNodeId, type: 'PARTICIPATES_IN' })),
      ...world.claims.map((label) => ({ from: `claim:${slug(label)}`, to: marketNodeId, type: 'AFFECTS' })),
      ...world.catalystTimeline.map((item) => ({ from: `catalyst:${slug(item.label)}`, to: marketNodeId, type: 'REPRICES_ON' })),
    ]

    return { nodes, edges }
  }

  async getClaimNeighborhood(marketId) {
    const world = this.#worldStateFor(marketId)
    if (!world) return { claims: [], supportingEdges: [] }

    return {
      claims: world.claims.map((label) => ({ id: `claim:${slug(label)}`, type: 'Claim', label })),
      supportingEdges: world.catalystTimeline.map((item) => ({
        from: `catalyst:${slug(item.label)}`,
        to: `claim:${slug(world.claims[0] ?? 'market-settlement-mechanics')}`,
        type: 'SUPPORTS',
      })),
    }
  }

  async getLinkedMarkets(marketId) {
    const market = this.#marketById(marketId)
    return (market?.linkedMarketIds ?? []).map((id) => ({ id, relationship: 'linked-market' }))
  }

  async getActorSubgraph(marketId) {
    const world = this.#worldStateFor(marketId)
    if (!world) return { actors: [], relations: [] }

    return {
      actors: [
        ...world.institutions.map((label) => ({ id: `institution:${slug(label)}`, type: 'Institution', label })),
        ...world.actors.map((label) => ({ id: `actor:${slug(label)}`, type: 'Actor', label })),
      ],
      relations: world.institutions.flatMap((institution) =>
        world.actors.map((actor) => ({
          from: `institution:${slug(institution)}`,
          to: `actor:${slug(actor)}`,
          type: 'INTERACTS_WITH',
        })),
      ),
    }
  }
}
