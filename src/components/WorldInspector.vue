<template>
  <div class="world-grid" v-if="worldState">
    <section>
      <h3>Procedural chain</h3>
      <ul><li v-for="item in worldState.proceduralChain" :key="item">{{ item }}</li></ul>
    </section>
    <section>
      <h3>Actors + institutions</h3>
      <ul><li v-for="item in [...worldState.actors, ...worldState.institutions]" :key="item">{{ item }}</li></ul>
    </section>
    <section>
      <h3>Claims</h3>
      <ul><li v-for="item in worldState.claims" :key="item">{{ item }}</li></ul>
    </section>
    <section>
      <h3>Counterclaims</h3>
      <ul><li v-for="item in worldState.counterclaims" :key="item">{{ item }}</li></ul>
    </section>
    <section>
      <h3>Catalysts</h3>
      <ul><li v-for="item in worldState.catalysts" :key="item">{{ item }}</li></ul>
    </section>
    <section>
      <h3>Source audit</h3>
      <ul><li v-for="item in worldState.sourceAudit" :key="item">{{ item }}</li></ul>
    </section>
  </div>
</template>

<script setup>
defineProps({ worldState: Object })
</script>

<style scoped>
.world-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
section { border: 1px solid rgba(149,185,245,0.14); background: rgba(255,255,255,0.03); border-radius: 16px; padding: 14px; }
h3 { margin-top: 0; color: #f3f8ff; }
ul { margin: 0; padding-left: 18px; color: #9fb4d5; }
li + li { margin-top: 8px; }
@media (max-width: 900px) { .world-grid { grid-template-columns: 1fr; } }
</style>
