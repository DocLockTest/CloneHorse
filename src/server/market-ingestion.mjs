const KALSHI_URL = 'https://api.elections.kalshi.com/trade-api/v2/markets'
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
  'rule',
]

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

function parsePolymarketPrice(raw) {
  try {
    const prices = JSON.parse(raw.outcomePrices ?? '[]').map(Number)
    return Number.isFinite(prices[0]) ? prices[0] : null
  } catch {
    return null
  }
}

function normalizeKalshiMarket(raw) {
  const title = raw.title ?? raw.subtitle ?? raw.ticker ?? 'Untitled Kalshi market'
  const subtitle = raw.subtitle ?? raw.series_ticker ?? ''
  const blob = textBlob(title, subtitle, raw.rules_primary, raw.rules_secondary)
  const subcategory = classifyMarket(blob)
  if (!subcategory || !isFocused(blob)) return null

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
    volume: raw.volume,
    rulesPrimary: raw.rules_primary ?? '',
  }
}

function normalizePolymarketMarket(raw) {
  const title = raw.question ?? raw.slug ?? 'Untitled Polymarket market'
  const subtitle = raw.category ?? ''
  const blob = textBlob(title, subtitle, raw.description)
  const subcategory = classifyMarket(blob)
  if (!subcategory || !isFocused(blob)) return null

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
    volume: raw.volumeNum ?? raw.volume,
    rulesPrimary: raw.description ?? '',
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'mirofish-oracle/0.1' } })
  if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`)
  return response.json()
}

export class MarketIngestionService {
  constructor({ fallbackMarkets = [] } = {}) {
    this.fallbackMarkets = fallbackMarkets
  }

  async fetchKalshiMarkets() {
    const data = await fetchJson(KALSHI_URL)
    return (data.markets ?? []).map(normalizeKalshiMarket).filter(Boolean)
  }

  async fetchPolymarketMarkets() {
    const data = await fetchJson(POLYMARKET_URL)
    return (data ?? []).map(normalizePolymarketMarket).filter(Boolean)
  }

  async getFocusedMarkets() {
    const results = await Promise.allSettled([
      this.fetchKalshiMarkets(),
      this.fetchPolymarketMarkets(),
    ])

    const liveMarkets = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))

    if (liveMarkets.length > 0) {
      return {
        source: 'live',
        markets: liveMarkets
          .sort((a, b) => String(a.closeTime ?? '').localeCompare(String(b.closeTime ?? '')))
          .slice(0, 40),
        errors: results
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason?.message ?? 'unknown ingestion error'),
      }
    }

    return {
      source: 'fallback',
      markets: this.fallbackMarkets,
      errors: results
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason?.message ?? 'unknown ingestion error'),
    }
  }
}
