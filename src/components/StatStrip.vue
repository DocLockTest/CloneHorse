<template>
  <section class="strip">
    <article v-for="item in items" :key="item.label" class="stat">
      <div class="label">{{ item.label }}</div>
      <div class="value">{{ item.value }}</div>
    </article>
  </section>
</template>

<script setup>
defineProps({ items: Array })
</script>

<style scoped>
.strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.stat {
  background: rgba(9, 21, 38, 0.8);
  border: 1px solid rgba(124, 155, 211, 0.18);
  border-radius: 18px;
  padding: 16px;
}
.label {
  color: #86a0c8;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.value {
  color: #f3f8ff;
  margin-top: 8px;
  font-size: 1.35rem;
  font-weight: 700;
}
</style>
