<template>
  <div class="replay" v-if="run">
    <div class="summary-row">
      <div>
        <div class="label">Mode</div>
        <strong>{{ run.mode }}</strong>
      </div>
      <div>
        <div class="label">Disagreement</div>
        <strong>{{ Math.round(run.disagreementScore * 100) }}%</strong>
      </div>
      <div>
        <div class="label">Output</div>
        <strong>{{ run.output?.action ?? '—' }}</strong>
      </div>
    </div>
    <p class="summary">{{ run.finalSummary }}</p>
    <div class="rounds">
      <article v-for="round in run.rounds" :key="round.name" class="round">
        <h3>{{ round.name }}</h3>
        <p>{{ round.note }}</p>
      </article>
    </div>
  </div>
</template>

<script setup>
defineProps({ run: Object })
</script>

<style scoped>
.summary-row { display: flex; gap: 18px; flex-wrap: wrap; }
.label { color: #86a0c8; font-size: 12px; text-transform: uppercase; }
strong { color: #f3f8ff; display: block; margin-top: 6px; }
.summary { color: #dfe9ff; line-height: 1.6; }
.rounds { display: grid; gap: 12px; }
.round { border: 1px solid rgba(149,185,245,0.14); background: rgba(255,255,255,0.03); border-radius: 16px; padding: 14px; }
h3 { margin: 0 0 8px; color: #f3f8ff; }
p { margin: 0; color: #9fb4d5; }
</style>
