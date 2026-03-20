import { describe, it, expect, beforeEach } from 'vitest'
import { TradeExecutionService } from './trade-execution.mjs'

describe('TradeExecutionService', () => {
  let svc

  beforeEach(() => {
    svc = new TradeExecutionService({
      capitalLimits: { maxPerTrade: 210, maxExposure: 1200 },
    })
  })

  // --- Ticket Generation ---
  describe('generateTicket', () => {
    it('generates NO ticket when fair value < market price', () => {
      const ticket = svc.generateTicket({
        market: { id: 'poly:123', venue: 'Polymarket', marketPriceYes: 0.57, fairValueYes: 0.32, title: 'Test market' },
        trigger: { type: 'price-dislocation', score: 0.8 },
      })
      expect(ticket.side).toBe('NO')
      expect(ticket.status).toBe('pending-approval')
      expect(ticket.entryPrice).toBeGreaterThan(0)
      expect(ticket.entryPrice).toBeLessThan(1)
      expect(ticket.maxSize).toBeLessThanOrEqual(210)
      expect(ticket.ev).toBeLessThan(0) // EV of YES is negative, so we go NO
      expect(ticket.id).toBeTruthy()
      expect(ticket.venue).toBe('Polymarket')
      expect(ticket.marketId).toBe('poly:123')
    })

    it('generates YES ticket when fair value > market price', () => {
      const ticket = svc.generateTicket({
        market: { id: 'kalshi:ABC', venue: 'Kalshi', marketPriceYes: 0.30, fairValueYes: 0.65, title: 'Court ruling' },
        trigger: { type: 'price-dislocation', score: 0.7 },
      })
      expect(ticket.side).toBe('YES')
      expect(ticket.status).toBe('pending-approval')
    })

    it('calculates EV correctly', () => {
      const ticket = svc.generateTicket({
        market: { id: 'poly:1', venue: 'Polymarket', marketPriceYes: 0.50, fairValueYes: 0.70, title: 'Test' },
        trigger: { type: 'price-dislocation', score: 0.6 },
      })
      // EV for YES = p * (1 - price) - (1-p) * price = 0.7 * 0.5 - 0.3 * 0.5 = 0.20
      expect(ticket.ev).toBeCloseTo(0.20, 2)
    })

    it('rejects ticket when edge is too small (< 3 points)', () => {
      const ticket = svc.generateTicket({
        market: { id: 'poly:1', venue: 'Polymarket', marketPriceYes: 0.50, fairValueYes: 0.52, title: 'Test' },
        trigger: { type: 'price-dislocation', score: 0.3 },
      })
      expect(ticket).toBeNull() // Edge too small, not worth trading
    })

    it('caps size at maxPerTrade', () => {
      const ticket = svc.generateTicket({
        market: { id: 'poly:1', venue: 'Polymarket', marketPriceYes: 0.20, fairValueYes: 0.80, title: 'Test' },
        trigger: { type: 'price-dislocation', score: 1.0 },
      })
      expect(ticket.maxSize).toBeLessThanOrEqual(210)
    })
  })

  // --- Approval Flow ---
  describe('approval flow', () => {
    it('approves a pending ticket', () => {
      const ticket = svc.generateTicket({
        market: { id: 'poly:1', venue: 'Polymarket', marketPriceYes: 0.50, fairValueYes: 0.70, title: 'Test' },
        trigger: { type: 'price-dislocation', score: 0.6 },
      })
      const approved = svc.approveTicket(ticket.id)
      expect(approved.status).toBe('approved')
      expect(approved.approvedAt).toBeTruthy()
    })

    it('rejects a pending ticket', () => {
      const ticket = svc.generateTicket({
        market: { id: 'poly:1', venue: 'Polymarket', marketPriceYes: 0.50, fairValueYes: 0.70, title: 'Test' },
        trigger: { type: 'price-dislocation', score: 0.6 },
      })
      const rejected = svc.rejectTicket(ticket.id, 'Not comfortable with this one')
      expect(rejected.status).toBe('rejected')
      expect(rejected.rejectedReason).toBe('Not comfortable with this one')
    })

    it('returns null when approving nonexistent ticket', () => {
      expect(svc.approveTicket('nonexistent-id')).toBeNull()
    })

    it('returns null when rejecting nonexistent ticket', () => {
      expect(svc.rejectTicket('nonexistent-id', 'reason')).toBeNull()
    })

    it('cannot approve an already-rejected ticket', () => {
      const ticket = svc.generateTicket({
        market: { id: 'poly:1', venue: 'Polymarket', marketPriceYes: 0.50, fairValueYes: 0.70, title: 'Test' },
        trigger: { type: 'price-dislocation', score: 0.6 },
      })
      svc.rejectTicket(ticket.id, 'nope')
      expect(svc.approveTicket(ticket.id)).toBeNull()
    })
  })

  // --- Queries ---
  describe('queries', () => {
    it('getPendingApprovals returns only pending tickets', () => {
      svc.generateTicket({
        market: { id: 'poly:1', venue: 'Polymarket', marketPriceYes: 0.50, fairValueYes: 0.70, title: 'A' },
        trigger: { type: 'price-dislocation', score: 0.6 },
      })
      const t2 = svc.generateTicket({
        market: { id: 'poly:2', venue: 'Polymarket', marketPriceYes: 0.30, fairValueYes: 0.60, title: 'B' },
        trigger: { type: 'price-dislocation', score: 0.7 },
      })
      svc.approveTicket(t2.id)

      const pending = svc.getPendingApprovals()
      expect(pending).toHaveLength(1)
      expect(pending[0].marketId).toBe('poly:1')
    })

    it('getActiveTickets returns all non-rejected tickets', () => {
      svc.generateTicket({
        market: { id: 'poly:1', venue: 'Polymarket', marketPriceYes: 0.50, fairValueYes: 0.70, title: 'A' },
        trigger: { type: 'price-dislocation', score: 0.6 },
      })
      const t2 = svc.generateTicket({
        market: { id: 'poly:2', venue: 'Polymarket', marketPriceYes: 0.30, fairValueYes: 0.60, title: 'B' },
        trigger: { type: 'price-dislocation', score: 0.7 },
      })
      svc.rejectTicket(t2.id, 'nope')

      const active = svc.getActiveTickets()
      expect(active).toHaveLength(1)
    })
  })
})
