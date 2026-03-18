export class RetrievalService {
  constructor({ graphStore } = {}) {
    this.graphStore = graphStore
  }

  async getMarketBrief(market) {
    return {
      marketId: market.id,
      title: market.title,
      category: market.subcategory,
      retrievalMode: 'focused-policy-legal-regulatory',
      priorityDocuments: this.#priorityDocumentsFor(market.subcategory),
      recommendedQueries: this.#recommendedQueriesFor(market),
    }
  }

  async getClaimEvidence(market) {
    const neighborhood = await this.graphStore.getClaimNeighborhood(market.id)
    return {
      marketId: market.id,
      claims: neighborhood.claims,
      supportingEdges: neighborhood.supportingEdges,
      evidenceStrategy: [
        'exact settlement wording lookup',
        'procedural docket keyword scan',
        'semantic retrieval of analogous rulings or filings',
      ],
    }
  }

  async getWorldInspectorBundle(market) {
    const [graph, actorSubgraph, linkedMarkets] = await Promise.all([
      this.graphStore.getWorldGraph(market.id),
      this.graphStore.getActorSubgraph(market.id),
      this.graphStore.getLinkedMarkets(market.id),
    ])

    return {
      graph,
      actorSubgraph,
      linkedMarkets,
      retrievalPolicy: 'graph + keyword + semantic retrieval hybrid',
    }
  }

  #priorityDocumentsFor(category) {
    switch (category) {
      case 'court-ruling':
        return ['docket entries', 'orders', 'briefing schedules', 'injunction standard analogs']
      case 'agency-approval':
        return ['agency filings', 'comment windows', 'approval precedents', 'staff statements']
      case 'legislative-milestone':
        return ['calendars', 'committee notices', 'leadership statements', 'text revisions']
      default:
        return ['official statements', 'rules text', 'market settlement wording']
    }
  }

  #recommendedQueriesFor(market) {
    return [
      `${market.title} settlement wording`,
      `${market.subtitle} procedural timeline`,
      `${market.title} official filing`,
    ]
  }
}
