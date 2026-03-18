<template>
  <div class="feed">
    <article v-for="trigger in triggers" :key="trigger.id" class="item">
      <div class="meta">
        <span>{{ trigger.happenedAt }}</span>
        <span :class="['pill', trigger.status]">{{ trigger.status }}</span>
      </div>
      <h3>{{ trigger.summary }}</h3>
      <p>{{ trigger.source }} · score {{ Math.round(trigger.score * 100) }} · {{ trigger.rerunDecision }}</p>
    </article>
  </div>
</template>

<script setup>
defineProps({ triggers: Array })
</script>

<style scoped>
.feed { display: grid; gap: 12px; }
.item { border: 1px solid rgba(149,185,245,0.14); background: rgba(255,255,255,0.03); border-radius: 16px; padding: 14px; }
.meta { display: flex; justify-content: space-between; gap: 12px; color: #7fa0d6; font-size: 12px; text-transform: uppercase; }
h3 { margin: 6px 0; color: #f3f8ff; font-size: 1rem; }
p { color: #9fb4d5; margin: 0; }
.pill { border-radius: 999px; padding: 5px 10px; font-size: 11px; font-weight: 700; }
.pill.completed { background: rgba(58, 201, 138, 0.16); color: #87efb6; }
.pill.running { background: rgba(86, 174, 255, 0.16); color: #90d2ff; }
.pill.queued { background: rgba(255, 206, 90, 0.16); color: #ffd26d; }
</style>
