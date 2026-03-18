<template>
  <div class="risk">
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
    <div class="tickets">
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
defineProps({ capital: Object, tickets: Array })
</script>

<style scoped>
.risk { display: grid; gap: 14px; }
.totals, .top { display: flex; gap: 12px; justify-content: space-between; flex-wrap: wrap; }
.totals article, .venue, .ticket { border: 1px solid rgba(149,185,245,0.14); background: rgba(255,255,255,0.03); border-radius: 16px; padding: 14px; }
.totals { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); display: grid; }
.label, small, p { color: #9fb4d5; }
strong, h3 { color: #f3f8ff; margin: 0; }
.venues, .tickets { display: grid; gap: 12px; }
.mode { margin: 0; color: #dfe9ff; }
.pill { border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.06); }
.pill.pending { background: rgba(255, 206, 90, 0.16); color: #ffd26d; }
.pill.draft { background: rgba(86, 174, 255, 0.16); color: #90d2ff; }
</style>
