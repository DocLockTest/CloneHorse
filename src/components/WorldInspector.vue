<template>
  <div v-if="!worldState" class="empty-state">
    Select a market to inspect its current world-state scaffold.
  </div>

  <div v-else class="world-shell">
    <section class="hero-card">
      <div>
        <p class="eyebrow">World-state spine</p>
        <h3>{{ worldState.summary?.headline ?? 'Current operator view' }}</h3>
        <p class="summary-copy">{{ worldState.summary?.body ?? 'Structured scaffold only. This surface shows what is currently modeled, what is generated, and where source confidence is thin.' }}</p>
      </div>
      <div class="hero-meta">
        <span class="pill">{{ worldState.categoryLabel ?? worldState.category ?? 'uncategorized' }}</span>
        <span class="pill" :class="worldState.summary?.confidence ?? 'partial'">{{ worldState.summary?.confidence ?? 'partial coverage' }}</span>
        <span class="pill quiet">{{ worldState.summary?.evidenceMode ?? 'deterministic scaffold' }}</span>
      </div>
    </section>

    <section class="panel procedural-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Procedural chain</p>
          <h4>Generated sequence, not deep swarm fiction</h4>
        </div>
        <span class="muted">{{ proceduralSteps.length }} steps</span>
      </div>
      <ol class="chain-list">
        <li v-for="(step, index) in proceduralSteps" :key="step.label + index" class="chain-item">
          <div class="chain-index">{{ index + 1 }}</div>
          <div class="chain-body">
            <div class="chain-row">
              <strong>{{ step.label }}</strong>
              <span class="pill mini" :class="step.status ?? 'observed'">{{ step.status ?? 'observed' }}</span>
            </div>
            <p>{{ step.note }}</p>
            <div class="tag-row">
              <span v-if="step.stage" class="tag">stage: {{ step.stage }}</span>
              <span v-if="step.basis" class="tag">basis: {{ step.basis }}</span>
              <span v-if="step.sourceType" class="tag">source: {{ step.sourceType }}</span>
            </div>
          </div>
        </li>
      </ol>
    </section>

    <div class="world-grid">
      <section class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Actors and institutions</p>
            <h4>Who currently matters</h4>
          </div>
        </div>
        <div class="two-col-list">
          <div>
            <div class="list-label">Actors</div>
            <ul class="bullet-list">
              <li v-for="item in worldState.actors ?? []" :key="`actor-${item}`">{{ item }}</li>
            </ul>
          </div>
          <div>
            <div class="list-label">Institutions</div>
            <ul class="bullet-list">
              <li v-for="item in worldState.institutions ?? []" :key="`inst-${item}`">{{ item }}</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Catalysts</p>
            <h4>Upcoming repricing windows</h4>
          </div>
          <span class="muted">{{ catalystItems.length }} tracked</span>
        </div>
        <div class="stack-list">
          <article v-for="(item, index) in catalystItems" :key="item.label + index" class="stack-card">
            <div class="chain-row">
              <strong>{{ item.label }}</strong>
              <span class="pill mini" :class="item.urgency ?? 'watch'">{{ item.urgency ?? 'watch' }}</span>
            </div>
            <p>{{ item.note }}</p>
            <div class="tag-row">
              <span v-if="item.window" class="tag">window: {{ item.window }}</span>
              <span v-if="item.triggerType" class="tag">type: {{ item.triggerType }}</span>
              <span v-if="item.watcher" class="tag">watcher: {{ item.watcher }}</span>
            </div>
          </article>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Claims</p>
            <h4>Current market-facing thesis</h4>
          </div>
        </div>
        <div class="stack-list">
          <article v-for="(item, index) in claimItems" :key="item.text + index" class="stack-card">
            <div class="chain-row">
              <strong>{{ item.text }}</strong>
              <span class="pill mini" :class="item.conviction ?? 'medium'">{{ item.conviction ?? 'medium' }}</span>
            </div>
            <p>{{ item.basis }}</p>
          </article>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Counterclaims</p>
            <h4>What could break the read</h4>
          </div>
        </div>
        <div class="stack-list">
          <article v-for="(item, index) in counterclaimItems" :key="item.text + index" class="stack-card">
            <div class="chain-row">
              <strong>{{ item.text }}</strong>
              <span class="pill mini quiet">{{ item.risk ?? 'watch' }}</span>
            </div>
            <p>{{ item.condition }}</p>
          </article>
        </div>
      </section>

      <section class="panel audit-panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Source audit</p>
            <h4>What the surface is actually leaning on</h4>
          </div>
          <span class="muted">{{ auditItems.length }} sources</span>
        </div>
        <div class="stack-list">
          <article v-for="(item, index) in auditItems" :key="item.label + index" class="stack-card audit-card">
            <div class="chain-row">
              <strong>{{ item.label }}</strong>
              <span class="pill mini" :class="item.confidenceClass">{{ item.confidenceLabel }}</span>
            </div>
            <p>{{ item.note }}</p>
            <div class="tag-row">
              <span v-if="item.kind" class="tag">kind: {{ item.kind }}</span>
              <span v-if="item.recency" class="tag">recency: {{ item.recency }}</span>
              <span v-if="item.usage" class="tag">used for: {{ item.usage }}</span>
            </div>
          </article>
        </div>
      </section>

      <section class="panel structured-panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Category view</p>
            <h4>{{ categoryHeading }}</h4>
          </div>
          <span class="muted">{{ structuredItems.length }} fields</span>
        </div>
        <div class="structured-list">
          <article v-for="item in structuredItems" :key="item.label" class="structured-row">
            <div>
              <div class="list-label">{{ item.label }}</div>
              <p>{{ item.value }}</p>
            </div>
            <span v-if="item.emphasis" class="pill mini quiet">{{ item.emphasis }}</span>
          </article>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Linked markets</p>
            <h4>Visible spillover, if any</h4>
          </div>
        </div>
        <ul class="bullet-list">
          <li v-for="item in worldState.linkedMarkets ?? []" :key="item">{{ item }}</li>
          <li v-if="!(worldState.linkedMarkets ?? []).length" class="muted">No linked market cluster modeled yet.</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ worldState: Object })

const proceduralSteps = computed(() => {
  const items = props.worldState?.proceduralChain ?? []
  return items.map((item) => (typeof item === 'string'
    ? { label: item, note: 'Legacy scaffold item', status: 'observed', basis: 'stored baseline' }
    : item))
})

const catalystItems = computed(() => {
  const items = props.worldState?.catalysts ?? []
  return items.map((item) => (typeof item === 'string'
    ? { label: item, note: 'Legacy catalyst entry', urgency: 'watch' }
    : item))
})

const claimItems = computed(() => {
  const items = props.worldState?.claims ?? []
  return items.map((item) => (typeof item === 'string'
    ? { text: item, basis: 'Stored baseline claim', conviction: 'medium' }
    : item))
})

const counterclaimItems = computed(() => {
  const items = props.worldState?.counterclaims ?? []
  return items.map((item) => (typeof item === 'string'
    ? { text: item, condition: 'Tracked as unresolved counterpressure.', risk: 'watch' }
    : item))
})

const auditItems = computed(() => {
  const items = props.worldState?.sourceAudit ?? []
  return items.map((item) => {
    if (typeof item === 'string') {
      const lowered = item.toLowerCase()
      const confidenceLabel = lowered.includes('high') ? 'high confidence' : lowered.includes('medium') ? 'medium confidence' : 'partial confidence'
      const confidenceClass = lowered.includes('high') ? 'high' : lowered.includes('medium') ? 'medium' : 'partial'
      return {
        label: item,
        note: 'Legacy audit line',
        confidenceLabel,
        confidenceClass,
      }
    }
    return {
      ...item,
      confidenceLabel: item.confidenceLabel ?? `${item.confidence ?? 'partial'} confidence`,
      confidenceClass: item.confidenceClass ?? item.confidence ?? 'partial',
    }
  })
})

const categoryHeading = computed(() => props.worldState?.categoryView?.title ?? 'Category-specific structured read')
const structuredItems = computed(() => props.worldState?.categoryView?.items ?? [])
</script>

<style scoped>
.world-shell { display: grid; gap: 14px; }
.world-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.panel, .hero-card {
  border: 1px solid rgba(149,185,245,0.14);
  background: rgba(255,255,255,0.03);
  border-radius: 16px;
  padding: 14px;
}
.hero-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.hero-card h3, .panel h4 { margin: 0; color: #f3f8ff; }
.summary-copy, .panel p, .structured-row p { color: #9fb4d5; }
.panel-head, .chain-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.eyebrow, .list-label {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7f95b8;
}
.hero-meta, .tag-row { display: flex; gap: 8px; flex-wrap: wrap; }
.pill, .tag {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  border: 1px solid rgba(149,185,245,0.16);
  background: rgba(255,255,255,0.05);
  color: #d7e5ff;
}
.pill.mini { padding: 4px 8px; }
.pill.high, .pill.confirmed, .pill.imminent, .pill.observed { color: #8af1be; background: rgba(58, 201, 138, 0.14); }
.pill.medium, .pill.watch, .pill.partial { color: #ffd26d; background: rgba(255, 206, 90, 0.16); }
.pill.low, .pill.at-risk, .pill.pending { color: #ffb0b0; background: rgba(255, 134, 134, 0.14); }
.pill.quiet { color: #c7d4ea; }
.muted { color: #7f95b8; font-size: 12px; }
.chain-list, .bullet-list { margin: 0; padding: 0; list-style: none; }
.chain-item, .stack-card, .structured-row {
  border: 1px solid rgba(149,185,245,0.12);
  background: rgba(8, 19, 35, 0.44);
  border-radius: 14px;
  padding: 12px;
}
.chain-list { display: grid; gap: 10px; }
.chain-item { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 10px; }
.chain-index {
  width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
  background: rgba(91, 145, 255, 0.16); color: #dce7ff; font-weight: 700;
}
.stack-list, .structured-list { display: grid; gap: 10px; }
.two-col-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.bullet-list li { color: #9fb4d5; padding: 6px 0; border-bottom: 1px solid rgba(149,185,245,0.08); }
.bullet-list li:last-child { border-bottom: 0; }
.audit-panel, .structured-panel, .procedural-panel { grid-column: span 2; }
.empty-state {
  border: 1px dashed rgba(149,185,245,0.24);
  border-radius: 16px;
  padding: 18px;
  color: #9fb4d5;
  background: rgba(255,255,255,0.02);
}
@media (max-width: 900px) {
  .world-grid, .two-col-list { grid-template-columns: 1fr; }
  .audit-panel, .structured-panel, .procedural-panel { grid-column: span 1; }
  .hero-card { flex-direction: column; }
}
</style>
