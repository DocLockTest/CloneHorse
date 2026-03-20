import { FeedBase } from './feed-base.mjs'

const EDGAR_EFTS_BASE = 'https://efts.sec.gov/LATEST/search-index'
const EDGAR_SEARCH_BASE = 'https://efts.sec.gov/LATEST'

/** SEC EDGAR filing feed — tracks enforcement actions, rulemaking, and key filings.
 * Uses the EDGAR full-text search system (EFTS). No API key required.
 * Respects SEC rate limit: max 10 requests/second, custom User-Agent required. */
export class EdgarFeed extends FeedBase {
  constructor({ pollIntervalMs = 15 * 60 * 1000, userAgent } = {}) {
    super({ name: 'edgar-sec', pollIntervalMs })
    // SEC requires identifying User-Agent (company name + email)
    this.userAgent = userAgent || process.env.EDGAR_USER_AGENT || 'MiroFishOracle/1.0 (oracle@example.com)'
  }

  async _fetchEvents() {
    // Search for recent enforcement and rulemaking filings
    const url = `${EDGAR_SEARCH_BASE}/search-index?q=%22enforcement+action%22+OR+%22proposed+rule%22+OR+%22final+rule%22&dateRange=custom&startdt=${this._recentDate()}&forms=8-K,SC+13D,DEFA14A&from=0&size=20`

    const res = await fetch(url, {
      headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) throw new Error(`EDGAR API ${res.status}`)

    const data = await res.json()
    const hits = data.hits?.hits ?? []

    return hits.map((hit) => {
      const src = hit._source ?? {}
      return {
        id: `edgar:${src.file_num ?? hit._id}`,
        type: 'FILING_EVENT',
        title: src.display_names?.[0]?.trim() ?? src.entity_name ?? 'SEC Filing',
        summary: `${src.form_type ?? 'Filing'} — ${src.entity_name ?? 'Unknown entity'}. Filed ${src.file_date ?? 'unknown date'}.`,
        timestamp: src.file_date ?? new Date().toISOString(),
        source: 'sec.gov/edgar',
        metadata: {
          formType: src.form_type,
          entityName: src.entity_name,
          fileNumber: src.file_num,
          fileDate: src.file_date,
          accessionNumber: src.accession_no,
          filingUrl: src.file_num ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=${src.file_num}` : null,
        },
      }
    })
  }

  /** Date string for 7 days ago (YYYY-MM-DD). */
  _recentDate() {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  }
}
