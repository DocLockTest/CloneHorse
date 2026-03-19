export const capitalStates = ['watch-only', 'probe', 'standard', 'conviction', 'frozen']
export const rerunModes = ['fast', 'deep']

export function defineMarket(input) {
  return {
    id: input.id,
    venue: input.venue,
    title: input.title,
    subtitle: input.subtitle ?? '',
    subcategory: input.subcategory,
    marketPriceYes: input.marketPriceYes,
    fairValueYes: input.fairValueYes,
    confidence: input.confidence,
    tradability: input.tradability,
    rerunFreshnessSec: input.rerunFreshnessSec,
    riskState: input.riskState,
    edge: Number((input.fairValueYes - input.marketPriceYes).toFixed(3)),
    worldStateId: input.worldStateId,
    linkedMarketIds: input.linkedMarketIds ?? [],
    primaryDrivers: input.primaryDrivers ?? [],
    riskFlags: input.riskFlags ?? [],
    triggerState: input.triggerState ?? 'quiet',
  }
}

export function defineTriggerEvent(input) {
  return {
    id: input.id,
    marketId: input.marketId,
    type: input.type,
    source: input.source,
    summary: input.summary,
    score: input.score,
    rerunDecision: input.rerunDecision,
    happenedAt: input.happenedAt,
    status: input.status,
  }
}

export function defineAgent(input) {
  return {
    id: input.id,
    name: input.name,
    role: input.role,
    specialty: input.specialty,
    trustWeight: input.trustWeight,
    recentAccuracy: input.recentAccuracy,
    status: input.status,
    blindSpots: input.blindSpots ?? [],
    bestMarketTypes: input.bestMarketTypes ?? [],
  }
}

export function defineWorldState(input) {
  return {
    id: input.id,
    marketId: input.marketId,
    category: input.category ?? 'generic',
    categoryLabel: input.categoryLabel ?? input.category ?? 'generic',
    summary: input.summary ?? null,
    proceduralChain: input.proceduralChain ?? [],
    actors: input.actors ?? [],
    institutions: input.institutions ?? [],
    claims: input.claims ?? [],
    counterclaims: input.counterclaims ?? [],
    catalysts: input.catalysts ?? [],
    linkedMarkets: input.linkedMarkets ?? [],
    sourceAudit: input.sourceAudit ?? [],
    categoryView: input.categoryView ?? { title: 'Category-specific structured read', items: [] },
  }
}

export function defineSwarmRun(input) {
  return {
    id: input.id,
    marketId: input.marketId,
    mode: input.mode,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    disagreementScore: input.disagreementScore,
    finalSummary: input.finalSummary,
    rounds: input.rounds ?? [],
    output: input.output,
  }
}

export function defineTicket(input) {
  return {
    id: input.id,
    marketId: input.marketId,
    venue: input.venue,
    side: input.side,
    targetPriceRange: input.targetPriceRange,
    maxSize: input.maxSize,
    thesis: input.thesis,
    expiry: input.expiry,
    approvalState: input.approvalState,
  }
}
