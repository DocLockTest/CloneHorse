<template>
  <div class="agent-list">
    <article v-for="agent in agents" :key="agent.id" class="agent-card">
      <div class="row">
        <h3>{{ agent.name }}</h3>
        <span class="pill">{{ agent.status }}</span>
      </div>
      <p>{{ agent.specialty }}</p>
      <div class="metrics">
        <span>Trust {{ Math.round(agent.trustWeight * 100) }}%</span>
        <span>Accuracy {{ agent.recentAccuracy }}</span>
        <span>Best {{ agent.bestMarketTypes.join(', ') }}</span>
      </div>
    </article>
  </div>
</template>

<script setup>
defineProps({ agents: Array })
</script>

<style scoped>
.agent-list { display: grid; gap: 12px; }
.agent-card { border: 1px solid rgba(149,185,245,0.14); background: rgba(255,255,255,0.03); border-radius: 16px; padding: 14px; }
.row, .metrics { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
h3 { margin: 0 0 8px; color: #f3f8ff; }
p { margin: 0 0 10px; color: #9fb4d5; }
.metrics { color: #86a0c8; font-size: 13px; }
.pill { border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.06); color: #d2def7; }
</style>
