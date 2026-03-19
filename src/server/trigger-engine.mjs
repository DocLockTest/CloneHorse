function nowIso() {
  return new Date().toISOString()
}

function scoreFromDelta(delta) {
  const abs = Math.abs(delta)
  if (abs >= 0.15) return 0.92
  if (abs >= 0.1) return 0.81
  if (abs >= 0.06) return 0.68
  if (abs >= 0.03) return 0.52
  return 0.31
}

export class TriggerEngine {
  constructor() {
    this.previousById = new Map()
  }

  evaluate(markets) {
    const triggers = []

    for (const market of markets) {
      const previous = this.previousById.get(market.id)
      const currentPrice = Number(market.marketPriceYes ?? 0)

      if (previous) {
        const delta = Number((currentPrice - previous.marketPriceYes).toFixed(3))
        const absDelta = Math.abs(delta)

        if (absDelta >= 0.03) {
          triggers.push({
            id: `trg:${market.id}:price:${Date.now()}`,
            marketId: market.id,
            type: 'price-dislocation',
            source: `${market.venue} live market ingestion`,
            summary: `${market.title} moved ${delta >= 0 ? '+' : ''}${Math.round(delta * 100)} points since last snapshot.`,
            score: scoreFromDelta(delta),
            rerunDecision: absDelta >= 0.1 ? 'deep' : 'fast',
            happenedAt: nowIso(),
            status: 'open',
            meta: {
              previousPrice: previous.marketPriceYes,
              currentPrice,
              delta,
              category: market.subcategory,
            },
          })
        }
      }

      this.previousById.set(market.id, {
        marketPriceYes: currentPrice,
        capturedAt: nowIso(),
        venue: market.venue,
        subcategory: market.subcategory,
      })
    }

    const divergenceTriggers = this.#detectVenueDivergence(markets)
    return [...triggers, ...divergenceTriggers]
  }

  #detectVenueDivergence(markets) {
    const triggers = []
    const groups = new Map()

    for (const market of markets) {
      const normalized = this.#normalizeComparableKey(market.title)
      if (!normalized) continue
      const bucket = groups.get(normalized) ?? []
      bucket.push(market)
      groups.set(normalized, bucket)
    }

    for (const [key, bucket] of groups.entries()) {
      if (bucket.length < 2) continue
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const a = bucket[i]
          const b = bucket[j]
          if (a.venue === b.venue) continue
          const delta = Math.abs((a.marketPriceYes ?? 0) - (b.marketPriceYes ?? 0))
          if (delta >= 0.08) {
            triggers.push({
              id: `trg:divergence:${key}:${Date.now()}:${i}${j}`,
              marketId: a.id,
              relatedMarketId: b.id,
              type: 'venue-divergence',
              source: 'cross-venue comparator',
              summary: `${a.venue} and ${b.venue} diverge by ${Math.round(delta * 100)} points on a similar market cluster.`,
              score: scoreFromDelta(delta),
              rerunDecision: delta >= 0.12 ? 'deep' : 'fast',
              happenedAt: nowIso(),
              status: 'open',
              meta: {
                clusterKey: key,
                delta,
                marketA: a.id,
                marketB: b.id,
              },
            })
          }
        }
      }
    }

    return triggers
  }

  #normalizeComparableKey(title) {
    return String(title ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
  }
}
