<script setup>
import { computed, ref } from 'vue'
import TopBar from './components/TopBar.vue'
import StatStrip from './components/StatStrip.vue'
import Panel from './components/Panel.vue'
import AgentRegistry from './components/AgentRegistry.vue'
import CalibrationPanel from './components/CalibrationPanel.vue'
import MarketBoard from './components/MarketBoard.vue'
import RiskConsole from './components/RiskConsole.vue'
import SwarmReplay from './components/SwarmReplay.vue'
import TriggerFeed from './components/TriggerFeed.vue'
import WorldInspector from './components/WorldInspector.vue'
import {
  agents,
  calibration,
  capital,
  kernelSnapshot,
  markets,
  swarmRuns,
  tickets,
  triggerEvents,
  worldStates,
} from './data/kernelData'

const selectedMarketId = ref(markets[0]?.id ?? null)

const selectedMarket = computed(() => markets.find((market) => market.id === selectedMarketId.value))
const selectedWorldState = computed(() => worldStates.find((world) => world.marketId === selectedMarketId.value))
const selectedRun = computed(() => swarmRuns.find((run) => run.marketId === selectedMarketId.value))
const selectedTriggers = computed(() => triggerEvents.filter((trigger) => trigger.marketId === selectedMarketId.value))
const selectedTickets = computed(() => tickets.filter((ticket) => ticket.marketId === selectedMarketId.value))

const statItems = [
  { label: 'Objective', value: kernelSnapshot.objective },
  { label: 'Active markets', value: kernelSnapshot.activeMarkets },
  { label: 'Active agents', value: kernelSnapshot.activeAgents },
  { label: 'Open positions', value: kernelSnapshot.openPositions },
  { label: 'Bankroll', value: kernelSnapshot.bankroll },
  { label: 'Day PnL', value: kernelSnapshot.dayPnL },
  { label: 'Win rate', value: kernelSnapshot.winRate },
  { label: 'Fast rerun', value: kernelSnapshot.fastRerunLatency },
]
</script>

<template>
  <div class="shell">
    <TopBar />

    <p class="lead">
      The operator console is now wired to explicit kernel contracts: market objects, trigger events,
      world-state snapshots, swarm runs, tickets, and capital state. This is the first real app skeleton
      for the forked prediction engine.
    </p>

    <StatStrip :items="statItems" />

    <main class="grid">
      <Panel title="Command center" kicker="Trigger engine">
        <template #actions>
          <button class="inline-action">Run fast rerun</button>
        </template>
        <div class="command-box">
          <div class="command-title">Active market</div>
          <textarea rows="5" readonly>
{{ selectedMarket?.title }}
Venue: {{ selectedMarket?.venue }}
Fair value: {{ Math.round((selectedMarket?.fairValueYes ?? 0) * 100) }}¢
Market: {{ Math.round((selectedMarket?.marketPriceYes ?? 0) * 100) }}¢
Drivers: {{ selectedMarket?.primaryDrivers.join(', ') }}
          </textarea>
        </div>
        <TriggerFeed :triggers="selectedTriggers" />
      </Panel>

      <Panel title="Market board" kicker="Kernel markets">
        <MarketBoard :markets="markets" :selected-id="selectedMarketId" @select="selectedMarketId = $event" />
      </Panel>

      <Panel title="World inspector" kicker="Graph-derived state">
        <WorldInspector :world-state="selectedWorldState" />
      </Panel>

      <Panel title="Swarm replay" kicker="Belief deltas">
        <SwarmReplay :run="selectedRun" />
      </Panel>

      <Panel title="Risk / capital" kicker="Approval gated">
        <RiskConsole :capital="capital" :tickets="selectedTickets" />
      </Panel>

      <Panel title="Agent registry" kicker="Persistent personas">
        <AgentRegistry :agents="agents" />
      </Panel>

      <Panel title="Calibration" kicker="Operator metrics">
        <CalibrationPanel :calibration="calibration" />
      </Panel>
    </main>
  </div>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  color: #dbe7ff;
  background:
    radial-gradient(circle at top left, rgba(57, 129, 255, 0.22), transparent 28%),
    radial-gradient(circle at top right, rgba(32, 222, 188, 0.16), transparent 24%),
    linear-gradient(180deg, #07111d 0%, #091526 55%, #050b14 100%);
}
.shell { max-width: 1480px; margin: 0 auto; padding: 32px 20px 60px; }
.lead { color: #9db2d1; max-width: 920px; line-height: 1.6; font-size: 1.05rem; margin: 18px 0 24px; }
.grid { margin-top: 22px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
.grid > *:nth-child(1) { grid-column: span 5; }
.grid > *:nth-child(2) { grid-column: span 7; }
.grid > *:nth-child(3) { grid-column: span 7; }
.grid > *:nth-child(4) { grid-column: span 5; }
.grid > *:nth-child(5) { grid-column: span 5; }
.grid > *:nth-child(6) { grid-column: span 7; }
.grid > *:nth-child(7) { grid-column: 1 / -1; }
.command-box { display: grid; gap: 12px; margin-bottom: 14px; }
.command-title { color: #9db2d1; font-size: 14px; }
textarea {
  width: 100%; resize: vertical; border-radius: 16px; background: rgba(255,255,255,0.04);
  color: #e8f0ff; border: 1px solid rgba(149,185,245,0.18); padding: 14px; min-height: 126px;
}
button {
  border: none; background: linear-gradient(180deg, #77d6ff, #4d86ff); color: #08111d;
  font-weight: 700; border-radius: 14px; padding: 11px 15px; cursor: pointer;
}
.inline-action {
  background: rgba(255,255,255,0.05); color: #d7e5ff; border: 1px solid rgba(149,185,245,0.16);
}
@media (max-width: 1100px) { .grid > * { grid-column: 1 / -1 !important; } }
</style>
