<template>
  <div class="gate">
    <div v-if="!tickets.length" class="empty">
      <span class="empty-icon">✓</span>
      <span>No pending approvals</span>
    </div>

    <article v-for="ticket in tickets" :key="ticket.id" class="ticket-card">
      <header>
        <div class="ticket-meta">
          <strong class="ticket-id">{{ ticket.id }}</strong>
          <span class="venue-pill">{{ ticket.venue }}</span>
          <span class="side-pill" :class="ticket.side.toLowerCase()">{{ ticket.side }}</span>
        </div>
        <time class="created">{{ formatTime(ticket.createdAt) }}</time>
      </header>

      <h3 class="title">{{ ticket.title }}</h3>

      <div class="metrics">
        <div class="metric">
          <span class="metric-label">Entry</span>
          <span class="metric-value">{{ cents(ticket.entryPrice) }}¢</span>
        </div>
        <div class="metric">
          <span class="metric-label">Fair value</span>
          <span class="metric-value">{{ cents(ticket.fairValue) }}¢</span>
        </div>
        <div class="metric">
          <span class="metric-label">Edge</span>
          <span class="metric-value" :class="ticket.edge > 0 ? 'positive' : 'negative'">
            {{ ticket.edge > 0 ? '+' : '' }}{{ pts(ticket.edge) }} pts
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">EV</span>
          <span class="metric-value" :class="ticket.ev >= 0 ? 'positive' : 'negative'">
            {{ ticket.ev >= 0 ? '+' : '' }}{{ (ticket.ev * 100).toFixed(1) }}¢
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">Max size</span>
          <span class="metric-value">${{ ticket.maxSize }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Trigger</span>
          <span class="metric-value">{{ ticket.triggerType }} ({{ Math.round((ticket.triggerScore ?? 0) * 100) }}%)</span>
        </div>
      </div>

      <p class="thesis">{{ ticket.thesis }}</p>

      <div class="actions">
        <button class="btn approve" :disabled="busy" @click="$emit('approve', ticket.id)">
          Approve
        </button>
        <button class="btn reject" :disabled="busy" @click="handleReject(ticket.id)">
          Reject
        </button>
      </div>
    </article>
  </div>
</template>

<script setup>
const props = defineProps({
  tickets: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['approve', 'reject'])

function cents(price) {
  return Math.round((price ?? 0) * 100)
}

function pts(edge) {
  return Math.round(Math.abs(edge) * 100)
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function handleReject(ticketId) {
  const reason = prompt('Rejection reason (optional):')
  emit('reject', ticketId, reason ?? '')
}
</script>

<style scoped>
.gate { display: grid; gap: 14px; }
.empty {
  display: flex; align-items: center; gap: 10px;
  color: #8af1be; font-size: 14px; padding: 18px;
  border: 1px dashed rgba(138, 241, 190, 0.25); border-radius: 16px;
  background: rgba(58, 201, 138, 0.06);
}
.empty-icon { font-size: 18px; }

.ticket-card {
  border: 1px solid rgba(149,185,245,0.14);
  background: rgba(255,255,255,0.03);
  border-radius: 16px; padding: 16px;
  display: grid; gap: 12px;
}

header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.ticket-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ticket-id { color: #d7e5ff; font-size: 13px; font-family: monospace; }
.created { color: #7b94b8; font-size: 12px; }

.venue-pill, .side-pill {
  border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase;
}
.venue-pill { background: rgba(86, 174, 255, 0.12); color: #90d2ff; }
.side-pill.yes { background: rgba(58, 201, 138, 0.16); color: #8af1be; }
.side-pill.no { background: rgba(255, 134, 134, 0.14); color: #ffb0b0; }

.title { color: #f3f8ff; font-size: 15px; margin: 0; line-height: 1.4; }

.metrics {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
}
.metric {
  border: 1px solid rgba(149,185,245,0.1); border-radius: 12px;
  padding: 10px; background: rgba(255,255,255,0.02);
}
.metric-label { display: block; color: #7b94b8; font-size: 11px; margin-bottom: 4px; }
.metric-value { color: #d7e5ff; font-size: 14px; font-weight: 600; }
.metric-value.positive { color: #8af1be; }
.metric-value.negative { color: #ffb0b0; }

.thesis { color: #9db2d1; font-size: 13px; line-height: 1.5; margin: 0; }

.actions { display: flex; gap: 10px; }
.btn {
  flex: 1; padding: 10px 16px; border: none; border-radius: 12px;
  font-weight: 700; font-size: 13px; cursor: pointer; transition: opacity 0.15s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.approve {
  background: linear-gradient(180deg, #5ee8a8, #2da86b); color: #051a0f;
}
.btn.reject {
  background: rgba(255, 134, 134, 0.14); color: #ffb0b0;
  border: 1px solid rgba(255, 134, 134, 0.25);
}
</style>
