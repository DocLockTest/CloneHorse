/** Stratification targets for the persona population.
 * These percentages control the expertise distribution:
 * legal experts weigh court procedures, finance pros weigh market mechanics,
 * political analysts weigh legislative dynamics, general public reacts to headlines. */
export const STRATA = {
  legal:     0.12,
  finance:   0.20,
  political: 0.18,
  general:   0.50,
}

const POLITICAL_LEANS = ['progressive', 'moderate-left', 'centrist', 'moderate-right', 'conservative', 'libertarian']

const INFLUENCE_RANGES = {
  legal:     [0.7, 1.0],
  finance:   [0.6, 0.9],
  political: [0.5, 0.85],
  general:   [0.1, 0.5],
}

/** Generate a stratified population of personas from knowledge graph entities.
 * @param graphEntities — array of { type, name, domain } from the graph
 * @param count — number of personas to generate
 * @returns array of persona objects */
export function generatePersonas({ graphEntities = [], count = 1000 } = {}) {
  const personas = []

  // Calculate exact counts per stratum (rounding remainder goes to general)
  const counts = {
    legal:     Math.round(count * STRATA.legal),
    finance:   Math.round(count * STRATA.finance),
    political: Math.round(count * STRATA.political),
  }
  counts.general = count - counts.legal - counts.finance - counts.political

  // Extract domain context from graph entities for enriching professional personas
  const legalEntities = graphEntities.filter((e) => e.domain === 'judicial' || e.domain === 'legal')
  const regulatoryEntities = graphEntities.filter((e) => e.domain === 'regulatory')
  const allEntityNames = graphEntities.map((e) => e.name)

  let idCounter = 0

  for (const [stratum, stratumCount] of Object.entries(counts)) {
    for (let i = 0; i < stratumCount; i++) {
      const persona = buildPersona({
        id: `agent-${idCounter++}`,
        stratum,
        legalEntities,
        regulatoryEntities,
        allEntityNames,
      })
      personas.push(persona)
    }
  }

  return personas
}

function buildPersona({ id, stratum, legalEntities, regulatoryEntities, allEntityNames }) {
  const [minInfluence, maxInfluence] = INFLUENCE_RANGES[stratum]

  // Expertise: primary stratum + possible secondary
  const expertise = [stratum]
  if (stratum !== 'general' && pseudoRandom(id, 'secondary') < 0.2) {
    const secondary = stratum === 'legal' ? 'political' : stratum === 'finance' ? 'legal' : 'finance'
    expertise.push(secondary)
  }

  // Domain context: for professional personas, reference graph entities
  const domainContext = []
  if (stratum === 'legal' && legalEntities.length > 0) {
    const entity = legalEntities[Math.floor(pseudoRandom(id, 'entity') * legalEntities.length)]
    domainContext.push(entity.name)
  }
  if ((stratum === 'legal' || stratum === 'political') && regulatoryEntities.length > 0) {
    const entity = regulatoryEntities[Math.floor(pseudoRandom(id, 'reg') * regulatoryEntities.length)]
    domainContext.push(entity.name)
  }

  return {
    id,
    expertise,
    politicalLean: POLITICAL_LEANS[Math.floor(pseudoRandom(id, 'lean') * POLITICAL_LEANS.length)],
    riskTolerance: Number((pseudoRandom(id, 'risk') * 0.8 + 0.1).toFixed(3)), // 0.1–0.9
    influenceWeight: Number((minInfluence + pseudoRandom(id, 'influence') * (maxInfluence - minInfluence)).toFixed(3)),
    domainContext,
  }
}

/** Deterministic pseudo-random based on id + salt.
 * Same inputs always produce same output — makes simulations reproducible. */
function pseudoRandom(id, salt) {
  const str = `${id}:${salt}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash % 10000) / 10000
}
