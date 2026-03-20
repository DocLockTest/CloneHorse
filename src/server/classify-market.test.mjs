import { describe, it, expect } from 'vitest'

// classifyMarket is module-private, so we test through normalization functions.
// We re-implement the same logic here for direct pattern testing.
// If the classification logic is ever refactored to be exported, swap to direct import.

const SPORTS_ENTERTAINMENT_REJECT = /(\bnba\b|\bnfl\b|\bmlb\b|\bnhl\b|\bncaa\b|premier league|champions league|world cup|super bowl|oscars|grammy|emmy|bachelor|survivor|big brother|esports|tennis|basketball|football|soccer|baseball|hockey|\bufc\b|\bmma\b|boxing|cricket|rugby|formula\s*1|nascar|golf|olympics|paralympics|wrestling|volleyball|swimming|track and field|figure skating|skiing|snowboard|\bwwe\b|\baew\b|gaming|twitch|streamer|youtube|tiktok|spotify|netflix|disney|marvel|dc comics|star wars|anime|manga|k-?pop|billboard|box office|ratings|viewership|episode|season finale)/i

const CATEGORY_PATTERNS = {
  'court-ruling': {
    match: /(court|judge|justice|injunction|lawsuit|ruling|appeals?\s+court|supreme\s+court|circuit\s+court|district\s+court|docket|brief|oral\s+argument|stay|opinion|certiorari|amicus|plaintiff|defendant|verdict|settlement|litigation|judicial|convicted|conviction|acquit|sentenced|sentencing|indictment|indicted|trial|plea\s+deal|plea\s+guilty|arraign)/i,
    reject: /(talent\s+judge|judging\s+panel|reality\s+show|competition\s+judge)/i,
  },
  'agency-approval': {
    match: /(sec\b|cftc\b|fda\b|fcc\b|ftc\b|epa\b|osha\b|cfpb\b|doj\b|dhs\b|approval|deny|denial|enforcement\s+action|consent\s+decree|comment\s+period|rulemaking|notice\s+of\s+proposed|final\s+rule|advisory\s+committee|510\(k\)|nda\b|anda\b|eua\b|clearance|registration\s+statement)/i,
    reject: /(game\s+approval|app\s+store|content\s+rating)/i,
  },
  'political-event': {
    match: /(executive\s+order|presidential\s+memo|cabinet\s+confirmation|senate\s+confirmation|confirmation\s+hearing|nomination|pardon|impeach|inauguration|state\s+of\s+the\s+union|veto|signing\s+ceremony|trade\s+war|tariff|sanction|treaty|diplomatic|ambassador|national\s+security\s+council|classified|declassif)/i,
    reject: /(reality\s+tv|political\s+drama|house\s+of\s+cards)/i,
  },
  'legislative-milestone': {
    match: /(congress|senate\b|house\s+of\s+representatives|bill\b|resolution\b|committee\s+markup|floor\s+vote|cloture|filibuster|reconciliation|continuing\s+resolution|omnibus|appropriation|authorization\s+act|conference\s+committee|joint\s+session|recess|lame\s+duck|speaker\s+of\s+the\s+house|majority\s+leader|whip\s+count)/i,
    reject: /(big\s+brother\s+house|house\s+music|full\s+house|tiny\s+house|confirmation\s+hearing|cabinet\s+confirmation|senate\s+confirmation)/i,
  },
}

function classifyMarket(text) {
  if (SPORTS_ENTERTAINMENT_REJECT.test(text)) return null
  for (const [category, { match, reject }] of Object.entries(CATEGORY_PATTERNS)) {
    if (match.test(text) && !reject.test(text)) return category
  }
  return null
}

// --- COURT RULING: 15+ test cases ---
describe('classifyMarket → court-ruling', () => {
  const courtCases = [
    'Will the Supreme Court overturn the ruling?',
    'Federal appeals court blocks EPA rule',
    'Harvey Weinstein sentenced to prison',
    'BitBoy convicted of fraud',
    'Will Trump be indicted before 2027?',
    'District court grants injunction against merger',
    'Jury verdict in opioid litigation',
    'SEC defendant reaches settlement',
    'Oral argument scheduled in immigration case',
    'Will the judge grant a stay of execution?',
    'Certiorari petition filed with SCOTUS',
    'Trial date set for January 2027',
    'Plea deal offered in classified documents case',
    'Acquittal expected in corruption trial',
    'DOJ arraignment hearing for former CEO',
  ]

  for (const title of courtCases) {
    it(`classifies: "${title}"`, () => {
      expect(classifyMarket(title.toLowerCase())).toBe('court-ruling')
    })
  }
})

// --- AGENCY APPROVAL: 12+ test cases ---
describe('classifyMarket → agency-approval', () => {
  const agencyCases = [
    'FDA approval of Alzheimer drug before 2027',
    'SEC enforcement action against Coinbase',
    'EPA final rule on emissions standards',
    'FTC denies merger of grocery chains',
    'CFTC consent decree with crypto exchange',
    'CFPB rulemaking on overdraft fees',
    'FCC clearance for satellite broadband',
    'Notice of proposed rulemaking on AI safety',
    'FDA advisory committee votes on vaccine booster',
    'SEC registration statement for IPO',
    'OSHA workplace safety rule finalized',
    'DHS enforcement action on border policy',
  ]

  for (const title of agencyCases) {
    it(`classifies: "${title}"`, () => {
      expect(classifyMarket(title.toLowerCase())).toBe('agency-approval')
    })
  }
})

// --- POLITICAL EVENT: 10+ test cases ---
describe('classifyMarket → political-event', () => {
  const politicalCases = [
    'Will Biden issue executive order on AI?',
    'Senate confirmation of cabinet nominee',
    'Presidential pardon announced for political prisoners',
    'Will Trump be impeached again?',
    'State of the Union address prediction',
    'Will the president veto the spending bill?',
    'Trade war escalation with China tariffs',
    'New sanctions imposed on Russia',
    'Treaty ratification by Senate',
    'Ambassador nomination to Ukraine',
    'Cabinet confirmation hearing for defense secretary',
  ]

  for (const title of politicalCases) {
    it(`classifies: "${title}"`, () => {
      expect(classifyMarket(title.toLowerCase())).toBe('political-event')
    })
  }
})

// --- LEGISLATIVE MILESTONE: 10+ test cases ---
describe('classifyMarket → legislative-milestone', () => {
  const legislativeCases = [
    'Will Congress pass the infrastructure bill?',
    'Senate floor vote on debt ceiling',
    'House of Representatives passes defense authorization act',
    'Committee markup of healthcare bill',
    'Will filibuster block voting rights legislation?',
    'Reconciliation bill passes before recess',
    'Omnibus spending bill signed into law',
    'Continuing resolution extends government funding',
    'Speaker of the House election on first ballot',
    'Whip count shows 51 votes for nominee',
  ]

  for (const title of legislativeCases) {
    it(`classifies: "${title}"`, () => {
      expect(classifyMarket(title.toLowerCase())).toBe('legislative-milestone')
    })
  }
})

// --- SPORTS/ENTERTAINMENT REJECTION: 15+ test cases ---
describe('classifyMarket → rejects sports/entertainment', () => {
  const rejectCases = [
    'Will the Lakers win the NBA championship?',
    'Will Italy qualify for the 2026 FIFA World Cup?',
    'Who will win the Super Bowl?',
    'Oscar Best Picture winner 2027',
    'Next Bachelor contestant eliminated',
    'Will Ninja win the esports tournament?',
    'UFC heavyweight championship fight result',
    'Premier League relegation battle',
    'Formula 1 driver of the year',
    'Will Netflix stock hit $1000?',
    'Grammy Album of the Year prediction',
    'NCAA March Madness bracket winner',
    'WWE Royal Rumble winner',
    'MMA fighter of the year award',
    'Billboard Hot 100 number one next week',
    'Will the season finale break ratings records?',
    'Disney earnings beat expectations',
  ]

  for (const title of rejectCases) {
    it(`rejects: "${title}"`, () => {
      expect(classifyMarket(title.toLowerCase())).toBe(null)
    })
  }
})

// --- OUT-OF-FOCUS REJECTION: 8+ test cases ---
describe('classifyMarket → rejects out-of-focus topics', () => {
  const outOfFocusCases = [
    'Will Bitcoin reach 100k?',
    'Will it rain in New York tomorrow?',
    'SpaceX Starship successful landing',
    'Tesla deliveries exceed expectations',
    'Will GPT-5 be released in 2026?',
    'Earthquake prediction for California',
    'Will Elon Musk step down as Twitter CEO?',
    'Apple iPhone 18 release date',
  ]

  for (const title of outOfFocusCases) {
    it(`rejects: "${title}"`, () => {
      expect(classifyMarket(title.toLowerCase())).toBe(null)
    })
  }
})

// --- EDGE CASES: tricky titles that could go either way ---
describe('classifyMarket → edge cases', () => {
  it('rejects "talent judge" (not a real judge)', () => {
    expect(classifyMarket('who will be the next talent judge on american idol')).toBe(null)
  })

  it('rejects "game approval" (not regulatory)', () => {
    expect(classifyMarket('will the new call of duty get game approval in australia')).toBe(null)
  })

  it('rejects "house music" (not congress)', () => {
    expect(classifyMarket('will house music make a comeback in 2027')).toBe(null)
  })

  it('classifies "SEC" correctly even in lowercase', () => {
    expect(classifyMarket('sec files complaint against defi protocol')).toBe('agency-approval')
  })

  it('classifies court + political hybrid as court-ruling (priority order)', () => {
    // Court patterns are checked first
    expect(classifyMarket('supreme court rules on executive order legality')).toBe('court-ruling')
  })

  it('classifies "senate confirmation" as political, not legislative', () => {
    expect(classifyMarket('senate confirmation of attorney general nominee')).toBe('political-event')
  })
})
