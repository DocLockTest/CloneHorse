import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const KALSHI_URL = 'https://trading-api.kalshi.com/trade-api/v2/markets'
const POLYMARKET_URL = 'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100'

const FOCUS_KEYWORDS = [
  'court',
  'judge',
  'justice',
  'lawsuit',
  'legal',
  'supreme court',
  'appeals court',
  'injunction',
  'sec',
  'cftc',
  'fda',
  'fcc',
  'ftc',
  'approval',
  'deny',
  'denial',
  'agency',
  'regulation',
  'regulatory',
  'congress',
  'senate',
  'house',
  'bill',
  'committee',
  'executive order',
]

function nowIso() {
  return new Date().toISOString()
}

function textBlob(...parts) {
  return parts.filter(Boolean).join(' ').toLowerCase()
}

function classifyMarket(text) {
  if (/(court|judge|justice|injunction|lawsuit|appeals court|supreme court)/i.test(text)) return 'court-ruling'
  if (/(sec|cftc|fda|fcc|ftc|approval|deny|denial|agency|regulation|regulatory|rule)/i.test(text)) return 'agency-approval'
  if (/(delay|stay|implementation|effective date|deadline)/i.test(text)) return 'implementation-delay'
  if (/(congress|senate|house|bill|committee|vote|recess)/i.test(text)) return 'legislative-milestone'
  return null
}

function isFocused(text) {
  return FOCUS_KEYWORDS.some((keyword) => text.includes(keyword))
}

function focusBlob(title, subtitle) {
  return textBlob(title, subtitle)
}

function parsePolymarketPrice(raw) {
  try {
    const prices = JSON.parse(raw.outcomePrices ?? '[]').map(Number)
    return Number.isFinite(prices[0]) ? prices[0] : null
  } catch {
    return null
  }
}

function withTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs)
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
    url,
  }
}

function freshnessState(ageMs, refreshIntervalMs, ttlMs) {
  if (ageMs <= refreshIntervalMs) return 'fresh'
  if (ageMs <= ttlMs) return 'stale'
  return 'expired'
}

function summarizeErrors(results) {
  return results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason?.message ?? 'unknown ingestion error')
}

function normalizeKalshiMarket(raw) {
  const title = raw.title ?? raw.subtitle ?? raw.ticker ?? 'Untitled Kalshi market'
  const subtitle = raw.subtitle ?? raw.series_ticker ?? ''
  const blob = textBlob(title, subtitle, raw.rules_primary, raw.rules_secondary)
  const focusText = focusBlob(title, subtitle)
  const subcategory = classifyMarket(blob)
  if (!subcategory || !isFocused(focusText)) return null

  const yesAsk = raw.yes_ask != null ? Number(raw.yes_ask) / 100 : null
  const yesBid = raw.yes_bid != null ? Number(raw.yes_bid) / 100 : null
  const marketPriceYes = yesAsk ?? yesBid ?? 0.5

  return {
    id: `kalshi:${raw.ticker}`,
    venue: 'Kalshi',
    title,
    subtitle,
    subcategory,
    marketPriceYes,
    fairValueYes: marketPriceYes,
    confidence: 'unscored',
    tradability: 'watch-only',
    rerunFreshnessSec: 0,
    riskState: 'unscored',
    edge: 0,
    worldStateId: `world:${raw.ticker}`,
    linkedMarketIds: [],
    primaryDrivers: ['live venue ingestion'],
    riskFlags: [],
    triggerState: 'live',
    closeTime: raw.close_time,
    source: 'live',
    sourceUrl: `https://kalshi.com/markets/${raw.ticker}`,
    volume: raw.volume,
    rulesPrimary: raw.rules_primary ?? '',
  }
}

function normalizePolymarketMarket(raw) {
  const title = raw.question ?? raw.slug ?? 'Untitled Polymarket market'
  const subtitle = raw.category ?? ''
  const blob = textBlob(title, subtitle, raw.description)
  const focusText = focusBlob(title, subtitle)
  const subcategory = classifyMarket(blob)
  if (!subcategory || !isFocused(focusText)) return null

  const marketPriceYes = parsePolymarketPrice(raw)
  if (marketPriceYes == null) return null

  return {
    id: `polymarket:${raw.id}`,
    venue: 'Polymarket',
    title,
    subtitle,
    subcategory,
    marketPriceYes,
    fairValueYes: marketPriceYes,
    confidence: 'unscored',
    tradability: 'watch-only',
    rerunFreshnessSec: 0,
    riskState: 'unscored',
    edge: 0,
    worldStateId: `world:poly:${raw.id}`,
    linkedMarketIds: [],
    primaryDrivers: ['live venue ingestion'],
    riskFlags: [],
    triggerState: 'live',
    closeTime: raw.endDate,
    source: 'live',
    sourceUrl: raw.url ?? `https://polymarket.com/event/${raw.slug ?? raw.id}`,
    volume: raw.volumeNum ?? raw.volume,
    rulesPrimary: raw.description ?? '',
  }
}

async function fetchJson(url, timeoutMs) {
  const request = withTimeout(url, timeoutMs)
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'mirofish-oracle/0.1' },
      signal: request.signal,
    })
    if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`)
    return response.json()
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`Fetch timed out for ${url}`)
    throw error
  } finally {
    request.cleanup()
  }
}

export class MarketIngestionService {
  constructor({
    fallbackMarkets = [],
    snapshotPath = new URL('../../data/live-market-snapshot.json', import.meta.url),
    refreshIntervalMs = 120_000,
    ttlMs = 900_000,
    requestTimeoutMs = 8_000,
    maxMarkets = 40,
  } = {}) {
    this.fallbackMarkets = fallbackMarkets
    this.snapshotPath = snapshotPath
    this.refreshIntervalMs = refreshIntervalMs
    this.ttlMs = ttlMs
    this.requestTimeoutMs = requestTimeoutMs
    this.maxMarkets = maxMarkets
    this.snapshot = null
    this.refreshInFlight = null
    this.health = {
      status: 'cold',
      source: 'none',
      snapshotPath: String(snapshotPath),
      refreshIntervalMs,
      ttlMs,
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastDurationMs: null,
      failureCount: 0,
      consecutiveFailures: 0,
      lastError: null,
      marketCount: 0,
      freshness: 'cold',
    }
    this.loadPromise = this.#loadSnapshotFromDisk()
  }

  async fetchKalshiMarkets() {
    const data = await fetchJson(KALSHI_URL, this.requestTimeoutMs)
    return (data.markets ?? []).map(normalizeKalshiMarket).filter(Boolean)
  }

  async fetchPolymarketMarkets() {
    const data = await fetchJson(POLYMARKET_URL, this.requestTimeoutMs)
    return (data ?? []).map(normalizePolymarketMarket).filter(Boolean)
  }

  async getFocusedMarkets({ forceRefresh = false } = {}) {
    await this.loadPromise
    const snapshot = await this.#ensureSnapshot({ forceRefresh })
    return this.#presentSnapshot(snapshot)
  }

  async getStoredSnapshot() {
    await this.loadPromise
    return this.snapshot ? this.#presentSnapshot(this.snapshot) : null
  }

  async getHealth() {
    await this.loadPromise
    return this.#buildHealth()
  }

  async #ensureSnapshot({ forceRefresh = false } = {}) {
    if (!forceRefresh && this.snapshot && this.#getSnapshotAgeMs(this.snapshot) <= this.refreshIntervalMs) {
      this.health.status = this.#statusForSnapshot(this.snapshot)
      this.health.source = this.snapshot.source ?? this.health.source
      this.health.marketCount = this.snapshot.markets?.length ?? this.health.marketCount
      this.health.freshness = freshnessState(this.#getSnapshotAgeMs(this.snapshot), this.refreshIntervalMs, this.ttlMs)
      return this.snapshot
    }

    if (this.refreshInFlight) return this.refreshInFlight

    this.refreshInFlight = this.#refreshSnapshot(forceRefresh)
    try {
      return await this.refreshInFlight
    } finally {
      this.refreshInFlight = null
    }
  }

  async #refreshSnapshot(forceRefresh) {
    const startedAt = Date.now()
    this.health.lastAttemptAt = new Date(startedAt).toISOString()
    this.health.status = 'refreshing'

    const results = await Promise.allSettled([
      this.fetchKalshiMarkets(),
      this.fetchPolymarketMarkets(),
    ])

    const liveMarkets = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    const errors = summarizeErrors(results)
    const durationMs = Date.now() - startedAt
    this.health.lastDurationMs = durationMs

    if (liveMarkets.length > 0) {
      const capturedAt = nowIso()
      const snapshot = {
        source: 'live',
        capturedAt,
        refreshIntervalMs: this.refreshIntervalMs,
        ttlMs: this.ttlMs,
        errors,
        markets: liveMarkets
          .sort((a, b) => String(a.closeTime ?? '').localeCompare(String(b.closeTime ?? '')))
          .slice(0, this.maxMarkets),
      }

      await this.#persistSnapshot(snapshot)
      this.snapshot = snapshot
      this.health.status = errors.length > 0 ? 'degraded' : 'ready'
      this.health.source = 'live'
      this.health.lastSuccessAt = capturedAt
      this.health.lastError = errors[0] ?? null
      this.health.marketCount = snapshot.markets.length
      this.health.consecutiveFailures = 0
      this.health.freshness = 'fresh'
      return snapshot
    }

    this.health.failureCount += 1
    this.health.consecutiveFailures += 1
    this.health.lastFailureAt = nowIso()
    this.health.lastError = errors[0] ?? 'live ingestion returned zero markets'

    if (this.snapshot && this.#getSnapshotAgeMs(this.snapshot) <= this.ttlMs && !forceRefresh) {
      this.health.status = 'stale-cache'
      this.health.source = this.snapshot.source
      this.health.marketCount = this.snapshot.markets.length
      this.health.freshness = freshnessState(this.#getSnapshotAgeMs(this.snapshot), this.refreshIntervalMs, this.ttlMs)
      return this.snapshot
    }

    const fallbackSnapshot = this.#buildFallbackSnapshot(errors)
    this.snapshot = fallbackSnapshot
    this.health.status = 'fallback'
    this.health.source = 'fallback'
    this.health.marketCount = fallbackSnapshot.markets.length
    this.health.freshness = 'fresh'
    return fallbackSnapshot
  }

  async #loadSnapshotFromDisk() {
    try {
      const raw = await readFile(this.snapshotPath, 'utf8')
      const snapshot = JSON.parse(raw)
      if (!Array.isArray(snapshot.markets)) throw new Error('snapshot file missing markets array')
      this.snapshot = snapshot
      this.health.status = 'ready'
      this.health.source = snapshot.source ?? 'disk'
      this.health.lastSuccessAt = snapshot.capturedAt ?? null
      this.health.marketCount = snapshot.markets.length
      this.health.freshness = freshnessState(this.#getSnapshotAgeMs(snapshot), this.refreshIntervalMs, this.ttlMs)
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        this.health.status = 'degraded'
        this.health.lastFailureAt = nowIso()
        this.health.lastError = error.message
      }
    }
  }

  async #persistSnapshot(snapshot) {
    const snapshotFilePath = this.snapshotPath instanceof URL ? fileURLToPath(this.snapshotPath) : this.snapshotPath
    await mkdir(dirname(snapshotFilePath), { recursive: true })
    await writeFile(this.snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  }

  #buildFallbackSnapshot(errors = []) {
    return {
      source: 'fallback',
      capturedAt: nowIso(),
      refreshIntervalMs: this.refreshIntervalMs,
      ttlMs: this.ttlMs,
      errors,
      markets: this.fallbackMarkets.map((market) => ({
        ...market,
        source: market.source ?? 'fallback',
        freshness: {
          state: 'fresh',
          fetchedAt: null,
          ageMs: null,
          refreshIntervalMs: this.refreshIntervalMs,
          ttlMs: this.ttlMs,
        },
      })),
    }
  }

  #presentSnapshot(snapshot) {
    const ageMs = this.#getSnapshotAgeMs(snapshot)
    const freshness = {
      state: freshnessState(ageMs, this.refreshIntervalMs, this.ttlMs),
      fetchedAt: snapshot.capturedAt ?? null,
      ageMs,
      refreshIntervalMs: this.refreshIntervalMs,
      ttlMs: this.ttlMs,
    }

    return {
      source: snapshot.source,
      capturedAt: snapshot.capturedAt,
      errors: snapshot.errors ?? [],
      freshness,
      health: this.#buildHealth(),
      markets: (snapshot.markets ?? []).map((market) => ({
        ...market,
        rerunFreshnessSec: Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : market.rerunFreshnessSec ?? 0,
        freshness,
      })),
    }
  }

  #buildHealth() {
    const snapshotAgeMs = this.snapshot ? this.#getSnapshotAgeMs(this.snapshot) : null
    return {
      ...this.health,
      status: this.snapshot ? this.#statusForSnapshot(this.snapshot, this.health.status) : this.health.status,
      freshness: snapshotAgeMs == null ? this.health.freshness : freshnessState(snapshotAgeMs, this.refreshIntervalMs, this.ttlMs),
      snapshotAgeMs,
      hasSnapshot: Boolean(this.snapshot),
      snapshotCapturedAt: this.snapshot?.capturedAt ?? null,
    }
  }

  #statusForSnapshot(snapshot, fallbackStatus = 'ready') {
    if (!snapshot) return fallbackStatus
    if (snapshot.source === 'fallback') return 'fallback'
    return fallbackStatus === 'stale-cache' ? 'stale-cache' : fallbackStatus === 'degraded' ? 'degraded' : 'ready'
  }

  #getSnapshotAgeMs(snapshot) {
    const capturedAt = Date.parse(snapshot?.capturedAt ?? '')
    if (!Number.isFinite(capturedAt)) return null
    return Math.max(0, Date.now() - capturedAt)
  }
}
