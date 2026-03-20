import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EdgarFeed } from './edgar-feed.mjs'

describe('EdgarFeed', () => {
  const mockResponse = {
    hits: {
      hits: [
        {
          _id: 'abc123',
          _source: {
            form_type: '8-K',
            entity_name: 'Acme Corp',
            file_num: '001-12345',
            file_date: '2026-03-18',
            accession_no: '0001234567-26-000123',
            display_names: ['Acme Corp - 8-K Filing'],
          },
        },
        {
          _id: 'def456',
          _source: {
            form_type: 'SC 13D',
            entity_name: 'Big Fund LLC',
            file_num: '005-67890',
            file_date: '2026-03-17',
            accession_no: '0009876543-26-000456',
            display_names: ['Big Fund LLC - SC 13D'],
          },
        },
      ],
    },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts filing events from EDGAR response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    const feed = new EdgarFeed()
    const events = await feed.poll()

    expect(events).toHaveLength(2)
    expect(events[0].id).toBe('edgar:001-12345')
    expect(events[0].type).toBe('FILING_EVENT')
    expect(events[0].metadata.formType).toBe('8-K')
    expect(events[0].metadata.entityName).toBe('Acme Corp')
    expect(events[0].source).toBe('sec.gov/edgar')
  })

  it('sends custom user agent header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hits: { hits: [] } }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const feed = new EdgarFeed({ userAgent: 'TestBot/1.0 (test@test.com)' })
    await feed.poll()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': 'TestBot/1.0 (test@test.com)' }),
      }),
    )
  })

  it('handles API errors gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    const feed = new EdgarFeed()
    const events = await feed.poll()
    expect(events).toHaveLength(0)
    expect(feed.getHealth().status).toBe('error')
  })

  it('handles empty results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hits: { hits: [] } }),
    }))

    const feed = new EdgarFeed()
    const events = await feed.poll()
    expect(events).toHaveLength(0)
    expect(feed.getHealth().status).toBe('ok')
  })
})
