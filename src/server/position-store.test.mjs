import { describe, it, expect } from 'vitest'
import { PositionStore } from './position-store.mjs'

describe('PositionStore', () => {
  function makeTicket(overrides = {}) {
    return {
      id: 'ticket-abc',
      marketId: 'mkt-epa-june',
      venue: 'Kalshi',
      title: 'Will EPA rule be blocked?',
      side: 'YES',
      entryPrice: 0.43,
      maxSize: 150,
      ev: 0.14,
      edge: 0.14,
      fairValue: 0.57,
      marketPrice: 0.43,
      status: 'approved',
      ...overrides,
    }
  }

  describe('openPosition', () => {
    it('creates a position from an approved ticket', () => {
      const store = new PositionStore()
      const pos = store.openPosition(makeTicket())

      expect(pos.ticketId).toBe('ticket-abc')
      expect(pos.marketId).toBe('mkt-epa-june')
      expect(pos.side).toBe('YES')
      expect(pos.entryPrice).toBe(0.43)
      expect(pos.size).toBe(150)
      expect(pos.status).toBe('open')
      expect(pos.openedAt).toBeTruthy()
    })

    it('rejects non-approved tickets', () => {
      const store = new PositionStore()
      const pos = store.openPosition(makeTicket({ status: 'pending-approval' }))
      expect(pos).toBeNull()
    })

    it('prevents duplicate positions for the same ticket', () => {
      const store = new PositionStore()
      store.openPosition(makeTicket())
      const dup = store.openPosition(makeTicket())
      expect(dup).toBeNull()
    })
  })

  describe('P&L calculation', () => {
    it('calculates unrealized P&L for YES positions', () => {
      const store = new PositionStore()
      store.openPosition(makeTicket({ entryPrice: 0.43, maxSize: 100 }))

      // Current market price moved to 0.55 — position is profitable
      const pnl = store.calculatePnL('ticket-abc', 0.55)
      expect(pnl.unrealizedPnL).toBeCloseTo(12) // (0.55 - 0.43) * 100
      expect(pnl.unrealizedPnLPct).toBeCloseTo(0.2791, 2) // 12 / 43
    })

    it('calculates unrealized P&L for NO positions', () => {
      const store = new PositionStore()
      store.openPosition(makeTicket({
        id: 'ticket-no',
        side: 'NO',
        entryPrice: 0.57, // buying NO at 57¢ (1 - marketPriceYes of 0.43)
        maxSize: 100,
      }))

      // Market YES price moved to 0.35 → NO price = 0.65, position profitable
      const pnl = store.calculatePnL('ticket-no', 0.35)
      expect(pnl.unrealizedPnL).toBeCloseTo(8) // (0.65 - 0.57) * 100
    })

    it('returns null for unknown ticket', () => {
      const store = new PositionStore()
      expect(store.calculatePnL('nope', 0.5)).toBeNull()
    })
  })

  describe('getPositions', () => {
    it('returns all open positions with current P&L', () => {
      const store = new PositionStore()
      store.openPosition(makeTicket({ id: 'tkt-1', marketId: 'mkt-a', entryPrice: 0.40, maxSize: 100 }))
      store.openPosition(makeTicket({ id: 'tkt-2', marketId: 'mkt-b', entryPrice: 0.60, maxSize: 200, side: 'NO' }))

      const currentPrices = { 'mkt-a': 0.50, 'mkt-b': 0.45 }
      const positions = store.getPositions(currentPrices)

      expect(positions).toHaveLength(2)
      expect(positions[0].unrealizedPnL).toBeCloseTo(10) // (0.50 - 0.40) * 100
      expect(positions[1].unrealizedPnL).toBeCloseTo(-10) // NO: (0.55 - 0.60) * 200 = -10
    })
  })

  describe('closePosition', () => {
    it('closes a position and records realized P&L', () => {
      const store = new PositionStore()
      store.openPosition(makeTicket({ entryPrice: 0.43, maxSize: 100 }))

      const closed = store.closePosition('ticket-abc', 0.60)
      expect(closed.status).toBe('closed')
      expect(closed.exitPrice).toBe(0.60)
      expect(closed.realizedPnL).toBeCloseTo(17) // (0.60 - 0.43) * 100
      expect(closed.closedAt).toBeTruthy()
    })

    it('returns null for non-existent position', () => {
      const store = new PositionStore()
      expect(store.closePosition('nope', 0.5)).toBeNull()
    })
  })

  describe('getSummary', () => {
    it('returns aggregate exposure and P&L', () => {
      const store = new PositionStore()
      store.openPosition(makeTicket({ id: 'tkt-1', marketId: 'mkt-a', entryPrice: 0.40, maxSize: 100 }))
      store.openPosition(makeTicket({ id: 'tkt-2', marketId: 'mkt-b', entryPrice: 0.30, maxSize: 200 }))

      const currentPrices = { 'mkt-a': 0.50, 'mkt-b': 0.25 }
      const summary = store.getSummary(currentPrices)

      expect(summary.openCount).toBe(2)
      expect(summary.totalExposure).toBe(300) // 100 + 200
      expect(summary.totalCost).toBeCloseTo(100) // 0.40*100 + 0.30*200 = 40 + 60
      // P&L: (0.50-0.40)*100 + (0.25-0.30)*200 = 10 + (-10) = 0
      expect(summary.totalUnrealizedPnL).toBeCloseTo(0)
    })
  })
})
