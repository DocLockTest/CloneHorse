import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FeedBase } from './feed-base.mjs'
import { CongressFeed } from './congress-feed.mjs'

describe('FeedBase', () => {
  it('deduplicates events by id', async () => {
    class TestFeed extends FeedBase {
      constructor() { super({ name: 'test', pollIntervalMs: 60_000 }) }
      async _fetchEvents() {
        return [
          { id: 'evt-1', type: 'TEST', title: 'First', timestamp: '2026-03-19T00:00:00Z' },
          { id: 'evt-2', type: 'TEST', title: 'Second', timestamp: '2026-03-19T00:01:00Z' },
        ]
      }
    }

    const feed = new TestFeed()
    const first = await feed.poll()
    expect(first).toHaveLength(2)

    const second = await feed.poll()
    expect(second).toHaveLength(0) // deduped

    expect(feed.events).toHaveLength(2)
    expect(feed.events[0].feedName).toBe('test')
    expect(feed.events[0].ingestedAt).toBeTruthy()
  })

  it('trims events to maxEvents', async () => {
    let callCount = 0
    class BigFeed extends FeedBase {
      constructor() { super({ name: 'big', pollIntervalMs: 60_000, maxEvents: 5 }) }
      async _fetchEvents() {
        callCount++
        return Array.from({ length: 10 }, (_, i) => ({
          id: `evt-${callCount}-${i}`,
          type: 'TEST',
          title: `Event ${i}`,
          timestamp: new Date().toISOString(),
        }))
      }
    }

    const feed = new BigFeed()
    await feed.poll()
    expect(feed.events.length).toBeLessThanOrEqual(5)
  })

  it('tracks health correctly', async () => {
    class OkFeed extends FeedBase {
      constructor() { super({ name: 'ok-feed', pollIntervalMs: 60_000 }) }
      async _fetchEvents() { return [] }
    }

    const feed = new OkFeed()
    const healthBefore = feed.getHealth()
    expect(healthBefore.status).toBe('ok') // no poll yet, no error
    expect(healthBefore.pollCount).toBe(0)

    await feed.poll()
    const healthAfter = feed.getHealth()
    expect(healthAfter.status).toBe('ok')
    expect(healthAfter.pollCount).toBe(1)
    expect(healthAfter.lastPollAt).toBeTruthy()
  })

  it('records errors without crashing', async () => {
    class BadFeed extends FeedBase {
      constructor() { super({ name: 'bad', pollIntervalMs: 60_000 }) }
      async _fetchEvents() { throw new Error('API down') }
    }

    const feed = new BadFeed()
    const events = await feed.poll()
    expect(events).toHaveLength(0)
    expect(feed.getHealth().status).toBe('error')
    expect(feed.getHealth().lastError).toBe('API down')
  })

  it('filters events by since timestamp', async () => {
    class TimeFeed extends FeedBase {
      constructor() { super({ name: 'time', pollIntervalMs: 60_000 }) }
      async _fetchEvents() {
        return [
          { id: 'old', type: 'TEST', title: 'Old', timestamp: '2026-03-01T00:00:00Z' },
          { id: 'new', type: 'TEST', title: 'New', timestamp: '2026-03-19T00:00:00Z' },
        ]
      }
    }

    const feed = new TimeFeed()
    await feed.poll()
    const recent = feed.getLatestEvents({ since: '2026-03-15T00:00:00Z' })
    expect(recent).toHaveLength(1)
    expect(recent[0].id).toBe('new')
  })
})

describe('CongressFeed', () => {
  const mockBills = {
    bills: [
      {
        number: 1234,
        type: 'HR',
        title: 'Surveillance Reform Act',
        updateDate: '2026-03-19',
        originChamber: 'House',
        latestAction: {
          text: 'Referred to the Committee on Judiciary',
          actionDate: '2026-03-18',
        },
        url: 'https://api.congress.gov/v3/bill/119/hr/1234',
      },
      {
        number: 5678,
        type: 'S',
        title: 'Climate Adaptation Act',
        updateDate: '2026-03-17',
        originChamber: 'Senate',
        latestAction: {
          text: 'Read twice and placed on the calendar',
          actionDate: '2026-03-16',
        },
        url: 'https://api.congress.gov/v3/bill/119/s/5678',
      },
      {
        number: 9999,
        type: 'HR',
        title: 'Naming Post Office Act',
        updateDate: '2026-03-10',
        originChamber: 'House',
        latestAction: {
          text: 'Became public law',
          actionDate: '2026-03-09',
        },
      },
    ],
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts events from Congress API response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBills),
    }))

    const feed = new CongressFeed({ apiKey: 'test-key' })
    const events = await feed.poll()

    // 'Referred to the Committee' matches 'referred to' and 'committee'
    // 'Read twice' doesn't match any active signal — filtered out
    // 'Became public law' doesn't match — filtered out
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe('congress:1234-HR-119')
    expect(events[0].type).toBe('BILL_STATUS_CHANGE')
    expect(events[0].metadata.billNumber).toBe(1234)
    expect(events[0].metadata.latestAction).toContain('Committee')
  })

  it('returns empty when no API key', async () => {
    const feed = new CongressFeed({ apiKey: '' })
    const events = await feed.poll()
    expect(events).toHaveLength(0)
    expect(feed.getHealth().status).toBe('ok')
  })

  it('handles API errors gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    }))

    const feed = new CongressFeed({ apiKey: 'test-key' })
    const events = await feed.poll()
    expect(events).toHaveLength(0)
    expect(feed.getHealth().status).toBe('error')
    expect(feed.getHealth().lastError).toContain('429')
  })

  it('identifies relevant legislative stages', () => {
    const feed = new CongressFeed({ apiKey: 'test-key' })

    // Active stages — should match
    expect(feed._isRelevantStage({ latestAction: { text: 'Referred to Committee on Finance' } })).toBe(true)
    expect(feed._isRelevantStage({ latestAction: { text: 'Passed House by recorded vote' } })).toBe(true)
    expect(feed._isRelevantStage({ latestAction: { text: 'Cloture motion agreed to' } })).toBe(true)
    expect(feed._isRelevantStage({ latestAction: { text: 'Amendment SA 1234 proposed' } })).toBe(true)
    expect(feed._isRelevantStage({ latestAction: { text: 'Reported by Committee with amendments' } })).toBe(true)

    // Non-active — should not match
    expect(feed._isRelevantStage({ latestAction: { text: 'Introduced in House' } })).toBe(false)
    expect(feed._isRelevantStage({ latestAction: { text: 'Read twice and placed on calendar' } })).toBe(false)
  })
})
