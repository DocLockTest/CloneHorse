import { TriggerStore } from './trigger-store.mjs'

export class TriggerEngine {
  constructor(options = {}) {
    this.store = options.store ?? new TriggerStore(options)
  }

  async evaluate(markets, { snapshotKey, generatedAt } = {}) {
    await this.store.ingestSnapshot({ snapshotKey, markets, generatedAt })
    return this.store.getTriggers()
  }

  async getTriggers({ marketId = null } = {}) {
    return this.store.getTriggers({ marketId })
  }
}
