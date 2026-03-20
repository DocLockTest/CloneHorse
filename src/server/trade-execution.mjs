import { randomUUID } from 'node:crypto'

/** Minimum edge (absolute difference between fair value and market price) to generate a ticket.
 * Below this threshold, the trade isn't worth the execution risk. */
const MIN_EDGE_THRESHOLD = 0.03 // 3 points

/** Trade execution service — generates tickets from triggers, manages approval flow.
 * No actual order placement yet (Phase 3 scope: ticket lifecycle only).
 * Order placement against Kalshi/Polymarket APIs comes when trading API credentials are available. */
export class TradeExecutionService {
  constructor({ capitalLimits = {} } = {}) {
    this.maxPerTrade = capitalLimits.maxPerTrade ?? 210
    this.maxExposure = capitalLimits.maxExposure ?? 1200
    this.tickets = new Map() // ticketId → ticket object
  }

  /** Generate a trade ticket from a market + trigger signal.
   * Returns null if edge is too small to trade. */
  generateTicket({ market, trigger }) {
    const edge = market.fairValueYes - market.marketPriceYes
    if (Math.abs(edge) < MIN_EDGE_THRESHOLD) return null

    const side = edge > 0 ? 'YES' : 'NO'

    // EV for the chosen side
    // YES side: EV = p * (1 - price) - (1-p) * price
    // NO side:  EV = (1-p) * (1 - (1-price)) - p * (1-price) = (1-p) * price - p * (1-price)
    // Simplified: EV_YES = fairValue - marketPrice (when buying YES at market price)
    const evYes = market.fairValueYes * (1 - market.marketPriceYes) - (1 - market.fairValueYes) * market.marketPriceYes

    // Entry price: the market price on the side we're trading
    const entryPrice = side === 'YES' ? market.marketPriceYes : (1 - market.marketPriceYes)

    // Position size: scale by edge magnitude and trigger score, cap at maxPerTrade
    const edgeMagnitude = Math.abs(edge)
    const triggerScore = trigger.score ?? 0.5
    const rawSize = Math.round(this.maxPerTrade * edgeMagnitude * triggerScore * 10) // scale factor
    const maxSize = Math.min(rawSize, this.maxPerTrade)

    const ticket = {
      id: `ticket-${randomUUID().slice(0, 8)}`,
      marketId: market.id,
      venue: market.venue,
      title: market.title,
      side,
      entryPrice: Number(entryPrice.toFixed(4)),
      maxSize,
      ev: Number(evYes.toFixed(4)),
      edge: Number(edge.toFixed(4)),
      fairValue: market.fairValueYes,
      marketPrice: market.marketPriceYes,
      triggerType: trigger.type,
      triggerScore: trigger.score,
      thesis: this.#buildThesis({ market, side, edge, evYes }),
      status: 'pending-approval',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      rejectedAt: null,
      rejectedReason: null,
    }

    this.tickets.set(ticket.id, ticket)
    return { ...ticket }
  }

  /** Approve a pending ticket. Returns the updated ticket or null if not found/not pending. */
  approveTicket(ticketId) {
    const ticket = this.tickets.get(ticketId)
    if (!ticket || ticket.status !== 'pending-approval') return null

    ticket.status = 'approved'
    ticket.approvedAt = new Date().toISOString()
    return { ...ticket }
  }

  /** Reject a pending ticket with a reason. Returns the updated ticket or null. */
  rejectTicket(ticketId, reason) {
    const ticket = this.tickets.get(ticketId)
    if (!ticket || ticket.status !== 'pending-approval') return null

    ticket.status = 'rejected'
    ticket.rejectedAt = new Date().toISOString()
    ticket.rejectedReason = reason ?? 'No reason provided'
    return { ...ticket }
  }

  /** Get all tickets that haven't been rejected. */
  getActiveTickets() {
    return [...this.tickets.values()]
      .filter((t) => t.status !== 'rejected')
      .map((t) => ({ ...t }))
  }

  /** Get only tickets awaiting operator approval. */
  getPendingApprovals() {
    return [...this.tickets.values()]
      .filter((t) => t.status === 'pending-approval')
      .map((t) => ({ ...t }))
  }

  /** Get a specific ticket by ID. */
  getTicket(ticketId) {
    const ticket = this.tickets.get(ticketId)
    return ticket ? { ...ticket } : null
  }

  /** Build a human-readable thesis for the trade. */
  #buildThesis({ market, side, edge, evYes }) {
    const direction = side === 'YES' ? 'underpriced' : 'overpriced'
    const edgePts = Math.round(Math.abs(edge) * 100)
    return `Market appears ${direction} by ${edgePts} pts. ` +
      `Fair value: ${Math.round(market.fairValueYes * 100)}¢, ` +
      `market: ${Math.round(market.marketPriceYes * 100)}¢. ` +
      `EV: ${evYes >= 0 ? '+' : ''}${(evYes * 100).toFixed(1)}¢/share.`
  }
}
