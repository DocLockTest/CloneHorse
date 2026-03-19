<script setup>
import { computed } from 'vue'

const props = defineProps({
  triggers: {
    type: Array,
    default: () => [],
  },
  history: {
    type: Array,
    default: () => [],
  },
  stats: {
    type: Object,
    default: null,
  },
  marketTitle: {
    type: String,
    default: '',
  },
})

const emptyTitle = computed(() => props.marketTitle || 'this market')

function formatStamp(value) {
  if (!value) return 'unknown time'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatDecision(decision) {
  return {
    fast: 'Fast rerun',
    deep: 'Deep rerun',
    watch: 'Watch only',
  }[decision] ?? 'Unscored'
}

function formatScore(score) {
  if (typeof score !== 'number') return 'unknown'
  return `${Math.round(score * 100)} / 100`
}
</script>

<template>
  <section class="feed-shell">
    <div class="truth-bar">
      <div class="truth-copy">
        <div class="truth-label">Operator truth</div>
        <p>
          Trigger history is persisted. Active rows only show what the deterministic rules engine fires right now;
          history shows what it has previously emitted for replay and audit.
        </p>
      </div>
      <dl v-if="stats" class="truth-stats">
        <div>
          <dt>Mode</dt>
          <dd>{{ stats.engineMode }}</dd>
        </div>
        <div>
          <dt>Active</dt>
          <dd>{{ stats.activeCount }}</dd>
        </div>
        <div>
          <dt>History</dt>
          <dd>{{ stats.historyCount }}</dd>
        </div>
        <div>
          <dt>Log</dt>
          <dd>{{ stats.persistence }}</dd>
        </div>
        <div>
          <dt>Eval</dt>
          <dd>{{ stats.replayedSnapshot ? 'replayed snapshot' : 'fresh emission' }}</dd>
        </div>
        <div>
          <dt>Last pass</dt>
          <dd>{{ formatStamp(stats.lastEvaluationAt) }}</dd>
        </div>
      </dl>
    </div>

    <div v-if="triggers.length" class="feed-block">
      <div class="section-head">
        <h3>Active triggers</h3>
        <span>{{ triggers.length }} live</span>
      </div>
      <article v-for="trigger in triggers" :key="trigger.id" class="item active-item">
        <div class="meta">
          <span>{{ formatStamp(trigger.happenedAt) }}</span>
          <span :class="['pill', trigger.status]">{{ trigger.status }}</span>
        </div>
        <h4>{{ trigger.summary }}</h4>
        <p>{{ trigger.source }}</p>
        <dl class="detail-grid">
          <div>
            <dt>Decision</dt>
            <dd>{{ formatDecision(trigger.rerunDecision) }}</dd>
          </div>
          <div>
            <dt>Score</dt>
            <dd>{{ formatScore(trigger.score) }}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{{ trigger.type }}</dd>
          </div>
        </dl>
      </article>
    </div>

    <div v-else class="empty-state">
      <div class="empty-kicker">No active trigger</div>
      <h3>{{ emptyTitle }} is quiet right now.</h3>
      <p>
        That does not mean the market is safe or fully understood. It only means the current Boris-style rules did not cross
        a visible threshold on the latest evaluation pass.
      </p>
    </div>

    <div class="feed-block history-block">
      <div class="section-head">
        <h3>Recent trigger history</h3>
        <span>{{ history.length }} logged</span>
      </div>

      <div v-if="history.length" class="history-list">
        <article v-for="entry in history" :key="entry.id" class="item history-item">
          <div class="meta">
            <span>{{ formatStamp(entry.happenedAt) }}</span>
            <span class="replay-pill">{{ formatDecision(entry.rerunDecision) }}</span>
          </div>
          <h4>{{ entry.summary }}</h4>
          <p>{{ entry.source }}</p>
          <dl class="detail-grid">
            <div>
              <dt>Status</dt>
              <dd>{{ entry.status }}</dd>
            </div>
            <div>
              <dt>First seen</dt>
              <dd>{{ formatStamp(entry.firstSeenAt) }}</dd>
            </div>
            <div>
              <dt>Replay count</dt>
              <dd>{{ entry.replayCount ?? 1 }}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div v-else class="empty-history">
        No trigger history has been recorded for this market yet. The log is honest about that instead of backfilling fiction.
      </div>
    </div>
  </section>
</template>

<style scoped>
.feed-shell { display: grid; gap: 14px; }
.truth-bar {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 1fr);
  gap: 14px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(149,185,245,0.14);
  background: rgba(255,255,255,0.035);
}
.truth-label {
  color: #8fb3ea;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  margin-bottom: 6px;
}
.truth-copy p,
.item p,
.empty-state p,
.empty-history {
  margin: 0;
  color: #9fb4d5;
  line-height: 1.55;
}
.truth-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}
.truth-stats div,
.detail-grid div {
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(7, 19, 34, 0.75);
  border: 1px solid rgba(149,185,245,0.12);
}
.truth-stats dt,
.detail-grid dt {
  color: #7fa0d6;
  font-size: 11px;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.truth-stats dd,
.detail-grid dd {
  margin: 0;
  color: #edf4ff;
  font-weight: 600;
}
.feed-block { display: grid; gap: 12px; }
.section-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
}
.section-head h3,
.empty-state h3,
.item h4 {
  margin: 0;
  color: #f3f8ff;
}
.section-head span,
.empty-kicker {
  color: #7fa0d6;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.item,
.empty-state,
.empty-history {
  border: 1px solid rgba(149,185,245,0.14);
  background: rgba(255,255,255,0.03);
  border-radius: 16px;
  padding: 14px;
}
.active-item {
  background: linear-gradient(180deg, rgba(34, 80, 118, 0.18), rgba(255,255,255,0.03));
}
.history-list { display: grid; gap: 12px; }
.meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #7fa0d6;
  font-size: 12px;
  text-transform: uppercase;
}
.detail-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.pill,
.replay-pill {
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(149,185,245,0.16);
}
.pill.completed { background: rgba(58, 201, 138, 0.16); color: #87efb6; }
.pill.running,
.pill.open { background: rgba(86, 174, 255, 0.16); color: #90d2ff; }
.pill.queued { background: rgba(255, 206, 90, 0.16); color: #ffd26d; }
.replay-pill { background: rgba(255,255,255,0.05); color: #dfeaff; }
@media (max-width: 900px) {
  .truth-bar,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
