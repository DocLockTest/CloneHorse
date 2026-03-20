import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CourtListenerFeed } from './pacer-feed.mjs'

describe('CourtListenerFeed', () => {
  const mockOpinions = {
    results: [
      {
        id: 12345,
        case_name: 'EPA v. Industrial Corp',
        court: 'ca5',
        date_created: '2026-03-18T14:30:00Z',
        date_filed: '2026-03-18',
        status: 'Published',
        type: 'Opinion',
        absolute_url: '/opinion/12345/epa-v-industrial-corp/',
      },
      {
        id: 67890,
        case_name: 'Securities Exchange Commission v. CryptoDAO',
        court: 'ca2',
        date_created: '2026-03-17T09:00:00Z',
        date_filed: '2026-03-17',
        status: 'Published',
        type: 'Opinion',
        absolute_url: '/opinion/67890/sec-v-cryptodao/',
      },
    ],
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts docket updates from Court Listener', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOpinions),
    }))

    const feed = new CourtListenerFeed()
    const events = await feed.poll()

    expect(events).toHaveLength(2)
    expect(events[0].id).toBe('cl:opinion-12345')
    expect(events[0].type).toBe('DOCKET_UPDATE')
    expect(events[0].title).toBe('EPA v. Industrial Corp')
    expect(events[0].metadata.court).toBe('ca5')
    expect(events[0].metadata.absoluteUrl).toContain('courtlistener.com')
  })

  it('sends auth token when available', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const feed = new CourtListenerFeed({ apiToken: 'secret-token' })
    await feed.poll()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Token secret-token' }),
      }),
    )
  })

  it('works without auth token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const feed = new CourtListenerFeed({ apiToken: '' })
    await feed.poll()

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBeUndefined()
  })

  it('handles API errors gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))

    const feed = new CourtListenerFeed()
    const events = await feed.poll()
    expect(events).toHaveLength(0)
    expect(feed.getHealth().status).toBe('error')
  })

  it('builds readable summaries', () => {
    const feed = new CourtListenerFeed()
    const summary = feed._buildSummary({
      case_name: 'Test v. Case',
      court: 'ca9',
      date_filed: '2026-03-15',
      status: 'Published',
    })
    expect(summary).toContain('Test v. Case')
    expect(summary).toContain('ca9')
    expect(summary).toContain('2026-03-15')
  })
})
