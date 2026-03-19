import { TriggerStore } from './trigger-store.mjs'

export class TriggerEngine {
  constructor(options = {}) {
    this.store = options.store ?? new TriggerStore(options)
  }

  async evaluate(markets, { snapshotKey, generatedAt } = {}) {
    return this.store.ingestSnapshot({ snapshotKey, markets, generatedAt })
  }

  async getTriggers({ marketId = null } = {}) {
    return this.store.getTriggers({ marketId })
  }

  async getState() {
    await this.store.ready()
    return this.store.getState()
  }
}
