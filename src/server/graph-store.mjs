const seedWorldGraph = {
  'mkt-epa-june': {
    nodes: [
      { id: 'market:mkt-epa-june', type: 'Market', label: 'EPA rule block by June 30' },
      { id: 'inst:epa', type: 'Institution', label: 'EPA' },
      { id: 'inst:appeals-court', type: 'Institution', label: 'Federal appeals court' },
      { id: 'event:briefing-tightened', type: 'Event', label: 'Briefing schedule tightened' },
      { id: 'claim:pricing-lag', type: 'Claim', label: 'Market is underpricing procedural acceleration' },
    ],
    edges: [
      { from: 'event:briefing-tightened', to: 'market:mkt-epa-june', type: 'AFFECTS' },
      { from: 'inst:appeals-court', to: 'event:briefing-tightened', type: 'ISSUED_BY' },
      { from: 'claim:pricing-lag', to: 'event:briefing-tightened', type: 'DEPENDS_ON' },
    ],
  },
  'mkt-sec-eth': {
    nodes: [
      { id: 'market:mkt-sec-eth', type: 'Market', label: 'SEC approve ETH staking amendments' },
      { id: 'inst:sec', type: 'Institution', label: 'SEC' },
      { id: 'event:media-optimism', type: 'Event', label: 'Media optimism burst' },
      { id: 'claim:filing-gap', type: 'Claim', label: 'Narrative moved faster than formal process' },
    ],
    edges: [
      { from: 'event:media-optimism', to: 'market:mkt-sec-eth', type: 'AFFECTS' },
      { from: 'claim:filing-gap', to: 'event:media-optimism', type: 'DEPENDS_ON' },
    ],
  },
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
  constructor(seed = seedWorldGraph) {
    super()
    this.seed = seed
  }

  async getWorldGraph(marketId) {
    return this.seed[marketId] ?? { nodes: [], edges: [] }
  }

  async getClaimNeighborhood(marketId) {
    const graph = this.seed[marketId] ?? { nodes: [], edges: [] }
    return {
      claims: graph.nodes.filter((node) => node.type === 'Claim'),
      supportingEdges: graph.edges.filter((edge) => edge.type === 'DEPENDS_ON' || edge.type === 'SUPPORTS'),
    }
  }

  async getLinkedMarkets(marketId) {
    if (marketId === 'mkt-epa-june') {
      return [
        { id: 'mkt-epa-delay-pm', venue: 'Polymarket', relationship: 'implementation delay analogue' },
      ]
    }
    return []
  }

  async getActorSubgraph(marketId) {
    const graph = this.seed[marketId] ?? { nodes: [], edges: [] }
    return {
      actors: graph.nodes.filter((node) => node.type === 'Institution' || node.type === 'Actor'),
      relations: graph.edges.filter((edge) => edge.type === 'ISSUED_BY' || edge.type === 'TRUSTS'),
    }
  }
}
