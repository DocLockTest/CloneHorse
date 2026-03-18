import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ModelBackendSelector } from './src/server/model-backend-selector.mjs'
import { MemoryGraphStore } from './src/server/graph-store.mjs'
import { RetrievalService } from './src/server/retrieval-service.mjs'
import { MarketIngestionService } from './src/server/market-ingestion.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = resolve(__dirname, 'dist')

const kernelData = {
  snapshot: {
    objective: 'Capture policy, legal, and regulatory market mispricings',
    activeMarkets: 14,
    activeAgents: 8,
    openPositions: 5,
    bankroll: '$5,280',
    dayPnL: '+$184',
    winRate: '61%',
    fastRerunLatency: '41s',
  },
  markets: [
    {
      id: 'mkt-epa-june', venue: 'Kalshi', title: 'Will a federal appeals court block the EPA rule by June 30?', subtitle: 'Court / injunction timing', subcategory: 'court-ruling', marketPriceYes: 0.43, fairValueYes: 0.57, confidence: 'high', tradability: 'standard', rerunFreshnessSec: 38, riskState: 'clear', edge: 0.14, worldStateId: 'world-epa-june', linkedMarketIds: ['mkt-epa-delay-pm'], primaryDrivers: ['docket timing', 'injunction standard', 'venue divergence'], riskFlags: ['thin depth on upper ladder'], triggerState: 'hot'
    },
    {
      id: 'mkt-sec-eth', venue: 'Polymarket', title: 'Will the SEC approve spot ETH staking amendments this quarter?', subtitle: 'Agency approval / delay', subcategory: 'agency-approval', marketPriceYes: 0.31, fairValueYes: 0.39, confidence: 'medium', tradability: 'probe', rerunFreshnessSec: 112, riskState: 'monitor', edge: 0.08, worldStateId: 'world-sec-eth', linkedMarketIds: [], primaryDrivers: ['comment window', 'staff signaling', 'headline overreaction'], riskFlags: ['narrative-heavy market'], triggerState: 'watch'
    },
    {
      id: 'mkt-surveillance-bill', venue: 'Kalshi', title: 'Will Congress pass the surveillance reform package before recess?', subtitle: 'Legislative milestone', subcategory: 'legislative-milestone', marketPriceYes: 0.22, fairValueYes: 0.18, confidence: 'medium', tradability: 'watch-only', rerunFreshnessSec: 264, riskState: 'crowded', edge: -0.04, worldStateId: 'world-surveillance-bill', linkedMarketIds: [], primaryDrivers: ['committee bottleneck', 'floor-time squeeze'], riskFlags: ['correlated with broader whip-count assumptions'], triggerState: 'quiet'
    }
  ],
  triggers: [
    { id: 'trg-1004', marketId: 'mkt-epa-june', type: 'official-procedural', source: 'Federal docket monitor', summary: 'New briefing schedule posted; opposition timeline tightened.', score: 0.93, rerunDecision: 'fast', happenedAt: '16:01:13', status: 'completed' },
    { id: 'trg-1005', marketId: 'mkt-sec-eth', type: 'narrative-wave', source: 'SEC reporter cluster', summary: 'Reporters pushing approval optimism without filing change.', score: 0.66, rerunDecision: 'fast', happenedAt: '16:03:07', status: 'running' },
    { id: 'trg-1006', marketId: 'mkt-surveillance-bill', type: 'scheduled-catalyst', source: 'Congress schedule watcher', summary: 'Recess window closes in 48h; procedural choke point persists.', score: 0.44, rerunDecision: 'watch', happenedAt: '16:04:10', status: 'queued' }
  ],
  worldStates: [
    { id: 'world-epa-june', marketId: 'mkt-epa-june', proceduralChain: ['Petition filed', 'Briefing schedule tightened', 'Injunction standard review pending', 'Potential block before June 30'], actors: ['EPA', 'Federal appeals panel', 'Petitioning states'], institutions: ['EPA', 'Federal appeals court'], claims: ['Tighter briefing schedule increases odds of pre-deadline action.', 'Market is underpricing procedural speed relative to headline noise.'], counterclaims: ['Panel may still hold relief until merits are more fully briefed.'], catalysts: ['supplemental brief due', 'oral argument calendar update'], linkedMarkets: ['Potential implementation delay market on Polymarket'], sourceAudit: ['Federal docket update — high confidence', 'Procedural analog — medium confidence'] },
    { id: 'world-sec-eth', marketId: 'mkt-sec-eth', proceduralChain: ['Media optimism', 'No formal filing change', 'Approval path still gated by staff posture'], actors: ['SEC staff', 'issuers', 'crypto reporters'], institutions: ['SEC'], claims: ['Headline optimism is outrunning actual procedural movement.'], counterclaims: ['Informal signaling may be more meaningful than it appears.'], catalysts: ['staff comment cycle', 'updated amendment filing'], linkedMarkets: [], sourceAudit: ['Reporter cluster — medium confidence', 'EDGAR watch — high confidence'] },
    { id: 'world-surveillance-bill', marketId: 'mkt-surveillance-bill', proceduralChain: ['Committee bottleneck', 'floor-time competition', 'recess deadline compression'], actors: ['House leadership', 'Senate negotiators'], institutions: ['Congress'], claims: ['Crowd is pricing passage as if procedural friction is lower than reality.'], counterclaims: ['Emergency framing could force floor time.'], catalysts: ['leadership statement', 'committee markup'], linkedMarkets: [], sourceAudit: ['Congressional calendar — high confidence'] }
  ],
  swarmRuns: [
    { id: 'run-epa-fast', marketId: 'mkt-epa-june', mode: 'fast', startedAt: '16:01:15', completedAt: '16:01:56', disagreementScore: 0.27, finalSummary: 'Procedure sped up enough to justify a 57¢ fair value; crowd still anchored to older timeline.', rounds: [{ name: 'Initial priors', note: 'Lawyer and Procedure Analyst both moved YES higher.' }, { name: 'Cross-check', note: 'Narrative Analyst flagged headline lag versus docket reality.' }, { name: 'Extraction', note: 'Judge emitted standard tradability with thin-depth warning.' }], output: { fairValueYes: 0.57, confidence: 'high', action: 'queue-ticket' } },
    { id: 'run-sec-fast', marketId: 'mkt-sec-eth', mode: 'fast', startedAt: '16:03:09', completedAt: null, disagreementScore: 0.44, finalSummary: 'Rerun still in progress; likely probe-only if no filing confirms narrative wave.', rounds: [{ name: 'Initial priors', note: 'Narrative optimism detected but Procedure Analyst unconvinced.' }], output: { fairValueYes: 0.39, confidence: 'medium', action: 'watch' } }
  ],
  agents: [
    { id: 'agt-lawyer', name: 'Resolution Lawyer', role: 'resolution', specialty: 'Settlement wording and edge-case traps', trustWeight: 0.94, recentAccuracy: '74%', status: 'locked-in', blindSpots: ['can over-penalize noisy but real signals'], bestMarketTypes: ['court-ruling', 'agency-approval'] },
    { id: 'agt-procedure', name: 'Procedure Analyst', role: 'procedure', specialty: 'Institutional sequencing and realistic next steps', trustWeight: 0.91, recentAccuracy: '69%', status: 'running', blindSpots: ['underweights crowd reflex'], bestMarketTypes: ['court-ruling', 'legislative-milestone'] },
    { id: 'agt-narrative', name: 'Narrative Analyst', role: 'narrative', specialty: 'Crowd misread and media framing detection', trustWeight: 0.83, recentAccuracy: '63%', status: 'watching', blindSpots: ['can overweight noise'], bestMarketTypes: ['agency-approval'] },
    { id: 'agt-timing', name: 'Timing Analyst', role: 'timing', specialty: 'Catalyst windows and repricing timing', trustWeight: 0.88, recentAccuracy: '66%', status: 'running', blindSpots: ['false precision'], bestMarketTypes: ['court-ruling', 'agency-approval'] },
    { id: 'agt-contrarian', name: 'Contrarian', role: 'contrarian', specialty: 'Challenges lazy consensus and crowded assumptions', trustWeight: 0.79, recentAccuracy: '58%', status: 'watching', blindSpots: ['can be early and wrong'], bestMarketTypes: ['legislative-milestone'] },
    { id: 'agt-micro', name: 'Microstructure Analyst', role: 'microstructure', specialty: 'Spread, depth, venue behavior, tradability', trustWeight: 0.84, recentAccuracy: 'ops', status: 'running', blindSpots: ['can reject correct trades for execution ugliness'], bestMarketTypes: ['court-ruling', 'agency-approval'] },
    { id: 'agt-risk', name: 'Risk Officer', role: 'risk', specialty: 'No-trade vetoes and exposure caps', trustWeight: 0.97, recentAccuracy: 'n/a', status: 'armed', blindSpots: ['can suppress aggression'], bestMarketTypes: ['all'] },
    { id: 'agt-judge', name: 'Judge / Extractor', role: 'extractor', specialty: 'Synthesizes swarm state into market-facing output', trustWeight: 0.92, recentAccuracy: '71%', status: 'running', blindSpots: ['may overcompress nuance'], bestMarketTypes: ['all'] }
  ],
  tickets: [
    { id: 'tkt-204', marketId: 'mkt-epa-june', venue: 'Kalshi', side: 'YES', targetPriceRange: '44¢–49¢', maxSize: '$210', thesis: 'Procedural acceleration still underpriced after docket update.', expiry: '17:10', approvalState: 'pending' },
    { id: 'tkt-205', marketId: 'mkt-sec-eth', venue: 'Polymarket', side: 'YES', targetPriceRange: '30¢–33¢', maxSize: '$95', thesis: 'Probe only unless formal filing corroborates optimism.', expiry: '16:45', approvalState: 'draft' }
  ],
  capital: {
    total: '$5,280', available: '$3,120', locked: '$1,410', reserve: '$750', mode: 'approval-gated',
    venues: [
      { name: 'Kalshi', balance: '$2,940', exposure: '$620', maxExposure: '$1,200' },
      { name: 'Polymarket', balance: '$1,590 USDC', exposure: '$380', maxExposure: '$900' }
    ]
  },
  calibration: {
    brier: '0.184', confidenceCalibration: 'slightly overconfident in narrative-driven markets', noTradeQuality: 'good', fastRerunP50: '41s', deepRerunP50: '4m 12s'
  }
}

const backendSelector = new ModelBackendSelector()
const graphStore = new MemoryGraphStore()
const retrievalService = new RetrievalService({ graphStore })
const marketIngestionService = new MarketIngestionService({ fallbackMarkets: kernelData.markets })

const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(data))
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname

  if (path === '/api/health') return json(res, 200, { ok: true })
  if (path === '/api/snapshot') return json(res, 200, kernelData.snapshot)
  if (path === '/api/markets') return json(res, 200, await marketIngestionService.getFocusedMarkets())
  if (path === '/api/agents') return json(res, 200, kernelData.agents)
  if (path === '/api/tickets') return json(res, 200, kernelData.tickets)
  if (path === '/api/capital') return json(res, 200, kernelData.capital)
  if (path === '/api/calibration') return json(res, 200, kernelData.calibration)
  if (path === '/api/model-backends') return json(res, 200, backendSelector.getConfig())

  if (path === '/api/triggers') {
    const marketId = url.searchParams.get('marketId')
    return json(res, 200, marketId ? kernelData.triggers.filter((t) => t.marketId === marketId) : kernelData.triggers)
  }
  if (path === '/api/world-state') {
    const marketId = url.searchParams.get('marketId')
    return json(res, 200, marketId ? kernelData.worldStates.find((w) => w.marketId === marketId) ?? null : kernelData.worldStates)
  }
  if (path === '/api/swarm-runs') {
    const marketId = url.searchParams.get('marketId')
    return json(res, 200, marketId ? kernelData.swarmRuns.filter((r) => r.marketId === marketId) : kernelData.swarmRuns)
  }
  if (path === '/api/backend/select') {
    const kind = url.searchParams.get('kind') ?? 'analysis'
    const category = url.searchParams.get('category') ?? 'court-ruling'
    const urgency = url.searchParams.get('urgency') ?? 'normal'
    return json(res, 200, backendSelector.select({ kind, category, urgency }))
  }
  if (path === '/api/graph/world') {
    const marketId = url.searchParams.get('marketId')
    return json(res, 200, await graphStore.getWorldGraph(marketId))
  }
  if (path === '/api/graph/claims') {
    const marketId = url.searchParams.get('marketId')
    return json(res, 200, await graphStore.getClaimNeighborhood(marketId))
  }
  if (path === '/api/retrieval/brief') {
    const marketId = url.searchParams.get('marketId')
    const market = kernelData.markets.find((item) => item.id === marketId)
    return json(res, 200, market ? await retrievalService.getMarketBrief(market) : null)
  }
  if (path === '/api/retrieval/evidence') {
    const marketId = url.searchParams.get('marketId')
    const market = kernelData.markets.find((item) => item.id === marketId)
    return json(res, 200, market ? await retrievalService.getClaimEvidence(market) : null)
  }
  if (path === '/api/retrieval/world-inspector') {
    const marketId = url.searchParams.get('marketId')
    const market = kernelData.markets.find((item) => item.id === marketId)
    return json(res, 200, market ? await retrievalService.getWorldInspectorBundle(market) : null)
  }

  try {
    const target = path === '/' ? join(distDir, 'index.html') : join(distDir, path)
    const content = await readFile(target)
    res.writeHead(200, { 'Content-Type': mimeTypes[extname(target)] || 'text/plain; charset=utf-8' })
    res.end(content)
  } catch {
    try {
      const html = await readFile(join(distDir, 'index.html'))
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  }
})

const port = Number(process.env.PORT || 4178)
server.listen(port, () => {
  console.log(`MiroFish Oracle server listening on http://localhost:${port}`)
})
