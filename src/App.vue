<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
  fetchAgents,
  fetchCalibration,
  fetchCapital,
  fetchMarkets,
  fetchSnapshot,
  fetchSwarmRuns,
  fetchTickets,
  fetchTriggers,
  fetchWorldState,
} from './api'

const snapshot = ref(null)
const markets = ref([])
const agents = ref([])
const tickets = ref([])
const capital = ref(null)
const calibration = ref(null)
const triggers = ref([])
const selectedWorldState = ref(null)
const selectedRun = ref(null)
const loading = ref(true)
const error = ref('')
const selectedMarketId = ref(null)

const selectedMarket = computed(() => markets.value.find((market) => market.id === selectedMarketId.value) ?? null)
const selectedTriggers = computed(() => triggers.value)
const selectedTickets = computed(() => tickets.value.filter((ticket) => ticket.marketId === selectedMarketId.value))
const statItems = computed(() => {
  if (!snapshot.value) return []
  return [
    { label: 'Objective', value: snapshot.value.objective },
    { label: 'Active markets', value: snapshot.value.activeMarkets },
    { label: 'Active agents', value: snapshot.value.activeAgents },
    { label: 'Open positions', value: snapshot.value.openPositions },
    { label: 'Bankroll', value: snapshot.value.bankroll },
    { label: 'Day PnL', value: snapshot.value.dayPnL },
    { label: 'Win rate', value: snapshot.value.winRate },
    { label: 'Fast rerun', value: snapshot.value.fastRerunLatency },
  ]
})

async function loadBase() {
  loading.value = true
  error.value = ''
  try {
    const [snapshotData, marketData, agentData, ticketData, capitalData, calibrationData] = await Promise.all([
      fetchSnapshot(),
      fetchMarkets(),
      fetchAgents(),
      fetchTickets(),
      fetchCapital(),
      fetchCalibration(),
    ])
    snapshot.value = snapshotData
    markets.value = marketData.markets ?? []
    agents.value = agentData
    tickets.value = ticketData
    capital.value = capitalData
    calibration.value = calibrationData
    selectedMarketId.value = selectedMarketId.value ?? marketData.markets?.[0]?.id ?? null
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function loadMarketDetails(marketId) {
  if (!marketId) return
  try {
    const [triggerData, worldStateData, runData] = await Promise.all([
      fetchTriggers(marketId),
      fetchWorldState(marketId),
      fetchSwarmRuns(marketId),
    ])
    triggers.value = triggerData
    selectedWorldState.value = worldStateData
    selectedRun.value = runData?.[0] ?? null
  } catch (err) {
    error.value = err.message
  }
}

onMounted(loadBase)
watch(selectedMarketId, loadMarketDetails)
</script>

<template>
  <div class="shell">
    <TopBar />

    <p class="lead">
      The operator console is now backed by API routes. The dashboard reads from explicit kernel endpoints
      for market, trigger, world-state, swarm-run, capital, ticket, and calibration data.
    </p>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="loading">Loading kernel snapshot…</p>

    <StatStrip v-if="statItems.length" :items="statItems" />

    <main v-if="!loading && !error" class="grid">
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
Drivers: {{ selectedMarket?.primaryDrivers?.join(', ') }}
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
.error { color: #ffb0b0; }
.loading { color: #9db2d1; }
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
