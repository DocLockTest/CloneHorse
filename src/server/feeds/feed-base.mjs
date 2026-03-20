/** Base class for all regulatory feed integrations.
 * Subclasses implement _fetchEvents() to hit their specific API.
 * FeedBase handles polling lifecycle, health tracking, and event dedup. */
export class FeedBase {
  constructor({ name, pollIntervalMs = 5 * 60 * 1000, maxEvents = 500 }) {
    this.name = name
    this.pollIntervalMs = pollIntervalMs
    this.maxEvents = maxEvents
    this.events = []
    this.lastPollAt = null
    this.lastError = null
    this.pollCount = 0
    this.seenIds = new Set()
    this._timer = null
  }

  /** Start automatic polling. */
  start() {
    if (this._timer) return
    this.poll() // immediate first poll
    this._timer = setInterval(() => this.poll(), this.pollIntervalMs)
  }

  /** Stop polling. */
  stop() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  /** Poll the feed for new events. Deduplicates by event ID. */
  async poll() {
    try {
      const raw = await this._fetchEvents()
      const newEvents = raw.filter((e) => !this.seenIds.has(e.id))
      for (const e of newEvents) {
        this.seenIds.add(e.id)
        e.feedName = this.name
        e.ingestedAt = new Date().toISOString()
        this.events.push(e)
      }
      // Trim to max
      if (this.events.length > this.maxEvents) {
        this.events = this.events.slice(-this.maxEvents)
      }
      this.lastPollAt = new Date().toISOString()
      this.lastError = null
      this.pollCount++
      return newEvents
    } catch (err) {
      this.lastError = err.message
      this.lastPollAt = new Date().toISOString()
      this.pollCount++
      return []
    }
  }

  /** Get events, optionally filtered by time window. */
  getLatestEvents({ since, limit = 50 } = {}) {
    let filtered = this.events
    if (since) {
      const cutoff = new Date(since).getTime()
      filtered = filtered.filter((e) => new Date(e.timestamp ?? e.ingestedAt).getTime() >= cutoff)
    }
    return filtered.slice(-limit)
  }

  /** Health status for dashboard/API. */
  getHealth() {
    const staleMs = this.lastPollAt
      ? Date.now() - new Date(this.lastPollAt).getTime()
      : null

    return {
      name: this.name,
      status: this.lastError ? 'error' : (staleMs && staleMs > this.pollIntervalMs * 3) ? 'stale' : 'ok',
      lastPollAt: this.lastPollAt,
      lastError: this.lastError,
      pollCount: this.pollCount,
      eventCount: this.events.length,
      staleSinceMs: staleMs,
    }
  }

  /** Subclasses must implement this. Returns array of { id, type, title, summary, timestamp, ...extra }. */
  async _fetchEvents() {
    throw new Error(`${this.name}: _fetchEvents() not implemented`)
  }
}
