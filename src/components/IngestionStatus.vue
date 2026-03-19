<script setup>
const props = defineProps({
  health: Object,
  freshness: Object,
  errors: Array,
})

function formatRelativeTime(ageMs) {
  if (!Number.isFinite(ageMs)) return 'No captured snapshot'
  const seconds = Math.round(ageMs / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function stateLabel(status) {
  return {
    ready: 'Live',
    refreshing: 'Refreshing',
    degraded: 'Degraded',
    'stale-cache': 'Cached',
    fallback: 'Fallback',
    cold: 'Cold',
  }[status] ?? 'Unknown'
}

function stateSummary(status) {
  return {
    ready: 'Venue ingestion is healthy.',
    refreshing: 'Refresh in flight. Last good snapshot remains in use.',
    degraded: 'Partial venue failure. Showing live data with missing coverage.',
    'stale-cache': 'Live pull failed. Holding the last stored snapshot inside TTL.',
    fallback: 'Live pull unavailable. Seeded internal markets are on screen.',
    cold: 'No ingestion snapshot loaded yet.',
  }[status] ?? 'Ingestion state unavailable.'
}
</script>

<template>
  <section class="status-shell">
    <header class="status-head">
      <div>
        <div class="kicker">Ingestion status</div>
        <h3>{{ stateLabel(health?.status) }}</h3>
      </div>
      <span :class="['state-pill', health?.status]">{{ health?.source ?? 'unknown source' }}</span>
    </header>

    <p class="summary">{{ stateSummary(health?.status) }}</p>

    <div class="metrics">
      <article>
        <span class="label">Freshness</span>
        <strong>{{ freshness?.state ?? health?.freshness ?? 'unknown' }}</strong>
        <small>{{ formatRelativeTime(health?.snapshotAgeMs ?? freshness?.ageMs) }}</small>
      </article>
      <article>
        <span class="label">Last success</span>
        <strong>{{ health?.snapshotCapturedAt ? 'Captured' : 'Missing' }}</strong>
        <small>{{ health?.snapshotCapturedAt ?? 'No snapshot on disk' }}</small>
      </article>
      <article>
        <span class="label">Coverage</span>
        <strong>{{ health?.marketCount ?? 0 }} markets</strong>
        <small>{{ health?.consecutiveFailures ?? 0 }} consecutive failures</small>
      </article>
      <article>
        <span class="label">Refresh time</span>
        <strong>{{ formatDuration(health?.lastDurationMs) }}</strong>
        <small>TTL {{ Math.round((health?.ttlMs ?? 0) / 60000) }}m</small>
      </article>
    </div>

    <div v-if="(errors?.length ?? 0) || health?.lastError" class="errors">
      <div class="label">Operator note</div>
      <p>{{ errors?.[0] ?? health?.lastError }}</p>
    </div>
  </section>
</template>

<style scoped>
.status-shell {
  display: grid;
  gap: 14px;
  border: 1px solid rgba(149, 185, 245, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
}
.status-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
}
.kicker,
.label {
  color: #86a0c8;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
h3 {
  margin: 6px 0 0;
  color: #f3f8ff;
  font-size: 1.1rem;
}
.summary,
small,
p {
  margin: 0;
  color: #9fb4d5;
  line-height: 1.5;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}
.metrics article,
.errors {
  border: 1px solid rgba(149, 185, 245, 0.12);
  background: rgba(8, 16, 29, 0.55);
  border-radius: 14px;
  padding: 12px;
}
strong {
  display: block;
  margin: 8px 0 4px;
  color: #eef5ff;
}
.state-pill {
  border-radius: 999px;
  padding: 7px 11px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.07);
  color: #d9e6ff;
}
.state-pill.ready,
.state-pill.refreshing { background: rgba(58, 201, 138, 0.16); color: #87efb6; }
.state-pill.degraded,
.state-pill.stale-cache { background: rgba(255, 206, 90, 0.16); color: #ffd26d; }
.state-pill.fallback,
.state-pill.cold { background: rgba(255, 112, 112, 0.16); color: #ffb0b0; }
</style>
