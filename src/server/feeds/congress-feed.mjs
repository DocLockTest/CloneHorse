import { FeedBase } from './feed-base.mjs'

const CONGRESS_API_BASE = 'https://api.congress.gov/v3'

/** Congress.gov legislative feed — tracks active bills in committee/floor vote stages.
 * Uses the public Congress.gov API (requires free API key from api.congress.gov). */
export class CongressFeed extends FeedBase {
  constructor({ apiKey, pollIntervalMs = 5 * 60 * 1000, congress = 119 } = {}) {
    super({ name: 'congress-gov', pollIntervalMs })
    this.apiKey = apiKey || process.env.CONGRESS_API_KEY || ''
    this.congress = congress
  }

  async _fetchEvents() {
    if (!this.apiKey) return [] // graceful no-op without key

    const url = `${CONGRESS_API_BASE}/bill/${this.congress}?format=json&limit=20&sort=updateDate+desc&api_key=${this.apiKey}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`Congress API ${res.status}`)

    const data = await res.json()
    const bills = data.bills ?? []

    return bills
      .filter((b) => this._isRelevantStage(b))
      .map((b) => ({
        id: `congress:${b.number}-${b.type}-${this.congress}`,
        type: 'BILL_STATUS_CHANGE',
        title: b.title ?? `${b.type} ${b.number}`,
        summary: `${b.type} ${b.number} — ${b.latestAction?.text ?? 'No action text'}`,
        timestamp: b.updateDate ?? b.latestAction?.actionDate ?? new Date().toISOString(),
        source: 'congress.gov',
        metadata: {
          billNumber: b.number,
          billType: b.type,
          congress: this.congress,
          latestAction: b.latestAction?.text,
          latestActionDate: b.latestAction?.actionDate,
          originChamber: b.originChamber,
          url: b.url,
        },
      }))
  }

  /** Filter to bills in active legislative stages we care about. */
  _isRelevantStage(bill) {
    const action = (bill.latestAction?.text ?? '').toLowerCase()
    const activeSignals = [
      'referred to', 'committee', 'reported by', 'passed', 'floor',
      'vote', 'cloture', 'amendment', 'conference', 'enrolled',
      'signed by', 'vetoed', 'overridden',
    ]
    return activeSignals.some((s) => action.includes(s))
  }
}
