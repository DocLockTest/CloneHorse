import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// elections API is public (no auth needed for reading), trading API requires Bearer token
const KALSHI_URL = 'https://api.elections.kalshi.com/trade-api/v2/markets'
const POLYMARKET_URL = 'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100'

// Allowed outbound fetch domains — prevents SSRF if URLs ever become configurable
const ALLOWED_FETCH_DOMAINS = ['api.elections.kalshi.com', 'trading-api.kalshi.com', 'gamma-api.polymarket.com']

// --- Rate limiter (per-domain, token bucket) ---
class RateLimiter {
  constructor(maxPerMinute = 30) {
    this.maxPerMinute = maxPerMinute
    this.tokens = new Map() // domain → { count, resetAt }
  }

  async acquire(domain) {
    const now = Date.now()
    let bucket = this.tokens.get(domain)
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + 60_000 }
      this.tokens.set(domain, bucket)
    }
    if (bucket.count >= this.maxPerMinute) {
      const waitMs = bucket.resetAt - now
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      return this.acquire(domain) // retry after wait
    }
    bucket.count += 1
  }
}

const rateLimiter = new RateLimiter(30) // 30 requests/min per domain (conservative)

// --- Focus category definitions ---
// Each category has: positive patterns (must match), negative patterns (must not match)
// Sports/entertainment exclusion runs FIRST to prevent false positives

// Word boundaries (\b) on short acronyms to prevent false matches inside words
// e.g. "coinbase" contains "nba", "baseball" contains "baseball" (ok, whole word)
const SPORTS_ENTERTAINMENT_REJECT = /(\bnba\b|\bnfl\b|\bmlb\b|\bnhl\b|\bncaa\b|premier league|champions league|world cup|super bowl|oscars|grammy|emmy|bachelor|survivor|big brother|esports|tennis|basketball|football|soccer|baseball|hockey|\bufc\b|\bmma\b|boxing|cricket|rugby|formula\s*1|nascar|golf|olympics|paralympics|wrestling|volleyball|swimming|track and field|figure skating|skiing|snowboard|\bwwe\b|\baew\b|gaming|twitch|streamer|youtube|tiktok|spotify|netflix|disney|marvel|dc comics|star wars|anime|manga|k-?pop|billboard|box office|ratings|viewership|episode|season finale)/i

const CATEGORY_PATTERNS = {
  'court-ruling': {
    // Must contain court/judicial language
    match: /(court|judge|justice|injunction|lawsuit|ruling|appeals?\s+court|supreme\s+court|circuit\s+court|district\s+court|docket|brief|oral\s+argument|stay|opinion|certiorari|amicus|plaintiff|defendant|verdict|settlement|litigation|judicial|convicted|conviction|acquit|sentenced|sentencing|indictment|indicted|trial|plea\s+deal|plea\s+guilty|arraign)/i,
    // Exclude vague hits — "judge" in "judges the competition"
    reject: /(talent\s+judge|judging\s+panel|reality\s+show|competition\s+judge)/i,
  },
  'agency-approval': {
    match: /(sec\b|cftc\b|fda\b|fcc\b|ftc\b|epa\b|osha\b|cfpb\b|doj\b|dhs\b|approval|deny|denial|enforcement\s+action|consent\s+decree|comment\s+period|rulemaking|notice\s+of\s+proposed|final\s+rule|advisory\s+committee|510\(k\)|nda\b|anda\b|eua\b|clearance|registration\s+statement)/i,
    reject: /(game\s+approval|app\s+store|content\s+rating)/i,
  },
  // Political checked BEFORE legislative — "senate confirmation" is political, not legislative
  'political-event': {
    match: /(executive\s+order|presidential\s+memo|cabinet\s+confirmation|senate\s+confirmation|confirmation\s+hearing|nomination|pardon|impeach|inauguration|state\s+of\s+the\s+union|veto|signing\s+ceremony|trade\s+war|tariff|sanction|treaty|diplomatic|ambassador|national\s+security\s+council|classified|declassif)/i,
    reject: /(reality\s+tv|political\s+drama|house\s+of\s+cards)/i,
  },
  'legislative-milestone': {
    match: /(congress|senate\b|house\s+of\s+representatives|bill\b|resolution\b|committee\s+markup|floor\s+vote|cloture|filibuster|reconciliation|continuing\s+resolution|omnibus|appropriation|authorization\s+act|conference\s+committee|joint\s+session|recess|lame\s+duck|speaker\s+of\s+the\s+house|majority\s+leader|whip\s+count)/i,
    reject: /(big\s+brother\s+house|house\s+music|full\s+house|tiny\s+house|confirmation\s+hearing|cabinet\s+confirmation|senate\s+confirmation)/i,
  },
}

// Unified focus keywords derived from category patterns (for quick pre-filter)
// Must stay in sync with CATEGORY_PATTERNS — any term in a category match pattern
// should have a corresponding keyword here
const FOCUS_KEYWORDS = [
  // Court rulings
  'court', 'judge', 'justice', 'lawsuit', 'legal', 'supreme court',
  'appeals court', 'injunction', 'ruling', 'docket', 'verdict',
  'convicted', 'conviction', 'sentenced', 'sentencing', 'indicted',
  'indictment', 'trial', 'plea', 'arraign', 'acquit', 'litigation',
  // Agency approvals
  'sec', 'cftc', 'fda', 'fcc', 'ftc', 'epa', 'osha', 'cfpb', 'doj', 'dhs',
  'approval', 'deny', 'denial', 'agency', 'regulation', 'regulatory',
  'rulemaking', 'enforcement', 'comment period', 'final rule',
  // Legislative milestones
  'congress', 'senate', 'house of representatives', 'bill', 'committee',
  'floor vote', 'reconciliation', 'filibuster', 'cloture', 'recess',
  'appropriation', 'omnibus',
  // Political events
  'executive order', 'presidential', 'cabinet', 'nomination', 'confirmation',
  'tariff', 'sanction', 'treaty', 'impeach', 'pardon', 'veto',
  'inauguration', 'diplomatic',
]

function nowIso() {
  return new Date().toISOString()
}

function textBlob(...parts) {
  return parts.filter(Boolean).join(' ').toLowerCase()
}

/** Classify a market into one of 4 focus categories, or null if it doesn't belong.
 * Sports/entertainment are rejected FIRST to prevent false positives from vague terms.
 * Each category has positive match + negative reject patterns for precision. */
function classifyMarket(text) {
  // Hard reject: sports, entertainment, pop culture — no exceptions
  if (SPORTS_ENTERTAINMENT_REJECT.test(text)) return null

  // Try each focus category in priority order
  for (const [category, { match, reject }] of Object.entries(CATEGORY_PATTERNS)) {
    if (match.test(text) && !reject.test(text)) return category
  }

  return null // doesn't match any focus category → excluded
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
  if (ageMs == null) return 'unknown'
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

/** Structured error for API failures — carries status code and retry hint */
class IngestionError extends Error {
  constructor(message, { status = null, retryable = false, venue = 'unknown' } = {}) {
    super(message)
    this.name = 'IngestionError'
    this.status = status
    this.retryable = retryable
    this.venue = venue
  }
}

/** Fetch JSON from an allowed domain with auth, rate limiting, and structured errors.
 * - Validates URL against allowlist (prevents SSRF)
 * - Adds Bearer auth for Kalshi via KALSHI_API_KEY env var
 * - Applies per-domain rate limiting (30 req/min)
 * - Returns structured errors for 401/403/429 */
async function fetchJson(url, timeoutMs, { apiKeys = {} } = {}) {
  // Domain allowlist check
  const parsedUrl = new URL(url)
  if (!ALLOWED_FETCH_DOMAINS.includes(parsedUrl.hostname)) {
    throw new IngestionError(`Blocked fetch to non-allowlisted domain: ${parsedUrl.hostname}`, { retryable: false })
  }

  // Determine venue from domain
  const venue = parsedUrl.hostname.includes('kalshi') ? 'kalshi' : 'polymarket'

  // Rate limit before fetching
  await rateLimiter.acquire(parsedUrl.hostname)

  const request = withTimeout(url, timeoutMs)
  const headers = { 'User-Agent': 'mirofish-oracle/0.2' }

  // Add Bearer auth for Kalshi (primary key, falls back to secondary)
  if (venue === 'kalshi') {
    const key = apiKeys.kalshiPrimary || apiKeys.kalshiFallback || process.env.KALSHI_API_KEY || process.env.KALSHI_API_KEY_FALLBACK
    if (key) {
      headers['Authorization'] = `Bearer ${key}`
    }
  }

  try {
    const response = await fetch(url, { headers, signal: request.signal })

    if (!response.ok) {
      // Structured error handling for auth/rate limit failures
      const errorMap = {
        401: { msg: `Authentication failed for ${venue} (check API key)`, retryable: false },
        403: { msg: `Forbidden by ${venue} (API key may lack permissions)`, retryable: false },
        429: { msg: `Rate limited by ${venue} — backing off`, retryable: true },
        500: { msg: `${venue} internal server error`, retryable: true },
        502: { msg: `${venue} bad gateway`, retryable: true },
        503: { msg: `${venue} temporarily unavailable`, retryable: true },
      }
      const info = errorMap[response.status] ?? { msg: `${venue} returned ${response.status}`, retryable: response.status >= 500 }
      throw new IngestionError(info.msg, { status: response.status, retryable: info.retryable, venue })
    }

    return response.json()
  } catch (error) {
    if (error instanceof IngestionError) throw error
    if (error?.name === 'AbortError') {
      throw new IngestionError(`Fetch timed out for ${venue} after ${timeoutMs}ms`, { retryable: true, venue })
    }
    throw new IngestionError(`Network error fetching ${venue}: ${error.message}`, { retryable: true, venue })
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
    apiKeys = {},
  } = {}) {
    this.fallbackMarkets = fallbackMarkets
    this.snapshotPath = snapshotPath
    this.refreshIntervalMs = refreshIntervalMs
    this.ttlMs = ttlMs
    this.requestTimeoutMs = requestTimeoutMs
    this.maxMarkets = maxMarkets
    // API key rotation: primary key is tried first, falls back to secondary
    this.apiKeys = {
      kalshiPrimary: apiKeys.kalshiPrimary || process.env.KALSHI_API_KEY || null,
      kalshiFallback: apiKeys.kalshiFallback || process.env.KALSHI_API_KEY_FALLBACK || null,
    }
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
      kalshiAuth: this.apiKeys.kalshiPrimary ? 'configured' : 'missing',
    }
    this.loadPromise = this.#loadSnapshotFromDisk()
  }

  async fetchKalshiMarkets() {
    const data = await fetchJson(KALSHI_URL, this.requestTimeoutMs, { apiKeys: this.apiKeys })
    return (data.markets ?? []).map(normalizeKalshiMarket).filter(Boolean)
  }

  async fetchPolymarketMarkets() {
    const data = await fetchJson(POLYMARKET_URL, this.requestTimeoutMs, { apiKeys: this.apiKeys })
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
    const tmpPath = `${snapshotFilePath}.tmp`
    await mkdir(dirname(snapshotFilePath), { recursive: true })
    await writeFile(tmpPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
    await rename(tmpPath, snapshotFilePath)
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
