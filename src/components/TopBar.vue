<script setup>
defineProps({
  status: {
    type: String,
    default: 'cold',
  },
  freshness: {
    type: String,
    default: 'cold',
  },
  source: {
    type: String,
    default: 'none',
  },
})

function statusLabel(status) {
  return {
    ready: 'Live',
    refreshing: 'Refreshing',
    degraded: 'Degraded',
    'stale-cache': 'Cached',
    fallback: 'Fallback',
    cold: 'Cold',
  }[status] ?? 'Unknown'
}
</script>

<template>
  <header class="topbar">
    <div>
      <div class="eyebrow">MiroFish Fork / Oracle Control</div>
      <h1>MiroFish Oracle</h1>
      <p class="subhead">Operator view for venue ingestion, rerun state, and approval-gated action.</p>
    </div>

    <div class="status-cluster">
      <div :class="['status-pill', status]">{{ statusLabel(status) }}</div>
      <div class="meta-pill">{{ source }}</div>
      <div class="meta-pill">{{ freshness }}</div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
}
.eyebrow {
  color: #7b91b2;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 11px;
  margin-bottom: 8px;
}
h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.25rem);
  color: #f4f8ff;
}
.subhead {
  margin: 10px 0 0;
  color: #9db2d1;
  max-width: 680px;
  line-height: 1.5;
}
.status-cluster {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: end;
}
.status-pill,
.meta-pill {
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  border: 1px solid rgba(132, 203, 255, 0.18);
  background: rgba(255,255,255,0.04);
  color: #d9e6ff;
}
.status-pill.ready,
.status-pill.refreshing {
  background: rgba(58, 201, 138, 0.16);
  color: #87efb6;
}
.status-pill.degraded,
.status-pill.stale-cache {
  background: rgba(255, 206, 90, 0.16);
  color: #ffd26d;
}
.status-pill.fallback,
.status-pill.cold {
  background: rgba(255, 112, 112, 0.16);
  color: #ffb0b0;
}
@media (max-width: 900px) {
  .topbar { align-items: start; flex-direction: column; }
  .status-cluster { justify-content: start; }
}
</style>
