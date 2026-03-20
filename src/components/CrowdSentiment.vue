<template>
  <div class="crowd">
    <!-- Controls -->
    <div class="controls">
      <button class="btn run" :disabled="status === 'running'" @click="$emit('run')">
        {{ status === 'running' ? 'Simulating...' : 'Run simulation' }}
      </button>
      <span v-if="status" class="status-pill" :class="status">{{ status }}</span>
      <span v-if="signal?.agentCount" class="meta">{{ signal.agentCount }} agents · {{ signal.completedTicks }} ticks</span>
    </div>

    <!-- No signal yet -->
    <div v-if="!signal" class="empty">
      <span>No simulation results yet. Select a market and run.</span>
    </div>

    <!-- Signal results -->
    <template v-if="signal">
      <!-- EV + recommendation -->
      <div class="signal-header">
        <div class="ev-box" :class="signal.ev >= 0 ? 'positive' : 'negative'">
          <div class="ev-label">EV</div>
          <div class="ev-value">{{ signal.ev >= 0 ? '+' : '' }}{{ (signal.ev * 100).toFixed(1) }}¢</div>
        </div>
        <div class="side-box" :class="signal.side.toLowerCase()">
          <div class="side-label">Signal</div>
          <div class="side-value">{{ signal.side }}</div>
        </div>
        <div class="conf-box">
          <div class="conf-label">Confidence</div>
          <div class="conf-value">{{ Math.round(signal.signalConfidence * 100) }}%</div>
        </div>
        <div class="consensus-box">
          <div class="consensus-label">Consensus</div>
          <div class="consensus-value">{{ Math.round(signal.consensus * 100) }}%</div>
        </div>
      </div>

      <!-- Probability -->
      <div class="prob-row">
        <div class="prob">
          <span class="prob-label">Raw pYes</span>
          <span class="prob-value">{{ Math.round(signal.rawPYes * 100) }}%</span>
        </div>
        <div class="prob">
          <span class="prob-label">Weighted pYes</span>
          <span class="prob-value">{{ Math.round(signal.weightedPYes * 100) }}%</span>
        </div>
        <div class="prob">
          <span class="prob-label">Polarization</span>
          <span class="prob-value">{{ (signal.polarization * 100).toFixed(1) }}%</span>
        </div>
        <div class="prob">
          <span class="prob-label">Volatility</span>
          <span class="prob-value">{{ (signal.volatility * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <!-- Faction breakdown -->
      <div class="factions">
        <h4>Factions</h4>
        <div class="faction-bars">
          <div v-for="(value, name) in signal.factionBreakdown" :key="name" class="faction">
            <div class="faction-bar" :style="{ width: Math.round(value * 100) + '%' }" :class="name" />
            <span class="faction-label">{{ formatFaction(name) }} {{ Math.round(value * 100) }}%</span>
          </div>
        </div>
      </div>

      <!-- Expert divergence -->
      <div v-if="signal.expertDivergence" class="divergence">
        <h4>Expert divergence</h4>
        <div class="expert-grid">
          <div v-for="(data, group) in signal.expertDivergence" :key="group" class="expert-card">
            <div class="expert-name">{{ group }}</div>
            <div class="expert-pyes">{{ Math.round(data.pYes * 100) }}% YES</div>
            <div class="expert-conf">conf {{ Math.round(data.avgConfidence * 100) }}%</div>
            <div class="expert-count">n={{ data.count }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  signal: { type: Object, default: null },
  status: { type: String, default: '' },
})

defineEmits(['run'])

function formatFaction(name) {
  const labels = {
    bullCoalition: 'Bull',
    bearAlliance: 'Bear',
    contrarians: 'Contrarian',
    neutralMass: 'Neutral',
    volHawk: 'Vol Hawk',
  }
  return labels[name] ?? name
}
</script>

<style scoped>
.crowd { display: grid; gap: 14px; }
.controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.btn.run {
  background: linear-gradient(180deg, #b47aff, #7c3aed); color: #fff;
  border: none; border-radius: 12px; padding: 10px 18px; font-weight: 700; cursor: pointer;
}
.btn.run:disabled { opacity: 0.5; cursor: not-allowed; }
.status-pill { border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
.status-pill.running { background: rgba(255, 206, 90, 0.16); color: #ffd26d; }
.status-pill.completed { background: rgba(58, 201, 138, 0.16); color: #8af1be; }
.status-pill.error { background: rgba(255, 134, 134, 0.14); color: #ffb0b0; }
.status-pill.idle { background: rgba(255,255,255,0.06); color: #d2def7; }
.meta { color: #7b94b8; font-size: 12px; }
.empty { color: #7b94b8; font-size: 13px; padding: 18px; border: 1px dashed rgba(149,185,245,0.2); border-radius: 16px; }

.signal-header {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px;
}
.ev-box, .side-box, .conf-box, .consensus-box {
  border: 1px solid rgba(149,185,245,0.14); border-radius: 14px; padding: 14px; text-align: center;
  background: rgba(255,255,255,0.03);
}
.ev-label, .side-label, .conf-label, .consensus-label { color: #7b94b8; font-size: 11px; margin-bottom: 4px; }
.ev-value, .side-value, .conf-value, .consensus-value { font-size: 22px; font-weight: 700; color: #f3f8ff; }
.ev-box.positive .ev-value { color: #8af1be; }
.ev-box.negative .ev-value { color: #ffb0b0; }
.side-box.yes { border-color: rgba(58, 201, 138, 0.3); }
.side-box.no { border-color: rgba(255, 134, 134, 0.3); }
.side-box.yes .side-value { color: #8af1be; }
.side-box.no .side-value { color: #ffb0b0; }
.side-box.neutral .side-value { color: #d2def7; }

.prob-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; }
.prob { border: 1px solid rgba(149,185,245,0.1); border-radius: 12px; padding: 10px; background: rgba(255,255,255,0.02); }
.prob-label { display: block; color: #7b94b8; font-size: 11px; margin-bottom: 4px; }
.prob-value { color: #d7e5ff; font-size: 15px; font-weight: 600; }

h4 { color: #9db2d1; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
.faction-bars { display: grid; gap: 6px; }
.faction { display: flex; align-items: center; gap: 10px; }
.faction-bar { height: 8px; border-radius: 4px; min-width: 4px; }
.faction-bar.bullCoalition { background: #8af1be; }
.faction-bar.bearAlliance { background: #ffb0b0; }
.faction-bar.contrarians { background: #ffd26d; }
.faction-bar.neutralMass { background: #7b94b8; }
.faction-bar.volHawk { background: #b47aff; }
.faction-label { color: #9db2d1; font-size: 12px; }

.expert-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
.expert-card {
  border: 1px solid rgba(149,185,245,0.12); border-radius: 12px; padding: 12px;
  background: rgba(255,255,255,0.02); text-align: center;
}
.expert-name { color: #d7e5ff; font-size: 13px; font-weight: 600; text-transform: capitalize; margin-bottom: 6px; }
.expert-pyes { color: #f3f8ff; font-size: 18px; font-weight: 700; }
.expert-conf { color: #7b94b8; font-size: 11px; }
.expert-count { color: #5a7098; font-size: 10px; }
</style>
