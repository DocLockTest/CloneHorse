<script setup>
defineEmits(['select'])

defineProps({
  markets: Array,
  selectedId: String,
})

function formatSource(source) {
  return source === 'fallback' ? 'seeded fallback' : source ?? 'unknown source'
}

function formatFreshness(state) {
  return state ?? 'unknown'
}
</script>

<template>
  <div class="market-list">
    <button
      v-for="market in markets"
      :key="market.id"
      class="market-card"
      :class="[{ active: market.id === selectedId }, `source-${market.source ?? 'unknown'}`]"
      @click="$emit('select', market.id)"
    >
      <div class="top">
        <strong>{{ market.venue }}</strong>
        <div class="pill-row">
          <span :class="['pill', market.tradability]">{{ market.tradability }}</span>
          <span :class="['pill', 'source-pill', market.source ?? 'unknown']">{{ formatSource(market.source) }}</span>
        </div>
      </div>
      <h3>{{ market.title }}</h3>
      <p>{{ market.subtitle }}</p>
      <div class="grid">
        <span>Market {{ Math.round((market.marketPriceYes ?? 0) * 100) }}¢</span>
        <span>Fair {{ Math.round((market.fairValueYes ?? 0) * 100) }}¢</span>
        <span :class="(market.edge ?? 0) >= 0 ? 'good' : 'bad'">Edge {{ (market.edge ?? 0) >= 0 ? '+' : '' }}{{ Math.round((market.edge ?? 0) * 100) }} pts</span>
        <span>{{ market.confidence }} confidence</span>
      </div>
      <div class="footer-row">
        <small>Snapshot {{ formatFreshness(market.freshness?.state) }} · {{ market.rerunFreshnessSec }}s old</small>
        <small>{{ market.riskState }}</small>
      </div>
    </button>
  </div>
</template>

<style scoped>
.market-list { display: grid; gap: 12px; }
.market-card {
  border: 1px solid rgba(149,185,245,0.14);
  background: rgba(255,255,255,0.03);
  border-radius: 16px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  color: inherit;
}
.market-card.active {
  border-color: rgba(118, 198, 255, 0.6);
  box-shadow: 0 0 0 1px rgba(118, 198, 255, 0.25) inset;
}
.market-card.source-fallback {
  border-color: rgba(255, 145, 145, 0.22);
}
.top, .grid, .footer-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.pill-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: end; }
h3 { margin: 6px 0; color: #f3f8ff; }
p, small { color: #9fb4d5; margin: 0; }
.good { color: #87efb6; }
.bad { color: #ffb0b0; }
.pill {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(255,255,255,0.06);
}
.pill.standard { background: rgba(58, 201, 138, 0.16); color: #87efb6; }
.pill.probe { background: rgba(255, 206, 90, 0.16); color: #ffd26d; }
.pill.watch-only { background: rgba(255,255,255,0.07); color: #d2def7; }
.source-pill.live { background: rgba(86, 174, 255, 0.16); color: #90d2ff; }
.source-pill.fallback { background: rgba(255, 112, 112, 0.16); color: #ffb0b0; }
</style>
