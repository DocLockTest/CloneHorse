/** Position store — tracks open positions from approved tickets and calculates P&L.
 * Positions are derived from approved trade tickets. P&L is computed by comparing
 * entry price to current market price for the relevant side (YES or NO). */
export class PositionStore {
  constructor() {
    this.positions = new Map() // ticketId → position object
  }

  /** Open a position from an approved ticket. Returns the position or null if invalid/duplicate. */
  openPosition(ticket) {
    if (ticket.status !== 'approved') return null
    if (this.positions.has(ticket.id)) return null

    const position = {
      ticketId: ticket.id,
      marketId: ticket.marketId,
      venue: ticket.venue,
      title: ticket.title,
      side: ticket.side,
      entryPrice: ticket.entryPrice,
      size: ticket.maxSize,
      ev: ticket.ev,
      edge: ticket.edge,
      status: 'open',
      openedAt: new Date().toISOString(),
      closedAt: null,
      exitPrice: null,
      realizedPnL: null,
    }

    this.positions.set(ticket.id, position)
    return { ...position }
  }

  /** Calculate unrealized P&L for a single position.
   * For YES: pnl = (currentYesPrice - entryPrice) * size
   * For NO:  pnl = (currentNoPrice - entryPrice) * size where currentNoPrice = 1 - currentYesPrice */
  calculatePnL(ticketId, currentYesPrice) {
    const pos = this.positions.get(ticketId)
    if (!pos || pos.status !== 'open') return null

    const currentSidePrice = pos.side === 'YES' ? currentYesPrice : (1 - currentYesPrice)
    const unrealizedPnL = (currentSidePrice - pos.entryPrice) * pos.size
    const cost = pos.entryPrice * pos.size
    const unrealizedPnLPct = cost > 0 ? unrealizedPnL / cost : 0

    return {
      ticketId: pos.ticketId,
      unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
      unrealizedPnLPct: Math.round(unrealizedPnLPct * 10000) / 10000,
      currentSidePrice,
      entryPrice: pos.entryPrice,
    }
  }

  /** Get all open positions with current P&L attached.
   * @param currentPrices — { marketId: currentYesPrice } */
  getPositions(currentPrices = {}) {
    return [...this.positions.values()]
      .filter((p) => p.status === 'open')
      .map((p) => {
        const currentYesPrice = currentPrices[p.marketId]
        const pnl = currentYesPrice != null ? this.calculatePnL(p.ticketId, currentYesPrice) : null
        return {
          ...p,
          unrealizedPnL: pnl?.unrealizedPnL ?? 0,
          unrealizedPnLPct: pnl?.unrealizedPnLPct ?? 0,
          currentSidePrice: pnl?.currentSidePrice ?? null,
        }
      })
  }

  /** Close a position at a given exit price and record realized P&L. */
  closePosition(ticketId, exitYesPrice) {
    const pos = this.positions.get(ticketId)
    if (!pos || pos.status !== 'open') return null

    const exitSidePrice = pos.side === 'YES' ? exitYesPrice : (1 - exitYesPrice)
    const realizedPnL = (exitSidePrice - pos.entryPrice) * pos.size

    pos.status = 'closed'
    pos.closedAt = new Date().toISOString()
    pos.exitPrice = exitSidePrice
    pos.realizedPnL = Math.round(realizedPnL * 100) / 100

    return { ...pos }
  }

  /** Get aggregate summary across all open positions. */
  getSummary(currentPrices = {}) {
    const open = this.getPositions(currentPrices)
    const totalExposure = open.reduce((sum, p) => sum + p.size, 0)
    const totalCost = open.reduce((sum, p) => sum + p.entryPrice * p.size, 0)
    const totalUnrealizedPnL = open.reduce((sum, p) => sum + p.unrealizedPnL, 0)

    return {
      openCount: open.length,
      totalExposure,
      totalCost: Math.round(totalCost * 100) / 100,
      totalUnrealizedPnL: Math.round(totalUnrealizedPnL * 100) / 100,
      positions: open,
    }
  }
}
