/** Signal Extractor — converts simulation results into a trading signal.
 * Takes the final tick snapshot + expert divergence and produces:
 * - Raw and weighted pYes (expertise-weighted probability)
 * - Faction breakdown
 * - Polarization (variance across factions)
 * - Volatility (opinion change rate)
 * - Expert divergence (each expertise group's pYes)
 * - EV calculation: EV = p * W - (1-p) * L at market price */
export function extractSignal(simulationResult, marketPrice) {
  const lastTick = simulationResult.ticks[simulationResult.ticks.length - 1]
  if (!lastTick) return null

  const rawPYes = lastTick.positions.yes
  const expertDivergence = simulationResult.finalState?.expertDivergence ?? {}

  // Expertise-weighted pYes: professionals get more weight
  const weightedPYes = computeWeightedPYes(expertDivergence)

  // Faction breakdown (from last tick)
  const factionBreakdown = lastTick.factions

  // Polarization: variance of faction sizes (high = split opinions, low = consensus)
  const factionValues = Object.values(factionBreakdown)
  const factionMean = factionValues.reduce((a, b) => a + b, 0) / factionValues.length
  const polarization = factionValues.reduce((sum, v) => sum + (v - factionMean) ** 2, 0) / factionValues.length

  // Volatility: average opinion change rate across all ticks
  const volatility = simulationResult.ticks.length > 0
    ? simulationResult.ticks.reduce((sum, t) => sum + t.volatility, 0) / simulationResult.ticks.length
    : 0

  // Consensus from last tick
  const consensus = lastTick.consensus

  // EV calculation using the simulation's weighted probability
  // For YES at market price: EV = pYes * (1 - price) - (1 - pYes) * price
  const p = weightedPYes
  const ev = p * (1 - marketPrice) - (1 - p) * marketPrice

  // Recommended side
  const side = ev > 0 ? 'YES' : ev < -0.01 ? 'NO' : 'NEUTRAL'

  // Confidence: based on consensus strength + expert agreement
  const expertValues = Object.values(expertDivergence).map((e) => e.pYes)
  const expertSpread = expertValues.length > 1
    ? Math.max(...expertValues) - Math.min(...expertValues)
    : 0
  const signalConfidence = Math.max(0, Math.min(1,
    consensus * 0.5 + (1 - expertSpread) * 0.3 + (1 - polarization * 10) * 0.2
  ))

  return {
    rawPYes: round4(rawPYes),
    weightedPYes: round4(weightedPYes),
    factionBreakdown,
    polarization: round4(polarization),
    volatility: round4(volatility),
    consensus: round4(consensus),
    expertDivergence,
    ev: round4(ev),
    side,
    signalConfidence: round4(signalConfidence),
    completedTicks: simulationResult.completedTicks,
    agentCount: simulationResult.agentCount,
    earlyStop: simulationResult.earlyStop,
  }
}

/** Compute expertise-weighted pYes.
 * Legal pros: 2x weight, finance: 1.5x, political: 1.2x, general: 1x */
function computeWeightedPYes(expertDivergence) {
  const weights = { legal: 2.0, finance: 1.5, political: 1.2, general: 1.0 }
  let totalWeight = 0
  let weightedSum = 0

  for (const [key, data] of Object.entries(expertDivergence)) {
    const w = (weights[key] ?? 1.0) * data.count
    weightedSum += data.pYes * w
    totalWeight += w
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0.5
}

function round4(n) {
  return Math.round(n * 10000) / 10000
}
