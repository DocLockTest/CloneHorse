<template>
  <section class="panel">
    <div class="panel-head">
      <div>
        <div class="kicker">{{ kicker }}</div>
        <h2>{{ title }}</h2>
      </div>
      <slot name="actions" />
    </div>
    <slot />
  </section>
</template>

<script setup>
defineProps({
  title: String,
  kicker: String,
})
</script>

<style scoped>
.panel {
  background: linear-gradient(180deg, rgba(10, 20, 35, 0.92), rgba(7, 15, 28, 0.96));
  border: 1px solid rgba(120, 160, 220, 0.18);
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.28);
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
  margin-bottom: 16px;
}
.kicker {
  color: #7ca3dd;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  margin-bottom: 4px;
}
h2 {
  color: #eef5ff;
  margin: 0;
  font-size: 1.1rem;
}
</style>
