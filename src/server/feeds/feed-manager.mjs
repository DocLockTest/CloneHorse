/** FeedManager — orchestrates all regulatory feeds, maps events to graph nodes,
 * and emits triggers when feed events match active markets. */
export class FeedManager {
  constructor({ feeds = [], graphStore = null, triggerEngine = null } = {}) {
    this.feeds = feeds
    this.graphStore = graphStore
    this.triggerEngine = triggerEngine
  }

  /** Start polling all feeds. */
  startAll() {
    for (const feed of this.feeds) feed.start()
  }

  /** Stop all feeds. */
  stopAll() {
    for (const feed of this.feeds) feed.stop()
  }

  /** Poll all feeds once and return new events. */
  async pollAll() {
    const results = await Promise.allSettled(this.feeds.map((f) => f.poll()))
    const allNew = []
    for (const r of results) {
      if (r.status === 'fulfilled') allNew.push(...r.value)
    }
    return allNew
  }

  /** Get health status for all feeds. */
  getHealth() {
    return this.feeds.map((f) => f.getHealth())
  }

  /** Get recent events across all feeds. */
  getRecentEvents({ since, limit = 100 } = {}) {
    const all = this.feeds.flatMap((f) => f.getLatestEvents({ since, limit }))
    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return all.slice(0, limit)
  }

  /** Convert feed events into graph nodes for injection into the knowledge graph. */
  eventsToGraphNodes(events) {
    return events.map((e) => ({
      id: `feed:${e.id}`,
      type: e.type, // BILL_STATUS_CHANGE, FILING_EVENT, RULE_PUBLISHED, RULE_PROPOSED, DOCKET_UPDATE
      label: e.title,
      source: e.source,
      feedName: e.feedName,
      timestamp: e.timestamp,
      summary: e.summary,
    }))
  }

  /** Convert feed events into graph edges (event → market relationships). */
  eventsToGraphEdges(events, markets = []) {
    const edges = []
    for (const event of events) {
      // Match events to markets by keyword overlap in title/summary
      for (const market of markets) {
        if (this._eventMatchesMarket(event, market)) {
          edges.push({
            from: `feed:${event.id}`,
            to: `market:${market.id}`,
            type: 'INFORMS',
            confidence: 'auto-matched',
          })
        }
      }
    }
    return edges
  }

  /** Simple keyword matching between a feed event and a market.
   * Checks for overlap between event text and market title/drivers/subcategory. */
  _eventMatchesMarket(event, market) {
    const eventText = `${event.title} ${event.summary}`.toLowerCase()
    const marketTerms = [
      market.title,
      market.subcategory,
      ...(market.primaryDrivers ?? []),
    ]
      .filter(Boolean)
      .map((t) => t.toLowerCase())

    // Match if any market term (2+ words) appears in the event text
    for (const term of marketTerms) {
      const words = term.split(/\s+/).filter((w) => w.length > 3)
      if (words.length === 0) continue
      const matchCount = words.filter((w) => eventText.includes(w)).length
      if (matchCount >= Math.ceil(words.length * 0.5)) return true
    }
    return false
  }
}
