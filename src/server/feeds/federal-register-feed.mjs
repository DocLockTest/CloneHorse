import { FeedBase } from './feed-base.mjs'

const FR_API_BASE = 'https://www.federalregister.gov/api/v1'

/** Focus agencies — the regulatory bodies most likely to move prediction markets. */
const FOCUS_AGENCIES = ['EPA', 'FDA', 'SEC', 'FTC', 'FCC']

/** Federal Register feed — tracks proposed and final rules from focus agencies.
 * Uses the public Federal Register API (no key required). */
export class FederalRegisterFeed extends FeedBase {
  constructor({ pollIntervalMs = 10 * 60 * 1000, agencies = FOCUS_AGENCIES } = {}) {
    super({ name: 'federal-register', pollIntervalMs })
    this.agencies = agencies
  }

  async _fetchEvents() {
    const params = new URLSearchParams({
      'conditions[type][]': 'RULE',
      'conditions[agencies][]': this.agencies.join(','),
      per_page: '20',
      order: 'newest',
    })

    // Also fetch proposed rules
    const [rulesRes, proposedRes] = await Promise.all([
      fetch(`${FR_API_BASE}/documents.json?${params}`, { signal: AbortSignal.timeout(10_000) }),
      fetch(`${FR_API_BASE}/documents.json?${params.toString().replace('RULE', 'PRORULE')}`, { signal: AbortSignal.timeout(10_000) }),
    ])

    if (!rulesRes.ok && !proposedRes.ok) throw new Error(`Federal Register API ${rulesRes.status}/${proposedRes.status}`)

    const rules = rulesRes.ok ? (await rulesRes.json()).results ?? [] : []
    const proposed = proposedRes.ok ? (await proposedRes.json()).results ?? [] : []

    return [...rules, ...proposed].map((doc) => ({
      id: `fr:${doc.document_number}`,
      type: doc.type === 'Rule' ? 'RULE_PUBLISHED' : 'RULE_PROPOSED',
      title: doc.title ?? 'Untitled rule',
      summary: doc.abstract ?? doc.title ?? '',
      timestamp: doc.publication_date ?? new Date().toISOString(),
      source: 'federalregister.gov',
      metadata: {
        documentNumber: doc.document_number,
        type: doc.type,
        agencies: doc.agencies?.map((a) => a.name) ?? [],
        publicationDate: doc.publication_date,
        commentEndDate: doc.comment_end_date,
        effectiveDate: doc.effective_on,
        htmlUrl: doc.html_url,
        pdfUrl: doc.pdf_url,
      },
    }))
  }
}

export { FOCUS_AGENCIES }
