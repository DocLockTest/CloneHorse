<script setup>
import { computed } from 'vue'

const props = defineProps({
  ingestion: {
    type: Object,
    default: null,
  },
})

const modeLabel = computed(() => {
  if (!props.ingestion) return 'Checking live spine'
  if (props.ingestion.mode === 'fallback') return 'Fallback mode'
  if (props.ingestion.degraded) return 'Live mode · degraded'
  return 'Live mode'
})

const tone = computed(() => {
  if (!props.ingestion) return 'checking'
  if (props.ingestion.mode === 'fallback') return 'fallback'
  if (props.ingestion.degraded) return 'degraded'
  return 'healthy'
})

function formatAgo(value) {
  if (!value) return 'No recent success'
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}
</script>

<template>
  <section v-if="ingestion" class="status-shell" :class="tone">
    <div class="headline-row">
      <div>
        <div class="eyebrow">Market spine status</div>
        <h2>{{ modeLabel }}</h2>
      </div>
      <div class="summary-metrics">
        <div>
          <span>Sources up</span>
          <strong>{{ ingestion.liveSourceCount }}/{{ ingestion.totalSourceCount }}</strong>
        </div>
        <div>
          <span>Focused markets</span>
          <strong>{{ ingestion.mode === 'live' ? ingestion.liveMarketCount : ingestion.fallbackMarketCount }}</strong>
        </div>
      </div>
    </div>

    <p class="note">{{ ingestion.operatorNote }}</p>

    <div class="sources">
      <article v-for="source in ingestion.sourceStates" :key="source.name" class="source-card" :class="source.status">
        <div class="source-top">
          <strong>{{ source.name }}</strong>
          <span class="state-pill">{{ source.status }}</span>
        </div>
        <dl>
          <div>
            <dt>Markets</dt>
            <dd>{{ source.marketCount }}</dd>
          </div>
          <div>
            <dt>Last good</dt>
            <dd>{{ formatAgo(source.lastSuccessAt) }}</dd>
          </div>
          <div>
            <dt>Latency</dt>
            <dd>{{ source.durationMs != null ? `${source.durationMs}ms` : '—' }}</dd>
          </div>
        </dl>
        <p v-if="source.error" class="error">{{ source.error }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.status-shell {
  margin: 18px 0 24px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(122, 160, 215, 0.2);
  background: linear-gradient(180deg, rgba(9, 20, 36, 0.82), rgba(8, 18, 32, 0.94));
}
.status-shell.healthy { box-shadow: 0 0 0 1px rgba(89, 221, 167, 0.08) inset; }
.status-shell.degraded { box-shadow: 0 0 0 1px rgba(255, 204, 102, 0.1) inset; }
.status-shell.fallback { box-shadow: 0 0 0 1px rgba(255, 134, 134, 0.12) inset; }
.headline-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
  flex-wrap: wrap;
}
.eyebrow {
  color: #7ca3dd;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  margin-bottom: 6px;
}
h2 { margin: 0; color: #eef5ff; font-size: 1.35rem; }
.note { color: #a9bbd8; line-height: 1.6; margin: 12px 0 0; max-width: 920px; }
.summary-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 10px;
}
.summary-metrics div,
.source-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(149,185,245,0.14);
  border-radius: 16px;
  padding: 12px 14px;
}
.summary-metrics span,
dt { color: #87a0c4; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
.summary-metrics strong { display: block; color: #f5f8ff; margin-top: 7px; font-size: 1.2rem; }
.sources {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.source-top { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
dl { margin: 12px 0 0; display: grid; gap: 10px; }
dl div { display: flex; justify-content: space-between; gap: 12px; }
dd { margin: 0; color: #e8f0ff; }
.state-pill {
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(255,255,255,0.06);
}
.source-card.live .state-pill { background: rgba(58, 201, 138, 0.14); color: #8af1be; }
.source-card.degraded .state-pill,
.source-card.checking .state-pill { background: rgba(255, 206, 90, 0.14); color: #ffd26d; }
.source-card.down .state-pill { background: rgba(255, 134, 134, 0.14); color: #ffb0b0; }
.error { color: #ffb0b0; margin: 12px 0 0; font-size: 0.92rem; line-height: 1.45; }
@media (max-width: 700px) {
  .summary-metrics { width: 100%; }
}
</style>
