/** Build the prompt for a single agent evaluation within a simulation tick.
 * Takes the agent's persona, market context, feed from neighbors, and
 * expert hypotheses. Returns a prompt string for Qwen inference. */
export function buildAgentPrompt({ persona, marketContext, neighborFeed, expertHypotheses, tick }) {
  return `You are a simulated participant in a prediction market debate.

## Your profile
- Expertise: ${persona.expertise.join(', ')}
- Political lean: ${persona.politicalLean}
- Risk tolerance: ${persona.riskTolerance.toFixed(2)} (0 = very cautious, 1 = very aggressive)
${persona.domainContext?.length ? `- Domain context: ${persona.domainContext.join(', ')}` : ''}

## Market question
${marketContext.title}
- Current market price (YES): ${Math.round(marketContext.marketPriceYes * 100)}¢
- Venue: ${marketContext.venue}
- Category: ${marketContext.subcategory ?? 'general'}

## Expert hypotheses
${expertHypotheses.map((h, i) => `${i + 1}. ${h}`).join('\n')}

## What others are saying (tick ${tick})
${neighborFeed.length ? neighborFeed.map((f) => `- ${f}`).join('\n') : '(No neighbor posts yet)'}

## Your task
Based on your expertise and the information above, state your position on this market.
Respond with EXACTLY this JSON format, nothing else:
{"position":"YES"|"NO"|"NEUTRAL","confidence":0.0-1.0,"reasoning":"one sentence"}
`
}

/** Parse an agent's response into a structured position object.
 * Handles various LLM output formats gracefully. */
export function parseAgentResponse(raw) {
  const trimmed = (raw ?? '').trim()

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(trimmed)
    return normalizePosition(parsed)
  } catch { /* continue */ }

  // Try extracting JSON from markdown code block
  const jsonMatch = trimmed.match(/\{[^}]+\}/)
  if (jsonMatch) {
    try {
      return normalizePosition(JSON.parse(jsonMatch[0]))
    } catch { /* continue */ }
  }

  // Fallback: extract position keyword
  const upper = trimmed.toUpperCase()
  if (upper.includes('YES')) {
    return { position: 'YES', confidence: 0.5, reasoning: 'Parsed from unstructured response' }
  }
  if (upper.includes('NO')) {
    return { position: 'NO', confidence: 0.5, reasoning: 'Parsed from unstructured response' }
  }

  return { position: 'NEUTRAL', confidence: 0.3, reasoning: 'Could not parse response' }
}

function normalizePosition(obj) {
  const position = ['YES', 'NO', 'NEUTRAL'].includes(String(obj.position).toUpperCase())
    ? String(obj.position).toUpperCase()
    : 'NEUTRAL'
  const confidence = Math.max(0, Math.min(1, Number(obj.confidence) || 0.5))
  const reasoning = String(obj.reasoning ?? '').slice(0, 500) || 'No reasoning provided'
  return { position, confidence, reasoning }
}
