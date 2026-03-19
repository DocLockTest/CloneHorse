import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

function nowIso() {
  return new Date().toISOString()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export class TriggerStore {
  constructor({
    filePath = new URL('../../data/trigger-store.json', import.meta.url),
    maxHistory = 250,
    suppressionWindowMs = 15 * 60 * 1000,
  } = {}) {
    this.filePath = filePath
    this.maxHistory = maxHistory
    this.suppressionWindowMs = suppressionWindowMs
    this.state = this.#emptyState()
    this.loadPromise = this.#load()
    this.persistPromise = Promise.resolve()
  }

  async ready() {
    await this.loadPromise
  }

  getState() {
    return clone(this.state)
  }

  async getTriggers({ marketId = null } = {}) {
    await this.ready()
    const filtered = marketId
      ? this.state.history.filter((trigger) => trigger.marketId === marketId || trigger.relatedMarketId === marketId)
      : this.state.history
    return clone(filtered)
  }

  getPreviousMarketSnapshot(marketId) {
    const snapshot = this.state.marketSnapshots[marketId]
    return snapshot ? clone(snapshot) : null
  }

  async ingestSnapshot({ snapshotKey, markets, generatedAt }) {
    await this.ready()

    if (snapshotKey && this.state.lastEvaluatedSnapshotKey === snapshotKey) {
      return { emitted: [], replayed: false, state: this.getState() }
    }

    const emitted = []
    const capturedAt = generatedAt ?? nowIso()

    for (const market of markets) {
      const previous = this.getPreviousMarketSnapshot(market.id)
      this.state.marketSnapshots[market.id] = {
        marketId: market.id,
        marketPriceYes: Number(market.marketPriceYes ?? 0),
        venue: market.venue,
        subcategory: market.subcategory,
        title: market.title,
        capturedAt,
      }

      if (!previous) continue
      const candidate = this.#buildPriceTrigger({ market, previous, happenedAt: capturedAt })
      if (!candidate) continue
      if (this.#isSuppressed(candidate)) continue
      emitted.push(this.#recordTrigger(candidate))
    }

    for (const candidate of this.#buildDivergenceTriggers({ markets, happenedAt: capturedAt })) {
      if (this.#isSuppressed(candidate)) continue
      emitted.push(this.#recordTrigger(candidate))
    }

    this.state.lastEvaluatedSnapshotKey = snapshotKey ?? null
    this.state.updatedAt = nowIso()
    await this.#persist()
    return { emitted: clone(emitted), replayed: true, state: this.getState() }
  }

  #emptyState() {
    return {
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastEvaluatedSnapshotKey: null,
      history: [],
      marketSnapshots: {},
      suppression: {},
    }
  }

  async #load() {
    try {
      const raw = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(raw)
      this.state = {
        ...this.#emptyState(),
        ...parsed,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        marketSnapshots: parsed.marketSnapshots && typeof parsed.marketSnapshots === 'object' ? parsed.marketSnapshots : {},
        suppression: parsed.suppression && typeof parsed.suppression === 'object' ? parsed.suppression : {},
      }
    } catch (error) {
      if (error?.code === 'ENOENT') return
      if (error instanceof SyntaxError) {
        console.warn('trigger-store: corrupt JSON, resetting state:', error.message)
        return
      }
      throw error
    }
  }

  async #persist() {
    const path = this.filePath instanceof URL ? fileURLToPath(this.filePath) : this.filePath
    this.persistPromise = this.persistPromise.then(async () => {
      const payload = `${JSON.stringify(this.state, null, 2)}\n`
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, payload, 'utf8')
    })
    return this.persistPromise
  }

  #recordTrigger(candidate) {
    const signature = this.#signatureFor(candidate)
    const lastSeenAt = Date.now()
    this.state.suppression[signature] = {
      signature,
      lastSeenAt,
      triggerId: candidate.id,
      type: candidate.type,
      marketId: candidate.marketId,
      relatedMarketId: candidate.relatedMarketId ?? null,
    }
    this.state.history = [candidate, ...this.state.history].slice(0, this.maxHistory)
    return candidate
  }

  #isSuppressed(candidate) {
    const signature = this.#signatureFor(candidate)
    const existing = this.state.suppression[signature]
    if (!existing) return false
    const ageMs = Date.now() - Number(existing.lastSeenAt ?? 0)
    return ageMs >= 0 && ageMs < this.suppressionWindowMs
  }

  #buildPriceTrigger({ market, previous, happenedAt }) {
    const currentPrice = Number(market.marketPriceYes ?? 0)
    const previousPrice = Number(previous.marketPriceYes ?? 0)
    const delta = Number((currentPrice - previousPrice).toFixed(3))
    const absDelta = Math.abs(delta)
    if (absDelta < 0.03) return null

    return {
      id: `trg:${market.id}:price:${this.#stableToken(happenedAt)}`,
      marketId: market.id,
      type: 'price-dislocation',
      source: `${market.venue} live market ingestion`,
      summary: `${market.title} moved ${delta >= 0 ? '+' : ''}${Math.round(delta * 100)} points since last stored snapshot.`,
      score: this.#scoreFromDelta(delta),
      rerunDecision: absDelta >= 0.1 ? 'deep' : 'fast',
      happenedAt,
      status: 'open',
      signature: `price:${market.id}:${delta >= 0 ? 'up' : 'down'}:${Math.round(absDelta * 1000)}`,
      meta: {
        previousPrice,
        currentPrice,
        delta,
        category: market.subcategory,
      },
    }
  }

  #buildDivergenceTriggers({ markets, happenedAt }) {
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
      const sortedBucket = [...bucket].sort((a, b) => String(a.id).localeCompare(String(b.id)))
      if (sortedBucket.length < 2) continue
      for (let i = 0; i < sortedBucket.length; i++) {
        for (let j = i + 1; j < sortedBucket.length; j++) {
          const a = sortedBucket[i]
          const b = sortedBucket[j]
          if (a.venue === b.venue) continue
          const delta = Math.abs(Number(a.marketPriceYes ?? 0) - Number(b.marketPriceYes ?? 0))
          if (delta < 0.08) continue
          const [marketA, marketB] = [a.id, b.id].sort((left, right) => String(left).localeCompare(String(right)))
          triggers.push({
            id: `trg:divergence:${key}:${marketA}:${marketB}:${this.#stableToken(happenedAt)}`,
            marketId: a.id,
            relatedMarketId: b.id,
            type: 'venue-divergence',
            source: 'cross-venue comparator',
            summary: `${a.venue} and ${b.venue} diverge by ${Math.round(delta * 100)} points on a similar market cluster.`,
            score: this.#scoreFromDelta(delta),
            rerunDecision: delta >= 0.12 ? 'deep' : 'fast',
            happenedAt,
            status: 'open',
            signature: `divergence:${key}:${marketA}:${marketB}:${Math.round(delta * 1000)}`,
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

    return triggers.sort((a, b) => String(a.id).localeCompare(String(b.id)))
  }

  #signatureFor(candidate) {
    return candidate.signature ?? `${candidate.type}:${candidate.marketId}:${candidate.relatedMarketId ?? ''}:${candidate.summary}`
  }

  #normalizeComparableKey(title) {
    return String(title ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
  }

  #scoreFromDelta(delta) {
    const abs = Math.abs(delta)
    if (abs >= 0.15) return 0.92
    if (abs >= 0.1) return 0.81
    if (abs >= 0.06) return 0.68
    if (abs >= 0.03) return 0.52
    return 0.31
  }

  #stableToken(value) {
    return String(value ?? nowIso()).replace(/[^0-9]/g, '').slice(0, 14)
  }
}
