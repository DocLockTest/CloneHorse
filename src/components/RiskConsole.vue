<template>
  <div v-if="capital" class="risk">
    <div class="totals">
      <article><div class="label">Total</div><strong>{{ capital.total }}</strong></article>
      <article><div class="label">Available</div><strong>{{ capital.available }}</strong></article>
      <article><div class="label">Locked</div><strong>{{ capital.locked }}</strong></article>
      <article><div class="label">Reserve</div><strong>{{ capital.reserve }}</strong></article>
    </div>
    <p class="mode">Mode: {{ capital.mode }}</p>
    <div class="venues">
      <article v-for="venue in capital.venues" :key="venue.name" class="venue">
        <h3>{{ venue.name }}</h3>
        <p>Balance {{ venue.balance }}</p>
        <p>Exposure {{ venue.exposure }} / {{ venue.maxExposure }}</p>
      </article>
    </div>

    <!-- Live positions from PositionStore -->
    <div v-if="positions.openCount > 0" class="position-summary">
      <div class="summary-row">
        <span class="label">Open positions</span>
        <strong>{{ positions.openCount }}</strong>
      </div>
      <div class="summary-row">
        <span class="label">Total exposure</span>
        <strong>${{ positions.totalExposure }}</strong>
      </div>
      <div class="summary-row">
        <span class="label">Total cost</span>
        <strong>${{ positions.totalCost?.toFixed(2) }}</strong>
      </div>
      <div class="summary-row">
        <span class="label">Unrealized P&amp;L</span>
        <strong :class="positions.totalUnrealizedPnL >= 0 ? 'positive' : 'negative'">
          {{ positions.totalUnrealizedPnL >= 0 ? '+' : '' }}${{ positions.totalUnrealizedPnL?.toFixed(2) }}
        </strong>
      </div>
    </div>

    <div v-if="positions.positions?.length" class="tickets">
      <article v-for="pos in positions.positions" :key="pos.ticketId" class="ticket">
        <div class="top">
          <strong>{{ pos.ticketId }}</strong>
          <span :class="['pill', pos.side?.toLowerCase()]">{{ pos.side }}</span>
          <span class="pill open">{{ pos.status }}</span>
        </div>
        <h3>{{ pos.venue }} · {{ pos.title }}</h3>
        <div class="pnl-row">
          <span class="label">Entry {{ cents(pos.entryPrice) }}¢</span>
          <span class="label">Current {{ cents(pos.currentSidePrice) }}¢</span>
          <span :class="pos.unrealizedPnL >= 0 ? 'positive' : 'negative'">
            {{ pos.unrealizedPnL >= 0 ? '+' : '' }}${{ pos.unrealizedPnL?.toFixed(2) }}
            ({{ pos.unrealizedPnLPct >= 0 ? '+' : '' }}{{ (pos.unrealizedPnLPct * 100).toFixed(1) }}%)
          </span>
        </div>
        <small>Size ${{ pos.size }}</small>
      </article>
    </div>

    <!-- Legacy static tickets (from kernel data) -->
    <div v-if="tickets?.length && !positions.positions?.length" class="tickets">
      <article v-for="ticket in tickets" :key="ticket.id" class="ticket">
        <div class="top">
          <strong>{{ ticket.id }}</strong>
          <span :class="['pill', ticket.approvalState]">{{ ticket.approvalState }}</span>
        </div>
        <h3>{{ ticket.venue }} {{ ticket.side }} · {{ ticket.targetPriceRange }}</h3>
        <p>{{ ticket.thesis }}</p>
        <small>Max size {{ ticket.maxSize }} · expires {{ ticket.expiry }}</small>
      </article>
    </div>
  </div>
</template>

<script setup>
defineProps({
  capital: Object,
  tickets: Array,
  positions: { type: Object, default: () => ({ openCount: 0, positions: [] }) },
})

function cents(price) {
  return Math.round((price ?? 0) * 100)
}
</script>

<style scoped>
.risk { display: grid; gap: 14px; }
.totals, .top { display: flex; gap: 12px; justify-content: space-between; flex-wrap: wrap; }
.totals article, .venue, .ticket, .position-summary { border: 1px solid rgba(149,185,245,0.14); background: rgba(255,255,255,0.03); border-radius: 16px; padding: 14px; }
.totals { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); display: grid; }
.label, small, p { color: #9fb4d5; }
strong, h3 { color: #f3f8ff; margin: 0; }
.venues, .tickets { display: grid; gap: 12px; }
.mode { margin: 0; color: #dfe9ff; }
.pill { border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.06); }
.pill.pending { background: rgba(255, 206, 90, 0.16); color: #ffd26d; }
.pill.draft { background: rgba(86, 174, 255, 0.16); color: #90d2ff; }
.pill.yes { background: rgba(58, 201, 138, 0.16); color: #8af1be; }
.pill.no { background: rgba(255, 134, 134, 0.14); color: #ffb0b0; }
.pill.open { background: rgba(86, 174, 255, 0.12); color: #90d2ff; }
.position-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.summary-row { display: flex; flex-direction: column; gap: 4px; }
.pnl-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
.positive { color: #8af1be; }
.negative { color: #ffb0b0; }
</style>
