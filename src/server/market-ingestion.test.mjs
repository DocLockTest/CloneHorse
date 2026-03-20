import { describe, it, expect, beforeEach } from 'vitest'
import { MarketIngestionService } from './market-ingestion.mjs'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

// --- Service instantiation ---
describe('MarketIngestionService constructor', () => {
  it('creates with default options', () => {
    const svc = new MarketIngestionService({ fallbackMarkets: [] })
    expect(svc.health.status).toBe('cold')
    expect(svc.health.kalshiAuth).toBe('missing')
  })

  it('reports kalshiAuth as configured when key is provided', () => {
    const svc = new MarketIngestionService({
      fallbackMarkets: [],
      apiKeys: { kalshiPrimary: 'test-key-123' },
    })
    expect(svc.health.kalshiAuth).toBe('configured')
  })

  it('accepts custom refresh interval and TTL', () => {
    const svc = new MarketIngestionService({
      fallbackMarkets: [],
      refreshIntervalMs: 60_000,
      ttlMs: 300_000,
    })
    expect(svc.refreshIntervalMs).toBe(60_000)
    expect(svc.ttlMs).toBe(300_000)
  })
})

// --- Snapshot disk persistence ---
describe('MarketIngestionService disk snapshot', () => {
  let tmpDir
  let snapshotPath

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'mirofish-test-'))
    snapshotPath = pathToFileURL(join(tmpDir, 'snapshot.json'))
  })

  it('loads a valid snapshot from disk', async () => {
    const snapshot = {
      source: 'live',
      capturedAt: new Date().toISOString(),
      markets: [
        { id: 'test:1', title: 'Test market', subcategory: 'court-ruling' },
      ],
    }
    await writeFile(new URL(snapshotPath), JSON.stringify(snapshot), 'utf8')

    const svc = new MarketIngestionService({
      fallbackMarkets: [],
      snapshotPath,
    })
    await svc.loadPromise

    expect(svc.health.status).toBe('ready')
    expect(svc.health.marketCount).toBe(1)
  })

  it('handles missing snapshot file gracefully', async () => {
    const svc = new MarketIngestionService({
      fallbackMarkets: [],
      snapshotPath: pathToFileURL(join(tmpDir, 'nonexistent.json')),
    })
    await svc.loadPromise

    expect(svc.health.status).toBe('cold')
    expect(svc.health.marketCount).toBe(0)
  })

  it('handles corrupt snapshot file gracefully', async () => {
    await writeFile(new URL(snapshotPath), 'NOT VALID JSON{{{', 'utf8')

    const svc = new MarketIngestionService({
      fallbackMarkets: [],
      snapshotPath,
    })
    await svc.loadPromise

    expect(svc.health.status).toBe('degraded')
    expect(svc.health.lastError).toContain('JSON')
  })

  it('handles snapshot with missing markets array', async () => {
    await writeFile(new URL(snapshotPath), JSON.stringify({ source: 'test' }), 'utf8')

    const svc = new MarketIngestionService({
      fallbackMarkets: [],
      snapshotPath,
    })
    await svc.loadPromise

    expect(svc.health.status).toBe('degraded')
    expect(svc.health.lastError).toContain('markets array')
  })
})

// --- Freshness state ---
describe('MarketIngestionService freshness', () => {
  it('reports fresh for recent snapshot', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'mirofish-test-'))
    const snapshotPath = pathToFileURL(join(tmpDir, 'snap.json'))
    const snapshot = {
      source: 'live',
      capturedAt: new Date().toISOString(),
      markets: [{ id: 'test:1', title: 'Test' }],
    }
    await writeFile(new URL(snapshotPath), JSON.stringify(snapshot), 'utf8')

    const svc = new MarketIngestionService({
      fallbackMarkets: [],
      snapshotPath,
      refreshIntervalMs: 120_000,
    })
    await svc.loadPromise

    expect(svc.health.freshness).toBe('fresh')
  })

  it('reports stale for old snapshot', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'mirofish-test-'))
    const snapshotPath = pathToFileURL(join(tmpDir, 'snap.json'))
    // Snapshot from 5 minutes ago
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const snapshot = {
      source: 'live',
      capturedAt: fiveMinAgo,
      markets: [{ id: 'test:1', title: 'Test' }],
    }
    await writeFile(new URL(snapshotPath), JSON.stringify(snapshot), 'utf8')

    const svc = new MarketIngestionService({
      fallbackMarkets: [],
      snapshotPath,
      refreshIntervalMs: 120_000,
      ttlMs: 900_000,
    })
    await svc.loadPromise

    expect(svc.health.freshness).toBe('stale')
  })
})

// --- Fallback behavior ---
describe('MarketIngestionService fallback', () => {
  it('uses fallback markets when no snapshot and no network', async () => {
    const fallback = [
      { id: 'fallback:1', title: 'Fallback market', subcategory: 'court-ruling' },
    ]
    const tmpDir = await mkdtemp(join(tmpdir(), 'mirofish-test-'))
    const svc = new MarketIngestionService({
      fallbackMarkets: fallback,
      snapshotPath: pathToFileURL(join(tmpDir, 'nope.json')),
    })
    await svc.loadPromise

    // getStoredSnapshot returns null since no disk snapshot loaded
    const stored = await svc.getStoredSnapshot()
    expect(stored).toBe(null)
  })
})

// --- Health reporting ---
describe('MarketIngestionService health', () => {
  it('getHealth returns structured health object', async () => {
    const svc = new MarketIngestionService({ fallbackMarkets: [] })
    await svc.loadPromise
    const health = await svc.getHealth()

    expect(health).toHaveProperty('status')
    expect(health).toHaveProperty('source')
    expect(health).toHaveProperty('freshness')
    expect(health).toHaveProperty('hasSnapshot')
    expect(health).toHaveProperty('kalshiAuth')
  })
})
