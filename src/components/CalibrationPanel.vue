<template>
  <div v-if="calibration" class="cal-grid">
    <article><div class="label">Brier</div><strong>{{ calibration.brier }}</strong></article>
    <article><div class="label">Confidence</div><strong>{{ calibration.confidenceCalibration }}</strong></article>
    <article><div class="label">No-trade quality</div><strong>{{ calibration.noTradeQuality }}</strong></article>
    <article><div class="label">Fast rerun p50</div><strong>{{ calibration.fastRerunP50 }}</strong></article>
    <article><div class="label">Deep rerun p50</div><strong>{{ calibration.deepRerunP50 }}</strong></article>
  </div>
</template>

<script setup>
defineProps({ calibration: Object })
</script>

<style scoped>
.cal-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
article { border: 1px solid rgba(149,185,245,0.14); background: rgba(255,255,255,0.03); border-radius: 16px; padding: 14px; }
.label { color: #86a0c8; font-size: 12px; text-transform: uppercase; }
strong { display: block; margin-top: 8px; color: #f3f8ff; }
</style>
