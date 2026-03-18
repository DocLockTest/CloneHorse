<template>
  <header class="topbar">
    <div>
      <div class="eyebrow">MiroFish Fork / Oracle Control</div>
      <h1>MiroFish Oracle</h1>
    </div>
    <div class="actions">
      <button>Run Fast Rerun</button>
      <button class="ghost">Open Swarm Config</button>
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
.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
button {
  border: 1px solid rgba(132, 203, 255, 0.3);
  background: linear-gradient(180deg, #79d1ff, #3e8bff);
  color: #05111d;
  border-radius: 14px;
  padding: 12px 16px;
  font-weight: 700;
  cursor: pointer;
}
.ghost {
  background: rgba(255,255,255,0.04);
  color: #d9e6ff;
}
</style>
