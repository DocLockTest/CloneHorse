function compact(list) {
  return [...new Set((list ?? []).filter(Boolean).map((item) => String(item).trim()).filter(Boolean))]
}

function textBlob(...parts) {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

function tokenizeSentences(text) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function normalizeDateLabel(raw) {
  const cleaned = raw?.replace(/[.,]+$/g, '').trim()
  if (!cleaned) return null
  const monthDay = cleaned.match(/^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\.?\s+)(\d{1,2})(?:,\s*(\d{4}))?$/i)
  if (monthDay) {
    const [, month, day, year] = monthDay
    const normalized = `${month} ${day}, ${year ?? '2099'}`
    const parsed = Date.parse(normalized)
    return Number.isNaN(parsed) ? cleaned : new Date(parsed).toISOString()
  }
  const parsed = Date.parse(cleaned)
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString()
  return cleaned
}

function inferCategory(text, fallback) {
  if (fallback) return fallback
  if (/(court|judge|justice|injunction|appeals court|supreme court|lawsuit|panel)/i.test(text)) return 'court-ruling'
  if (/(sec|fda|fcc|ftc|agency|approve|approval|deny|denial|rule|filing|amendment)/i.test(text)) return 'agency-approval'
  if (/(delay|delayed|implementation|effective date|stay|postpone|deadline extension)/i.test(text)) return 'implementation-delay'
  if (/(congress|senate|house|bill|committee|markup|floor|vote|recess)/i.test(text)) return 'legislative-milestone'
  return 'general-policy'
}

function extractDateMentions(text) {
  const matches = text.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\.?\s+\d{1,2}(?:,\s*\d{4})?|\s+\d{4})\b/gi) ?? []
  return compact(matches.map(normalizeDateLabel))
}

function extractInstitutions(text) {
  const patterns = [
    { label: 'Supreme Court', regex: /supreme court/i },
    { label: 'Federal appeals court', regex: /appeals court|circuit court|appellate court/i },
    { label: 'District court', regex: /district court/i },
    { label: 'SEC', regex: /\bSEC\b|securities and exchange commission/i },
    { label: 'FDA', regex: /\bFDA\b|food and drug administration/i },
    { label: 'FTC', regex: /\bFTC\b|federal trade commission/i },
    { label: 'FCC', regex: /\bFCC\b|federal communications commission/i },
    { label: 'Congress', regex: /\bCongress\b/i },
    { label: 'Senate', regex: /\bSenate\b/i },
    { label: 'House', regex: /\bHouse\b/i },
    { label: 'Committee', regex: /committee/i },
  ]
  return compact(patterns.filter((entry) => entry.regex.test(text)).map((entry) => entry.label))
}

function extractActors(text) {
  const actors = []
  const capitalized = text.match(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g) ?? []
  for (const token of capitalized) {
    if (/^(Will|By|Before|After|The|A|An|And|Or|Yes|No|Market|Congress|Senate|House|Committee|Court|SEC|FDA|FTC|FCC|January|February|March|April|May|June|July|August|September|October|November|December)$/.test(token)) continue
    actors.push(token)
  }
  return compact(actors).slice(0, 8)
}

function sourceAuditBlock(market, parser) {
  const audit = []
  audit.push({
    kind: 'market-title',
    confidence: 'high',
    detail: market.title,
  })
  if (market.subtitle) {
    audit.push({ kind: 'market-subtitle', confidence: 'medium', detail: market.subtitle })
  }
  if (market.rulesPrimary) {
    audit.push({
      kind: 'rules-text',
      confidence: 'high',
      detail: market.rulesPrimary.slice(0, 280),
    })
  }
  if (market.closeTime) {
    audit.push({ kind: 'market-close-time', confidence: 'high', detail: market.closeTime })
  }
  audit.push({
    kind: 'parser-signals',
    confidence: parser.settlementDate ? 'medium' : 'low',
    detail: `category=${parser.category}; institutions=${parser.institutions.length}; dates=${parser.dateMentions.length}`,
  })
  return audit
}

function buildCatalystTimeline(category, parser, market) {
  const items = []
  if (parser.settlementDate) {
    items.push({ label: 'Settlement deadline', timing: parser.settlementDate, source: 'rules-text', weight: 'high' })
  }
  for (const date of parser.dateMentions) {
    if (date === parser.settlementDate) continue
    items.push({ label: 'Mentioned date', timing: date, source: 'rules-text', weight: 'medium' })
  }

  const categoryDefaults = {
    'court-ruling': [
      'Docket update lands',
      'Briefing completes',
      'Order or injunction decision posts',
    ],
    'agency-approval': [
      'Formal filing or amendment appears',
      'Agency comment window closes',
      'Approval / denial notice posts',
    ],
    'implementation-delay': [
      'Stay request or delay petition filed',
      'Effective-date change signaled',
      'Implementation cutoff passes',
    ],
    'legislative-milestone': [
      'Committee action scheduled',
      'Leadership floor signal appears',
      'Vote window opens or expires',
    ],
  }

  for (const label of categoryDefaults[category] ?? ['Official procedural update', 'Settlement condition resolves']) {
    items.push({ label, timing: null, source: 'category-template', weight: 'medium' })
  }

  if (market.closeTime && !items.some((item) => item.timing === market.closeTime)) {
    items.push({ label: 'Market close', timing: market.closeTime, source: 'market-metadata', weight: 'high' })
  }

  return items.slice(0, 6)
}

function buildProceduralChain(category, parser) {
  const templates = {
    'court-ruling': [
      'Case posture identified',
      'Relevant court or panel tracked',
      'Order / injunction decision awaited',
      'Settlement condition checked against ruling timing',
    ],
    'agency-approval': [
      'Application or amendment identified',
      'Agency review posture tracked',
      'Formal approval / denial signal awaited',
      'Settlement condition checked against agency action',
    ],
    'implementation-delay': [
      'Underlying rule or policy identified',
      'Delay / stay mechanism tracked',
      'Effective-date change watched',
      'Settlement condition checked against implementation status',
    ],
    'legislative-milestone': [
      'Bill or package identified',
      'Committee / floor posture tracked',
      'Procedural milestone watched',
      'Settlement condition checked against legislative progress',
    ],
  }

  const steps = [...(templates[category] ?? ['Settlement wording parsed', 'Procedural posture tracked', 'Resolution trigger watched'])]
  if (parser.settlementDate) steps.push(`Key deadline parsed: ${parser.settlementDate}`)
  if (parser.actionVerb) steps.splice(1, 0, `Target action parsed: ${parser.actionVerb}`)
  return compact(steps)
}

function buildCategoryPayload(category, parser) {
  switch (category) {
    case 'court-ruling':
      return {
        resolutionPath: parser.courtSignals.length ? parser.courtSignals : ['judicial ruling or order'],
        blockingStandard: parser.hasInjunctionSignal ? 'injunction / stay posture present' : 'standard not explicit in rules text',
        extractionNotes: [
          'Track whether the settlement requires a final ruling, order, or any block/stay.',
          'Distinguish briefing noise from actual docket action.',
        ],
      }
    case 'agency-approval':
      return {
        approvalObject: parser.approvalObject ?? 'application, amendment, or filing',
        requiredSignal: parser.hasFormalActionSignal ? 'formal agency action referenced' : 'formal action not explicit; treat headlines carefully',
        extractionNotes: [
          'Prefer official filings over reporter chatter.',
          'Check whether delay, denial, and approval are mutually exclusive in the settlement wording.',
        ],
      }
    case 'implementation-delay':
      return {
        implementationObject: parser.implementationObject ?? 'rule or policy rollout',
        delayMechanism: parser.hasDelaySignal ? 'delay / stay language detected' : 'no explicit delay language found',
        extractionNotes: [
          'Separate implementation delay from underlying legality or approval.',
          'Watch effective-date changes, stays, and agency notices.',
        ],
      }
    case 'legislative-milestone':
      return {
        billObject: parser.legislativeObject ?? 'bill, package, or congressional action',
        milestoneType: parser.legislativeStage ?? 'committee / floor milestone',
        extractionNotes: [
          'Differentiate introduction, committee action, passage, and enactment.',
          'Calendar compression matters more than narrative momentum.',
        ],
      }
    default:
      return {
        extractionNotes: ['Rules text parsed with generic policy template.'],
      }
  }
}

function buildClaims(category, parser) {
  const common = [`Market resolves on ${parser.actionVerb ?? 'a specific procedural action'}, not on vibes.`]
  switch (category) {
    case 'court-ruling':
      return compact([...common, 'Docket movement matters more than commentary once timing windows tighten.'])
    case 'agency-approval':
      return compact([...common, 'Formal filings and notices outrank media optimism.'])
    case 'implementation-delay':
      return compact([...common, 'A delay market can move without changing the ultimate merits outcome.'])
    case 'legislative-milestone':
      return compact([...common, 'Procedure, calendar, and floor access dominate last-mile passage odds.'])
    default:
      return common
  }
}

function buildCounterclaims(category) {
  switch (category) {
    case 'court-ruling':
      return ['Headline coverage may overstate the odds of immediate judicial relief.']
    case 'agency-approval':
      return ['Unofficial signaling can matter, but only if it converts into formal action quickly.']
    case 'implementation-delay':
      return ['Administrative drag is not the same thing as a recognized implementation delay under settlement wording.']
    case 'legislative-milestone':
      return ['Leadership can force floor time unexpectedly when stakes rise.']
    default:
      return ['Narrative momentum may diverge from settlement mechanics.']
  }
}

export class WorldStateEngine {
  parseRulesText(market = {}) {
    const combined = textBlob(market.title, market.subtitle, market.rulesPrimary)
    const sentences = tokenizeSentences(combined)
    const category = inferCategory(combined, market.subcategory)
    const dateMentions = extractDateMentions(combined)
    const settlementDate = normalizeDateLabel(market.closeTime) ?? dateMentions[0] ?? null
    const institutions = extractInstitutions(combined)
    const actors = extractActors(textBlob(market.title, market.subtitle))
    const actionVerbMatch = combined.match(/\b(block|approve|approved|approval|deny|denied|delay|delayed|implement|implemented|pass|passed|vote|rule|ruling|stay)\b/i)
    const approvalObjectMatch = combined.match(/approve\s+(.+?)(?:\s+by\b|\?|$)/i)
    const implementationObjectMatch = combined.match(/(?:delay|implement(?:ation)?)\s+(.+?)(?:\s+by\b|\?|$)/i)
    const legislativeObjectMatch = combined.match(/(?:pass|vote on|advance)\s+(.+?)(?:\s+before\b|\s+by\b|\?|$)/i)
    const legislativeStageMatch = combined.match(/\b(committee|markup|floor vote|passage|recess|conference)\b/i)

    return {
      marketId: market.id,
      category,
      text: combined,
      sentences,
      settlementDate,
      dateMentions,
      institutions,
      actors,
      actionVerb: actionVerbMatch?.[1]?.toLowerCase() ?? null,
      approvalObject: approvalObjectMatch?.[1]?.trim() ?? null,
      implementationObject: implementationObjectMatch?.[1]?.trim() ?? null,
      legislativeObject: legislativeObjectMatch?.[1]?.trim() ?? null,
      legislativeStage: legislativeStageMatch?.[1]?.toLowerCase() ?? null,
      hasInjunctionSignal: /injunction|stay|block/i.test(combined),
      hasFormalActionSignal: /filing|order|notice|approval|denial|amendment/i.test(combined),
      hasDelaySignal: /delay|stay|effective date|implementation/i.test(combined),
      courtSignals: compact([
        /appeals court|circuit court/i.test(combined) ? 'appellate docket' : null,
        /supreme court/i.test(combined) ? 'supreme court review' : null,
        /injunction|stay/i.test(combined) ? 'injunction / stay posture' : null,
      ]),
    }
  }

  buildWorldState(market = {}) {
    const parser = this.parseRulesText(market)
    const categoryBlock = buildCategoryPayload(parser.category, parser)
    const catalysts = buildCatalystTimeline(parser.category, parser, market)
    const audit = sourceAuditBlock(market, parser)

    return {
      id: market.worldStateId ?? `world:${market.id}`,
      marketId: market.id,
      title: market.title,
      category: parser.category,
      parser,
      proceduralChain: buildProceduralChain(parser.category, parser),
      actors: parser.actors,
      institutions: parser.institutions,
      claims: buildClaims(parser.category, parser),
      counterclaims: buildCounterclaims(parser.category),
      catalysts: catalysts.map((item) => item.label),
      catalystTimeline: catalysts,
      linkedMarkets: market.linkedMarketIds ?? [],
      sourceAudit: audit.map((item) => `${item.kind} (${item.confidence}) — ${item.detail}`),
      sourceAuditBlock: audit,
      categoryExtraction: categoryBlock,
    }
  }

  buildWorldStates(markets = []) {
    return markets.map((market) => this.buildWorldState(market))
  }
}
