export const swarmStats = {
  objective: 'Policy / Legal / Regulatory mispricing capture',
  activeMarkets: 14,
  activeAgents: 9,
  openPositions: 5,
  bankroll: '$5,280',
  dayPnL: '+$184',
  winRate: '61%',
  latency: '41s fast rerun',
}

export const commandQueue = [
  {
    id: 'CMD-104',
    title: 'Rerun Supreme Court injunction cluster',
    priority: 'critical',
    target: 'Procedure Analyst, Resolution Lawyer, Judge',
    eta: '45 sec',
    status: 'armed',
  },
  {
    id: 'CMD-101',
    title: 'Reprice SEC approval timelines',
    priority: 'high',
    target: 'Macro Narrative, Timing Analyst',
    eta: '2 min',
    status: 'running',
  },
  {
    id: 'CMD-097',
    title: 'Digest CFTC enforcement docket shift',
    priority: 'normal',
    target: 'News Hawk, Contrarian',
    eta: '6 min',
    status: 'queued',
  },
]

export const agents = [
  {
    name: 'Resolution Lawyer',
    specialty: 'Settlement wording + rule traps',
    trust: 0.94,
    accuracy: '74%',
    mood: 'skeptical',
    status: 'locked-in',
  },
  {
    name: 'Procedure Analyst',
    specialty: 'Institutional sequencing',
    trust: 0.91,
    accuracy: '69%',
    mood: 'focused',
    status: 'running',
  },
  {
    name: 'Narrative Analyst',
    specialty: 'Crowd misread detection',
    trust: 0.83,
    accuracy: '63%',
    mood: 'aggressive',
    status: 'watching',
  },
  {
    name: 'Timing Analyst',
    specialty: 'Catalyst windows + delay risk',
    trust: 0.88,
    accuracy: '66%',
    mood: 'calm',
    status: 'running',
  },
  {
    name: 'Risk Officer',
    specialty: 'No-trade vetoes + exposure caps',
    trust: 0.97,
    accuracy: 'n/a',
    mood: 'cold',
    status: 'armed',
  },
  {
    name: 'Wallet Manager',
    specialty: 'Allocation routing + venue balances',
    trust: 0.79,
    accuracy: 'ops',
    mood: 'disciplined',
    status: 'manual-gated',
  },
]

export const markets = [
  {
    venue: 'Kalshi',
    title: 'Will a federal appeals court block the EPA rule by June 30?',
    price: '43¢',
    fairValue: '57¢',
    edge: '+14 pts',
    confidence: 'high',
    latency: 'rerun in 38s',
    status: 'trade-ready',
  },
  {
    venue: 'Polymarket',
    title: 'Will the SEC approve spot ETH staking amendments this quarter?',
    price: '31¢',
    fairValue: '39¢',
    edge: '+8 pts',
    confidence: 'medium',
    latency: 'watch catalyst',
    status: 'watch',
  },
  {
    venue: 'Kalshi',
    title: 'Will Congress pass the surveillance reform package before recess?',
    price: '22¢',
    fairValue: '18¢',
    edge: '-4 pts',
    confidence: 'medium',
    latency: 'crowd overpricing',
    status: 'fade',
  },
]

export const wallet = {
  total: '$5,280',
  available: '$3,120',
  locked: '$1,410',
  reserve: '$750',
  policy: 'Manual approval required for real-money execution. Wallet manager can prepare tickets and route balances, but not free-spend.',
  venues: [
    { name: 'Kalshi', balance: '$2,940', mode: 'approval-gated' },
    { name: 'Polymarket', balance: '$1,590 USDC', mode: 'approval-gated' },
    { name: 'Research', balance: '$750 reserve', mode: 'cold reserve' },
  ],
}

export const logs = [
  '[16:01:13] Trigger fired: docket update detected on monitored circuit case.',
  '[16:01:22] Resolution Lawyer flagged clause mismatch between title and settlement rule.',
  '[16:01:39] Procedure Analyst repriced timeline impact to +11 points.',
  '[16:02:03] Risk Officer reduced max size due to thin depth on Kalshi ladder.',
  '[16:02:27] Wallet Manager prepared approval ticket; execution still operator-gated.',
]
