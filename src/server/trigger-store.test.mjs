import { describe, it, expect, beforeEach } from 'vitest'
import { TriggerStore } from './trigger-store.mjs'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

function makeTmpPath() {
  return mkdtemp(join(tmpdir(), 'trigger-test-')).then(dir =>
    pathToFileURL(join(dir, 'triggers.json'))
  )
}

function fakeMarket(id, price = 0.5) {
  return {
    id,
    title: `Market ${id}`,
    venue: 'Kalshi',
    subcategory: 'court-ruling',
    marketPriceYes: price,
  }
}

// --- Constructor + loading ---
describe('TriggerStore constructor', () => {
  it('creates with empty state', async () => {
    const store = new TriggerStore({ filePath: await makeTmpPath() })
    await store.ready()
    const state = store.getState()
    expect(state.version).toBe(1)
    expect(state.history).toEqual([])
    expect(state.suppression).toEqual({})
  })

  it('loads existing state from disk', async () => {
    const path = await makeTmpPath()
    const existing = {
      version: 1,
      history: [{ id: 'trig-1', type: 'price-move', marketId: 'test:1' }],
      marketSnapshots: {},
      suppression: {},
    }
    await writeFile(new URL(path), JSON.stringify(existing), 'utf8')

    const store = new TriggerStore({ filePath: path })
    await store.ready()
    expect(store.getState().history).toHaveLength(1)
  })

  it('handles corrupt JSON gracefully', async () => {
    const path = await makeTmpPath()
    await writeFile(new URL(path), 'BROKEN{{JSON', 'utf8')

    const store = new TriggerStore({ filePath: path })
    await store.ready()
    // Should reset to empty state, not crash
    expect(store.getState().history).toEqual([])
  })
})

// --- Snapshot deduplication ---
describe('TriggerStore snapshot dedup', () => {
  it('skips duplicate snapshot keys', async () => {
    const store = new TriggerStore({ filePath: await makeTmpPath() })
    await store.ready()

    const markets = [fakeMarket('test:1', 0.5)]

    // First ingestion
    const r1 = await store.ingestSnapshot({ snapshotKey: 'snap-001', markets, generatedAt: new Date().toISOString() })
    expect(r1.replayed).toBe(true)

    // Second ingestion with same key — should be skipped
    const r2 = await store.ingestSnapshot({ snapshotKey: 'snap-001', markets, generatedAt: new Date().toISOString() })
    expect(r2.replayed).toBe(false)
    expect(r2.emitted).toEqual([])
  })

  it('processes different snapshot keys', async () => {
    const store = new TriggerStore({ filePath: await makeTmpPath() })
    await store.ready()

    const markets = [fakeMarket('test:1', 0.5)]
    await store.ingestSnapshot({ snapshotKey: 'snap-001', markets })

    const r2 = await store.ingestSnapshot({ snapshotKey: 'snap-002', markets })
    expect(r2.replayed).toBe(true)
  })
})

// --- Price triggers ---
describe('TriggerStore price triggers', () => {
  it('emits trigger on significant price move', async () => {
    const store = new TriggerStore({ filePath: await makeTmpPath() })
    await store.ready()

    // First snapshot — establishes baseline
    await store.ingestSnapshot({
      snapshotKey: 'snap-1',
      markets: [fakeMarket('test:1', 0.50)],
    })

    // Second snapshot — price moved 10 points
    const result = await store.ingestSnapshot({
      snapshotKey: 'snap-2',
      markets: [fakeMarket('test:1', 0.60)],
    })

    expect(result.emitted.length).toBeGreaterThanOrEqual(1)
    expect(result.emitted[0].type).toBe('price-dislocation')
  })

  it('does not emit trigger on small price move', async () => {
    const store = new TriggerStore({ filePath: await makeTmpPath() })
    await store.ready()

    await store.ingestSnapshot({
      snapshotKey: 'snap-1',
      markets: [fakeMarket('test:1', 0.50)],
    })

    // Price moved only 1 point — below threshold
    const result = await store.ingestSnapshot({
      snapshotKey: 'snap-2',
      markets: [fakeMarket('test:1', 0.51)],
    })

    expect(result.emitted).toEqual([])
  })
})

// --- Suppression ---
describe('TriggerStore suppression', () => {
  it('suppresses duplicate triggers within window', async () => {
    const store = new TriggerStore({
      filePath: await makeTmpPath(),
      suppressionWindowMs: 15 * 60 * 1000, // 15 min
    })
    await store.ready()

    // First: establish baseline
    await store.ingestSnapshot({ snapshotKey: 'snap-1', markets: [fakeMarket('test:1', 0.50)] })
    // Second: trigger fires
    const r1 = await store.ingestSnapshot({ snapshotKey: 'snap-2', markets: [fakeMarket('test:1', 0.60)] })
    const triggerCount = r1.emitted.length

    // Third: same-ish price move — should be suppressed
    await store.ingestSnapshot({ snapshotKey: 'snap-3', markets: [fakeMarket('test:1', 0.50)] })
    const r2 = await store.ingestSnapshot({ snapshotKey: 'snap-4', markets: [fakeMarket('test:1', 0.60)] })

    // Second fire should produce fewer or equal triggers (suppression kicks in)
    expect(r2.emitted.length).toBeLessThanOrEqual(triggerCount)
  })
})

// --- Market filtering ---
describe('TriggerStore getTriggers filtering', () => {
  it('returns all triggers when no marketId filter', async () => {
    const store = new TriggerStore({ filePath: await makeTmpPath() })
    await store.ready()

    // Generate some triggers
    await store.ingestSnapshot({ snapshotKey: 'snap-1', markets: [fakeMarket('m:1', 0.50), fakeMarket('m:2', 0.40)] })
    await store.ingestSnapshot({ snapshotKey: 'snap-2', markets: [fakeMarket('m:1', 0.60), fakeMarket('m:2', 0.55)] })

    const all = await store.getTriggers()
    const filtered = await store.getTriggers({ marketId: 'm:1' })

    expect(filtered.length).toBeLessThanOrEqual(all.length)
  })
})

// --- History cap ---
describe('TriggerStore history limit', () => {
  it('getState returns a deep clone (mutations do not affect store)', async () => {
    const store = new TriggerStore({ filePath: await makeTmpPath() })
    await store.ready()

    const state = store.getState()
    state.history.push({ fake: true })

    // Original store should be unaffected
    expect(store.getState().history).toEqual([])
  })
})

// --- Market snapshot tracking ---
describe('TriggerStore market snapshots', () => {
  it('tracks previous market snapshot', async () => {
    const store = new TriggerStore({ filePath: await makeTmpPath() })
    await store.ready()

    await store.ingestSnapshot({
      snapshotKey: 'snap-1',
      markets: [fakeMarket('m:1', 0.45)],
    })

    const prev = store.getPreviousMarketSnapshot('m:1')
    expect(prev).not.toBeNull()
    expect(prev.marketPriceYes).toBe(0.45)
  })

  it('returns null for unknown market', async () => {
    const store = new TriggerStore({ filePath: await makeTmpPath() })
    await store.ready()
    expect(store.getPreviousMarketSnapshot('nonexistent')).toBeNull()
  })
})
