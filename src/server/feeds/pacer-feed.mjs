import { FeedBase } from './feed-base.mjs'

const CL_API_BASE = 'https://www.courtlistener.com/api/rest/v4'

/** Court docket feed — tracks federal court opinions and docket updates.
 * Uses the free Court Listener API (courtlistener.com) instead of PACER
 * since PACER requires paid credentials. Court Listener covers all federal
 * appellate courts and many district courts. */
export class CourtListenerFeed extends FeedBase {
  constructor({ apiToken, pollIntervalMs = 15 * 60 * 1000 } = {}) {
    super({ name: 'court-listener', pollIntervalMs })
    this.apiToken = apiToken || process.env.COURT_LISTENER_TOKEN || ''
  }

  async _fetchEvents() {
    const headers = { Accept: 'application/json' }
    if (this.apiToken) headers.Authorization = `Token ${this.apiToken}`

    // Fetch recent opinions from federal appellate courts
    const since = this._recentDate()
    const url = `${CL_API_BASE}/opinions/?date_created__gte=${since}&order_by=-date_created&page_size=20`

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`Court Listener API ${res.status}`)

    const data = await res.json()
    const results = data.results ?? []

    return results.map((opinion) => ({
      id: `cl:opinion-${opinion.id}`,
      type: 'DOCKET_UPDATE',
      title: opinion.case_name ?? 'Court Opinion',
      summary: this._buildSummary(opinion),
      timestamp: opinion.date_created ?? new Date().toISOString(),
      source: 'courtlistener.com',
      metadata: {
        opinionId: opinion.id,
        caseName: opinion.case_name,
        court: opinion.court,
        dateCreated: opinion.date_created,
        dateFiled: opinion.date_filed,
        status: opinion.status,
        type: opinion.type,
        absoluteUrl: opinion.absolute_url ? `https://www.courtlistener.com${opinion.absolute_url}` : null,
      },
    }))
  }

  _buildSummary(opinion) {
    const parts = []
    if (opinion.case_name) parts.push(opinion.case_name)
    if (opinion.court) parts.push(`Court: ${opinion.court}`)
    if (opinion.date_filed) parts.push(`Filed: ${opinion.date_filed}`)
    if (opinion.status) parts.push(`Status: ${opinion.status}`)
    return parts.join(' — ') || 'Federal court opinion'
  }

  _recentDate() {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  }
}
