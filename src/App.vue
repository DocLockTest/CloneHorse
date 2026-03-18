<script setup>
import TopBar from './components/TopBar.vue'
import StatStrip from './components/StatStrip.vue'
import Panel from './components/Panel.vue'
import { swarmStats, commandQueue, agents, markets, wallet, logs } from './data/mockData'

const statItems = [
  { label: 'Objective', value: swarmStats.objective },
  { label: 'Active markets', value: swarmStats.activeMarkets },
  { label: 'Active agents', value: swarmStats.activeAgents },
  { label: 'Open positions', value: swarmStats.openPositions },
  { label: 'Bankroll', value: swarmStats.bankroll },
  { label: 'Day PnL', value: swarmStats.dayPnL },
  { label: 'Win rate', value: swarmStats.winRate },
  { label: 'Fast rerun', value: swarmStats.latency },
]
</script>

<template>
  <div class="shell">
    <TopBar />

    <p class="lead">
      Our fork of MiroFish focused on policy, legal, and regulatory prediction markets.
      The dashboard acts as the operator console for swarm orchestration, market triage,
      rerun commands, and approval-gated wallet routing.
    </p>

    <StatStrip :items="statItems" />

    <main class="grid">
      <Panel title="Swarm command center" kicker="Operator lane">
        <template #actions>
          <button class="inline-action">Arm trigger engine</button>
        </template>

        <div class="command-box">
          <div class="command-title">Broadcast command</div>
          <textarea rows="6">Prioritize policy, legal, and regulatory markets. Reweight the swarm toward procedural catalysts, settlement wording, venue divergence, and crowd misread detection. Surface only the top three trade candidates with risk-adjusted conviction.</textarea>
          <div class="command-actions">
            <button>Dispatch to swarm</button>
            <button class="ghost">Save as protocol</button>
          </div>
        </div>

        <div class="queue">
          <article v-for="item in commandQueue" :key="item.id" class="queue-item">
            <div>
              <div class="queue-meta">{{ item.id }} · {{ item.priority }}</div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.target }}</p>
            </div>
            <div class="queue-right">
              <strong>{{ item.eta }}</strong>
              <span :class="['pill', item.status]">{{ item.status }}</span>
            </div>
          </article>
        </div>
      </Panel>

      <Panel title="Agent registry" kicker="Persistent personas">
        <div class="agent-list">
          <article v-for="agent in agents" :key="agent.name" class="agent-card">
            <div class="agent-row">
              <h3>{{ agent.name }}</h3>
              <span :class="['pill', agent.status]">{{ agent.status }}</span>
            </div>
            <p>{{ agent.specialty }}</p>
            <div class="agent-metrics">
              <span>Trust {{ Math.round(agent.trust * 100) }}%</span>
              <span>Accuracy {{ agent.accuracy }}</span>
              <span>Mood {{ agent.mood }}</span>
            </div>
          </article>
        </div>
      </Panel>

      <Panel title="Market board" kicker="Current edge map">
        <div class="market-list">
          <article v-for="market in markets" :key="market.title" class="market-card">
            <div class="agent-row">
              <strong>{{ market.venue }}</strong>
              <span :class="['pill', market.status]">{{ market.status }}</span>
            </div>
            <h3>{{ market.title }}</h3>
            <div class="market-grid">
              <span>Market {{ market.price }}</span>
              <span>Fair {{ market.fairValue }}</span>
              <span>Edge {{ market.edge }}</span>
              <span>{{ market.confidence }} confidence</span>
            </div>
            <small>{{ market.latency }}</small>
          </article>
        </div>
      </Panel>

      <Panel title="Wallet and bankroll controls" kicker="Approval gated">
        <div class="wallet-total">
          <strong>{{ wallet.total }}</strong>
          <span>Total strategy capital</span>
        </div>
        <div class="wallet-splits">
          <div>
            <label>Available</label>
            <strong>{{ wallet.available }}</strong>
          </div>
          <div>
            <label>Locked</label>
            <strong>{{ wallet.locked }}</strong>
          </div>
          <div>
            <label>Reserve</label>
            <strong>{{ wallet.reserve }}</strong>
          </div>
        </div>
        <p class="policy">{{ wallet.policy }}</p>
        <div class="venue-list">
          <article v-for="venue in wallet.venues" :key="venue.name" class="venue-item">
            <div>
              <strong>{{ venue.name }}</strong>
              <p>{{ venue.mode }}</p>
            </div>
            <span>{{ venue.balance }}</span>
          </article>
        </div>
      </Panel>

      <Panel title="Run log" kicker="Trigger + replay">
        <div class="log-list">
          <div v-for="line in logs" :key="line" class="log-line">{{ line }}</div>
        </div>
      </Panel>

      <Panel title="System architecture" kicker="MiroFish fork map">
        <div class="arch-list">
          <article>
            <h3>World builder</h3>
            <p>Transforms each market into a policy and procedural world-state with catalysts, actors, rules, and venue context.</p>
          </article>
          <article>
            <h3>Swarm runner</h3>
            <p>Runs persistent agents in fast reruns and deep reruns, preserving trust relationships and disagreement structure.</p>
          </article>
          <article>
            <h3>Forecast extractor</h3>
            <p>Converts swarm state into fair value, confidence, and tradability while preserving evidence and rationale.</p>
          </article>
          <article>
            <h3>Execution controls</h3>
            <p>Prepares venue-specific tickets and capital routing under strict approval gates and exposure limits.</p>
          </article>
        </div>
      </Panel>
    </main>
  </div>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  color: #dbe7ff;
  background:
    radial-gradient(circle at top left, rgba(57, 129, 255, 0.22), transparent 28%),
    radial-gradient(circle at top right, rgba(32, 222, 188, 0.16), transparent 24%),
    linear-gradient(180deg, #07111d 0%, #091526 55%, #050b14 100%);
}
.shell {
  max-width: 1480px;
  margin: 0 auto;
  padding: 32px 20px 60px;
}
.lead {
  color: #9db2d1;
  max-width: 900px;
  line-height: 1.6;
  font-size: 1.05rem;
  margin: 18px 0 24px;
}
.grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}
.grid > *:nth-child(1) { grid-column: span 7; }
.grid > *:nth-child(2) { grid-column: span 5; }
.grid > *:nth-child(3) { grid-column: span 7; }
.grid > *:nth-child(4) { grid-column: span 5; }
.grid > *:nth-child(5) { grid-column: span 5; }
.grid > *:nth-child(6) { grid-column: span 7; }
.command-box {
  display: grid;
  gap: 12px;
}
.command-title {
  color: #9db2d1;
  font-size: 14px;
}
textarea {
  width: 100%;
  resize: vertical;
  border-radius: 16px;
  background: rgba(255,255,255,0.04);
  color: #e8f0ff;
  border: 1px solid rgba(149,185,245,0.18);
  padding: 14px;
  min-height: 150px;
}
.command-actions, .agent-row, .queue-item, .venue-item, .wallet-splits, .agent-metrics, .market-grid {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
button {
  border: none;
  background: linear-gradient(180deg, #77d6ff, #4d86ff);
  color: #08111d;
  font-weight: 700;
  border-radius: 14px;
  padding: 11px 15px;
  cursor: pointer;
}
button.ghost, .inline-action {
  background: rgba(255,255,255,0.05);
  color: #d7e5ff;
  border: 1px solid rgba(149,185,245,0.16);
}
.queue, .agent-list, .market-list, .venue-list, .arch-list {
  display: grid;
  gap: 12px;
}
.queue-item, .agent-card, .market-card, .venue-item, .arch-list article {
  border: 1px solid rgba(149,185,245,0.14);
  background: rgba(255,255,255,0.03);
  border-radius: 16px;
  padding: 14px;
}
h3 {
  margin: 6px 0;
  color: #f3f8ff;
}
p, small, label { color: #9fb4d5; margin: 0; }
.queue-meta {
  color: #7fa0d6;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.queue-right {
  display: grid;
  justify-items: end;
  gap: 8px;
}
.pill {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: rgba(255,255,255,0.06);
}
.pill.running { background: rgba(86, 174, 255, 0.16); color: #90d2ff; }
.pill.armed, .pill.locked-in, .pill.trade-ready { background: rgba(58, 201, 138, 0.16); color: #87efb6; }
.pill.queued, .pill.watching, .pill.watch { background: rgba(255, 206, 90, 0.16); color: #ffd26d; }
.pill.fade, .pill.manual-gated { background: rgba(255, 128, 128, 0.14); color: #ffb0b0; }
.wallet-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
}
.wallet-total strong { font-size: 2rem; color: #f3f8ff; }
.wallet-splits strong { display: block; color: #dfe9ff; margin-top: 8px; }
.policy { margin: 16px 0; }
.log-list {
  display: grid;
  gap: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
}
.log-line {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(149,185,245,0.12);
}
@media (max-width: 1100px) {
  .grid > * { grid-column: 1 / -1 !important; }
}
</style>
