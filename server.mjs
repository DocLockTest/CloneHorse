import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ModelBackendSelector } from './src/server/model-backend-selector.mjs'
import { MemoryGraphStore } from './src/server/graph-store.mjs'
import { RetrievalService } from './src/server/retrieval-service.mjs'
import { MarketIngestionService } from './src/server/market-ingestion.mjs'
import { TriggerEngine } from './src/server/trigger-engine.mjs'
import { WorldStateEngine } from './src/server/world-state-engine.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = resolve(__dirname, 'dist')
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:4177'

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
    {
      id: 'world-epa-june',
      marketId: 'mkt-epa-june',
      category: 'court-ruling',
      categoryLabel: 'Court ruling',
      summary: {
        headline: 'Court timing chain is real enough to inspect, but still scaffolded.',
        body: 'This view shows the stored procedural spine, upcoming court catalysts, and explicit source confidence. It does not claim live claim extraction or autonomous graph patching.',
        confidence: 'high',
        evidenceMode: 'deterministic scaffold + manual baseline',
      },
      proceduralChain: [
        { label: 'Petition filed', note: 'Starting procedural posture already on the docket.', status: 'confirmed', stage: 'filing', basis: 'official docket', sourceType: 'official filing' },
        { label: 'Briefing schedule tightened', note: 'This is the main modeled shift currently moving fair value.', status: 'confirmed', stage: 'schedule', basis: 'new docket entry', sourceType: 'official docket update' },
        { label: 'Injunction standard review pending', note: 'Still unresolved; modeled as the next gating step rather than a completed event.', status: 'pending', stage: 'judicial review', basis: 'procedural inference', sourceType: 'court process analog' },
        { label: 'Potential block before June 30', note: 'Outcome-facing terminal step, kept separate from observed court actions.', status: 'at-risk', stage: 'resolution window', basis: 'market thesis synthesis', sourceType: 'operator read' },
      ],
      actors: ['Petitioning states', 'Federal appeals panel'],
      institutions: ['EPA', 'Federal appeals court'],
      claims: [
        { text: 'Tighter briefing schedule increases odds of pre-deadline action.', basis: 'Observed schedule compression vs prior market anchor.', conviction: 'high' },
        { text: 'Market is underpricing procedural speed relative to headline noise.', basis: 'Current venue pricing still lags the procedural update.', conviction: 'medium' },
      ],
      counterclaims: [
        { text: 'Panel may hold relief until merits are more fully briefed.', condition: 'Even a faster schedule can stop short of a pre-deadline injunction.', risk: 'watch' },
      ],
      catalysts: [
        { label: 'Supplemental brief due', note: 'Most direct next event on the modeled chain.', urgency: 'imminent', window: 'before June 30', triggerType: 'deadline', watcher: 'docket monitor' },
        { label: 'Oral argument calendar update', note: 'Would materially change speed assumptions if the court moves faster than expected.', urgency: 'watch', window: 'calendar-dependent', triggerType: 'schedule change', watcher: 'court calendar watcher' },
      ],
      linkedMarkets: ['Potential implementation delay market on Polymarket'],
      sourceAudit: [
        { label: 'Federal docket update', note: 'Primary factual anchor for the current repricing view.', confidence: 'high', kind: 'official docket', recency: 'current window', usage: 'procedural chain' },
        { label: 'Procedural analog set', note: 'Used for pacing context, not as direct evidence that the panel will rule the same way.', confidence: 'medium', kind: 'historical analog', recency: 'reference set', usage: 'timing calibration' },
      ],
      categoryView: {
        title: 'Court posture snapshot',
        items: [
          { label: 'Current posture', value: 'Petition filed; briefing schedule tightened; injunction review still pending.', emphasis: 'live procedural hinge' },
          { label: 'Modeled deadline pressure', value: 'June 30 forces timing sensitivity, but not guaranteed relief.', emphasis: 'timing risk' },
          { label: 'Main failure mode', value: 'Court preserves optionality and delays meaningful relief despite faster motion.', emphasis: 'operator caution' },
        ],
      },
    },
    {
      id: 'world-sec-eth',
      marketId: 'mkt-sec-eth',
      category: 'agency-approval',
      categoryLabel: 'Agency approval',
      summary: {
        headline: 'Narrative heat is visible; formal process movement is still thin.',
        body: 'The inspector separates reporter-wave catalysts from actual filing-backed progress so the market does not confuse sentiment with procedural advancement.',
        confidence: 'medium',
        evidenceMode: 'mixed official + reporter baseline',
      },
      proceduralChain: [
        { label: 'Media optimism burst', note: 'Observed narrative impulse, not equivalent to staff action.', status: 'observed', stage: 'sentiment', basis: 'reporter cluster', sourceType: 'media' },
        { label: 'No formal filing change', note: 'Current official baseline remains mostly unchanged.', status: 'confirmed', stage: 'filing state', basis: 'EDGAR watch', sourceType: 'official filing monitor' },
        { label: 'Approval path still gated by staff posture', note: 'Modeled gate remains the staff review path rather than headline tone.', status: 'pending', stage: 'agency review', basis: 'procedural posture', sourceType: 'process inference' },
      ],
      actors: ['SEC staff', 'Issuers', 'Crypto reporters'],
      institutions: ['SEC'],
      claims: [
        { text: 'Headline optimism is outrunning actual procedural movement.', basis: 'Sentiment has moved faster than formal filings.', conviction: 'high' },
      ],
      counterclaims: [
        { text: 'Informal signaling may matter more than it looks.', condition: 'Staff posture can shift before the visible filing trail fully catches up.', risk: 'watch' },
      ],
      catalysts: [
        { label: 'Staff comment cycle', note: 'The next meaningful process checkpoint if it visibly advances.', urgency: 'watch', window: 'this quarter', triggerType: 'agency review', watcher: 'SEC process monitor' },
        { label: 'Updated amendment filing', note: 'Cleanest confirmation that the narrative wave has real procedural backing.', urgency: 'imminent', window: 'filing-dependent', triggerType: 'filing', watcher: 'EDGAR watch' },
      ],
      linkedMarkets: [],
      sourceAudit: [
        { label: 'Reporter cluster', note: 'Useful for detecting crowd narrative shifts, but not treated as dispositive process evidence.', confidence: 'medium', kind: 'media', recency: 'current window', usage: 'narrative pressure' },
        { label: 'EDGAR watch', note: 'Primary formal-process truth source for this market.', confidence: 'high', kind: 'official filing', recency: 'live monitor', usage: 'filing state' },
      ],
      categoryView: {
        title: 'Approval pathway snapshot',
        items: [
          { label: 'Formal progress', value: 'No material filing step has yet matched the narrative jump.', emphasis: 'truth anchor' },
          { label: 'Crowd distortion', value: 'Optimism is being driven more by interpretation than by public procedural state.', emphasis: 'sentiment gap' },
          { label: 'Upgrade condition', value: 'A new amendment or visible staff-process shift would justify a stronger posture.', emphasis: 'needed confirmation' },
        ],
      },
    },
    {
      id: 'world-surveillance-bill',
      marketId: 'mkt-surveillance-bill',
      category: 'legislative-milestone',
      categoryLabel: 'Legislative milestone',
      summary: {
        headline: 'The modeled bottleneck is procedural bandwidth, not lack of narrative urgency.',
        body: 'This surface keeps the legislative read grounded in calendar, markup, and leadership sequencing rather than pretending there is a deep autonomous whip-count model behind it.',
        confidence: 'medium',
        evidenceMode: 'calendar + leadership baseline',
      },
      proceduralChain: [
        { label: 'Committee bottleneck', note: 'Core gating issue remains committee movement.', status: 'confirmed', stage: 'committee', basis: 'calendar read', sourceType: 'official schedule' },
        { label: 'Floor-time competition', note: 'Even favorable rhetoric does not create floor time by itself.', status: 'observed', stage: 'leadership scheduling', basis: 'leadership bandwidth', sourceType: 'public schedule' },
        { label: 'Recess deadline compression', note: 'Time decay now matters more than broad narrative support.', status: 'imminent', stage: 'deadline', basis: 'recess calendar', sourceType: 'congressional calendar' },
      ],
      actors: ['House leadership', 'Senate negotiators'],
      institutions: ['Congress'],
      claims: [
        { text: 'Crowd is pricing passage as if procedural friction is lower than reality.', basis: 'Available calendar and sequencing still look tight.', conviction: 'medium' },
      ],
      counterclaims: [
        { text: 'Emergency framing could force floor time.', condition: 'Political pressure can compress the queue faster than baseline scheduling implies.', risk: 'watch' },
      ],
      catalysts: [
        { label: 'Leadership statement', note: 'Can change floor expectations, but only if paired with concrete scheduling language.', urgency: 'watch', window: 'next leadership update', triggerType: 'statement', watcher: 'leadership watcher' },
        { label: 'Committee markup', note: 'Most meaningful single sign that the bottleneck is easing.', urgency: 'imminent', window: 'before recess', triggerType: 'committee action', watcher: 'congress schedule watcher' },
      ],
      linkedMarkets: [],
      sourceAudit: [
        { label: 'Congressional calendar', note: 'Main truth source for timing pressure and recess compression.', confidence: 'high', kind: 'official schedule', recency: 'current calendar', usage: 'deadline pressure' },
        { label: 'Leadership signal tracking', note: 'Secondary contextual source; helpful, but less binding than formal scheduling.', confidence: 'medium', kind: 'public statements', recency: 'recent', usage: 'narrative context' },
      ],
      categoryView: {
        title: 'Legislative pathway snapshot',
        items: [
          { label: 'Current bottleneck', value: 'Committee movement and scarce floor time still dominate the path.', emphasis: 'procedural choke point' },
          { label: 'Time pressure', value: 'Recess compression is making delay more plausible than a clean acceleration.', emphasis: 'deadline decay' },
          { label: 'What would change the read', value: 'Concrete markup scheduling or explicit leadership floor commitment.', emphasis: 'confirmation needed' },
        ],
      },
    }
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
const worldStateEngine = new WorldStateEngine()
const graphStore = new MemoryGraphStore({ worldStateEngine, markets: kernelData.markets })
const retrievalService = new RetrievalService({ graphStore })
const marketIngestionService = new MarketIngestionService({
  fallbackMarkets: kernelData.markets,
  snapshotPath: new URL('./data/live-market-snapshot.json', import.meta.url),
})
const triggerEngine = new TriggerEngine({
  filePath: new URL('./data/trigger-store.json', import.meta.url),
  suppressionWindowMs: 15 * 60 * 1000,
  maxHistory: 250,
})

const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin })
  res.end(JSON.stringify(data))
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

async function resolveMarkets() {
  const focused = await marketIngestionService.getFocusedMarkets()
  const markets = focused?.markets?.length ? focused.markets : kernelData.markets
  graphStore.setMarkets(markets)
  return { focused, markets }
}

async function resolveMarketById(marketId) {
  if (!marketId) return null
  const { markets } = await resolveMarkets()
  return markets.find((item) => item.id === marketId) ?? kernelData.markets.find((item) => item.id === marketId) ?? null
}

const server = http.createServer(async (req, res) => {
  try {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname

  if (path === '/api/health') {
    return json(res, 200, {
      ok: true,
      ingestion: await marketIngestionService.getHealth(),
    })
  }
  if (path === '/api/snapshot') return json(res, 200, kernelData.snapshot)
  if (path === '/api/markets') {
    const forceRefresh = url.searchParams.get('refresh') === '1'
    return json(res, 200, await marketIngestionService.getFocusedMarkets({ forceRefresh }))
  }
  if (path === '/api/markets/health') return json(res, 200, await marketIngestionService.getHealth())
  if (path === '/api/markets/snapshot') return json(res, 200, await marketIngestionService.getStoredSnapshot())
  if (path === '/api/agents') return json(res, 200, kernelData.agents)
  if (path === '/api/tickets') return json(res, 200, kernelData.tickets)
  if (path === '/api/capital') return json(res, 200, kernelData.capital)
  if (path === '/api/calibration') return json(res, 200, kernelData.calibration)
  if (path === '/api/model-backends') return json(res, 200, backendSelector.getConfig())

  if (path === '/api/triggers') {
    const marketId = url.searchParams.get('marketId')
    const { focused } = await resolveMarkets()
    const evaluation = await triggerEngine.evaluate(focused.markets, {
      snapshotKey: focused.capturedAt ?? `${focused.source}:unknown`,
      generatedAt: focused.capturedAt ?? new Date().toISOString(),
    })
    const history = await triggerEngine.getTriggers({ marketId })
    const active = marketId
      ? evaluation.emitted.filter((trigger) => trigger.marketId === marketId || trigger.relatedMarketId === marketId)
      : evaluation.emitted

    return json(res, 200, {
      active,
      history,
      stats: {
        activeCount: active.length,
        historyCount: history.length,
        persistence: history.length ? 'persistent-log' : 'cold-start',
        engineMode: 'deterministic-rules-only',
        lastEvaluationAt: focused.capturedAt ?? new Date().toISOString(),
        replayedSnapshot: evaluation.replayed,
      },
    })
  }
  if (path === '/api/world-state') {
    const marketId = url.searchParams.get('marketId')
    if (marketId) {
      const market = await resolveMarketById(marketId)
      if (!market) return json(res, 404, { error: 'Market not found' })
      return json(res, 200, worldStateEngine.buildWorldState(market))
    }
    const { markets } = await resolveMarkets()
    return json(res, 200, worldStateEngine.buildWorldStates(markets))
  }
  if (path === '/api/world-state/parse') {
    const marketId = url.searchParams.get('marketId')
    const market = await resolveMarketById(marketId)
    if (!market) return json(res, 404, { error: 'Market not found' })
    return json(res, 200, worldStateEngine.parseRulesText(market))
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
    await resolveMarketById(marketId)
    return json(res, 200, await graphStore.getWorldGraph(marketId))
  }
  if (path === '/api/graph/claims') {
    const marketId = url.searchParams.get('marketId')
    await resolveMarketById(marketId)
    return json(res, 200, await graphStore.getClaimNeighborhood(marketId))
  }
  if (path === '/api/retrieval/brief') {
    const marketId = url.searchParams.get('marketId')
    const market = await resolveMarketById(marketId)
    if (!market) return json(res, 404, { error: 'Market not found' })
    return json(res, 200, await retrievalService.getMarketBrief(market))
  }
  if (path === '/api/retrieval/evidence') {
    const marketId = url.searchParams.get('marketId')
    const market = await resolveMarketById(marketId)
    if (!market) return json(res, 404, { error: 'Market not found' })
    return json(res, 200, await retrievalService.getClaimEvidence(market))
  }
  if (path === '/api/retrieval/world-inspector') {
    const marketId = url.searchParams.get('marketId')
    const market = await resolveMarketById(marketId)
    if (!market) return json(res, 404, { error: 'Market not found' })
    return json(res, 200, await retrievalService.getWorldInspectorBundle(market))
  }

  try {
    const target = path === '/' ? resolve(distDir, 'index.html') : resolve(distDir, path)
    if (!target.startsWith(distDir)) {
      res.writeHead(403)
      return res.end('Forbidden')
    }
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
  } catch (err) {
    console.error('Unhandled request error:', err)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }
})

const port = Number(process.env.PORT || 4178)
server.listen(port, '127.0.0.1', () => {
  console.log(`MiroFish Oracle server listening on http://localhost:${port}`)
})
