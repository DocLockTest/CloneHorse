import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FederalRegisterFeed } from './federal-register-feed.mjs'

describe('FederalRegisterFeed', () => {
  const mockRules = {
    results: [
      {
        document_number: '2026-05432',
        title: 'Revised Clean Air Standards for Industrial Emissions',
        type: 'Rule',
        abstract: 'Final rule revising emission standards for industrial facilities.',
        publication_date: '2026-03-18',
        effective_on: '2026-06-01',
        comment_end_date: null,
        html_url: 'https://www.federalregister.gov/d/2026-05432',
        pdf_url: 'https://www.federalregister.gov/d/2026-05432.pdf',
        agencies: [{ name: 'Environmental Protection Agency' }],
      },
    ],
  }

  const mockProposed = {
    results: [
      {
        document_number: '2026-05500',
        title: 'Proposed Digital Asset Custody Standards',
        type: 'Proposed Rule',
        abstract: 'SEC proposes standards for digital asset custody by broker-dealers.',
        publication_date: '2026-03-17',
        effective_on: null,
        comment_end_date: '2026-05-15',
        html_url: 'https://www.federalregister.gov/d/2026-05500',
        pdf_url: null,
        agencies: [{ name: 'Securities and Exchange Commission' }],
      },
    ],
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts final and proposed rules', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockRules) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProposed) }))

    const feed = new FederalRegisterFeed()
    const events = await feed.poll()

    expect(events).toHaveLength(2)

    const rule = events.find((e) => e.type === 'RULE_PUBLISHED')
    expect(rule).toBeTruthy()
    expect(rule.id).toBe('fr:2026-05432')
    expect(rule.metadata.agencies).toContain('Environmental Protection Agency')
    expect(rule.metadata.effectiveDate).toBe('2026-06-01')

    const proposed = events.find((e) => e.type === 'RULE_PROPOSED')
    expect(proposed).toBeTruthy()
    expect(proposed.id).toBe('fr:2026-05500')
    expect(proposed.metadata.commentEndDate).toBe('2026-05-15')
  })

  it('handles partial API failure gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockRules) })
      .mockResolvedValueOnce({ ok: false, status: 500 }))

    const feed = new FederalRegisterFeed()
    const events = await feed.poll()

    // Should still return results from the successful request
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('RULE_PUBLISHED')
  })

  it('throws when both API calls fail', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 }))

    const feed = new FederalRegisterFeed()
    const events = await feed.poll()
    expect(events).toHaveLength(0)
    expect(feed.getHealth().status).toBe('error')
  })
})
