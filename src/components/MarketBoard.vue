<template>
  <div class="market-list">
    <button
      v-for="market in markets"
      :key="market.id"
      class="market-card"
      :class="{ active: market.id === selectedId }"
      @click="$emit('select', market.id)"
    >
      <div class="top">
        <strong>{{ market.venue }}</strong>
        <span :class="['pill', market.tradability]">{{ market.tradability }}</span>
      </div>
      <h3>{{ market.title }}</h3>
      <p>{{ market.subtitle }}</p>
      <div class="grid">
        <span>Market {{ Math.round(market.marketPriceYes * 100) }}¢</span>
        <span>Fair {{ Math.round(market.fairValueYes * 100) }}¢</span>
        <span :class="market.edge >= 0 ? 'good' : 'bad'">Edge {{ market.edge >= 0 ? '+' : '' }}{{ Math.round(market.edge * 100) }} pts</span>
        <span>{{ market.confidence }} confidence</span>
      </div>
      <small>Rerun freshness {{ market.rerunFreshnessSec }}s · {{ market.riskState }}</small>
    </button>
  </div>
</template>

<script setup>
defineProps({
  markets: Array,
  selectedId: String,
})
</script>

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
.top, .grid { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
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
</style>
