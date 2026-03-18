# MiroFish Oracle — Prediction Kernel Spec

## 0. Intent

This is the core engine spec for our in-house MiroFish fork focused on policy, legal, and regulatory prediction markets on Kalshi and Polymarket.

This document answers the core architecture questions, defines the kernel, and maps upstream MiroFish concepts into our fork.

The goal is not to build a generic multi-agent toy.
The goal is to build a stateful swarm prediction engine that:

- understands procedural and legal world-state
- reacts quickly to filings, rulings, agency actions, and narrative shifts
- updates fair value through selective swarm reruns
- preserves explainability, replayability, and operator control

---

# 1. Core answers

## 1. What is the unit of prediction?

The primary unit is:

> **market mispricing under a live event world-state**

Not just raw event probability.
Not just a single trade recommendation.

Each kernel run should output:

- event probability estimate
- current market price
- fair value estimate
- edge estimate
- confidence band
- tradability score
- recommended action state

This matters because we are not trying to be a news summarizer.
We are trying to find where the market is wrong.

## 2. Which subcategories do we start with?

V1 focus:

1. court rulings and injunction timing
2. agency approvals / denials / delays
3. implementation, stay, and enforcement timing questions
4. legislative milestone markets with clear procedural gates

Avoid in V1:

- fuzzy public-opinion markets
- vague constitutional mega-questions
- ultra-thin novelty markets
- anything where settlement wording is weak

## 3. What is the world-state in our domain?

The world-state is a live graph-backed procedural simulation object containing:

- market definition
- venue-specific settlement wording
- linked markets
- institutions
- actors
- filings and rulings
- deadlines and catalysts
- claims and counterclaims
- source reliability
- current narrative regime
- prior swarm beliefs

This is not just “context.”
It is the working simulation substrate.

## 4. What belongs in the graph vs flat tables?

### Graph layer
Use the graph for:

- actors
- institutions
- documents
- claims
- contradictions
- event causality
- trust relationships
- agent-to-claim influence
- cross-market conceptual links
- procedural dependency chains

### Relational / time-series layer
Use tables for:

- market snapshots
- price history
- liquidity history
- rerun jobs
- swarm runs
- agent outputs
- tickets
- positions
- bankroll states
- risk alerts
- outcome metrics

Rule:
- graph for meaning and relationships
- tables for operations, history, and execution

## 5. How many persistent agents in V1?

Start with 8 persistent agents:

1. Resolution Lawyer
2. Procedure Analyst
3. Narrative Analyst
4. Timing Analyst
5. Contrarian
6. Microstructure Analyst
7. Risk Officer
8. Judge / Forecast Extractor

Optional V1.5 additions:
- Base-Rate Historian
- Manipulation / Distortion Analyst

## 6. What triggers fast rerun vs deep rerun?

### Fast rerun triggers
- official filing posted
- docket update
- material statement by relevant institution
- price move > threshold
- venue divergence > threshold
- catalyst window opening
- rule wording clarification

### Deep rerun triggers
- fast rerun yields fractured confidence
- event changes core causal assumptions
- major ruling / approval / denial lands
- large unexplained price move persists
- multiple linked markets shift together
- new ambiguity introduced into settlement interpretation

## 7. How do we extract the final forecast?

Use a hybrid extraction model:

1. weighted agent outputs
2. role-specific authority by market type
3. contradiction penalties
4. confidence discounting for ambiguity
5. risk veto overlays

The Judge does not simply average.
The Judge synthesizes under explicit weighting rules informed by:

- market type
- rule clarity
- trigger class
- historical calibration
- disagreement intensity

## 8. What are the operator’s primary actions?

The operator should be able to:

- inspect markets
- inspect world-state and evidence graph
- trigger fast rerun
- trigger deep rerun
- freeze a market
- adjust watch priority
- inspect agent disagreement
- approve or reject a trade ticket
- annotate claims or sources
- override source trust
- inspect risk and exposure

## 9. How do we measure success?

Core metrics:

- Brier score
- calibration error
- edge realized vs market price at decision time
- paper PnL
- category-specific performance
- trigger-to-rerun latency
- no-trade quality
- false-confidence rate

## 10. What do we inherit vs replace from MiroFish?

### Inherit
- graph-backed seed extraction concept
- persistent memory concept
- environment / world-state setup concept
- multi-round social simulation concept
- post-simulation report / interaction concept

### Replace / specialize
- generic “predict anything” framing
- broad simulation templates
- consumer-facing general workflow
- domain-general persona generation

Our fork becomes:

> **MiroFish Oracle: a domain-specialized procedural prediction swarm for live policy, legal, and regulatory markets**

---

# 2. Boris-style architecture format

## Thesis

Markets in policy, legal, and regulatory domains are frequently mispriced because participants overweight headlines and underweight procedure, settlement wording, institutional sequencing, and causal dependency.

The kernel exists to convert new information into a live procedural world-state, run a memory-backed swarm across that state, and extract a tradable estimate of market error.

## Core object

**Prediction kernel**
A stateful service that consumes:

- market state
- source events
- graph memory
- prior swarm state

and produces:

- fair probability
- confidence band
- edge
- tradability state
- rationale graph
- ticket recommendation payload

## Non-goals

- generic chatbot predictions
- static one-shot analyst panels
- fully autonomous free-spend execution
- graph visualization as the product itself

## Design laws

1. **State before opinion**
   No prediction without world-state.
2. **Procedure over vibes**
   Official process beats social noise unless proven otherwise.
3. **Fast rerun first**
   Default to the smallest sufficient rerun.
4. **Deep rerun on structure changes**
   Use full swarm only when the world actually changes.
5. **Graph is substrate, not UI dogma**
   Internal graph, operator-first dashboard.
6. **Risk can veto brilliance**
   A good forecast is not automatically a good trade.
7. **Every conclusion must be replayable**
   Store claims, conflicts, and belief changes.

---

# 3. Kernel modules

## A. Market Registry

Maintains normalized market objects across Kalshi and Polymarket.

### Responsibilities
- venue normalization
- market metadata
- settlement text ingestion
- linked market clustering
- category tagging

### Outputs
- canonical market object
- venue comparison object

## B. Event Intake

Transforms raw updates into normalized event objects.

### Sources
- dockets
- agency postings
- press releases
- official calendars
- vetted news wires
- venue price feeds

### Outputs
- event object
- market linkage candidates
- trigger score inputs

## C. World Builder

Creates and patches world-state.

### Responsibilities
- entity extraction
- relationship extraction
- deadline graphing
- causal chain updates
- claim insertion
- stale node invalidation

### Output
- `world_state_vN`

## D. Memory Graph

Persistent semantic graph of:
- actors
- institutions
- claims
- events
- source trust
- prior forecast patterns
- agent trust relationships

## E. Swarm Runner

Runs agents against world-state.

### Modes
- fast rerun
- deep rerun

### Guarantees
- persistent agent identity
- stored belief deltas
- stored argument lineage

## F. Forecast Extractor

Converts swarm state into a market-facing estimate.

### Outputs
- `event_probability`
- `fair_value`
- `confidence`
- `tradability`
- `disagreement_score`
- `summary_rationale`

## G. Risk Engine

Evaluates whether a forecast should become a trade candidate.

### Outputs
- approve for queue
- reduce size
- watch only
- freeze
- reject

## H. Ticket Builder

Creates executable candidate tickets.

### Outputs
- venue
- side
- target price range
- maximum size
- thesis id
- expiry
- approval state

---

# 4. World-state schema

## Primary node types

- `Market`
- `VenueRule`
- `Institution`
- `Actor`
- `Document`
- `Event`
- `Deadline`
- `Claim`
- `Counterclaim`
- `Catalyst`
- `RelatedMarket`
- `AgentBelief`
- `NarrativeRegime`

## Primary edge types

- `AFFECTS`
- `CONTRADICTS`
- `DEPENDS_ON`
- `ISSUED_BY`
- `INTERPRETS`
- `TRIGGERS`
- `LINKED_TO`
- `SUPPORTS`
- `UNDERMINES`
- `TRUSTS`
- `WEIGHS`

## World-state views

The kernel must derive these views from the graph:

1. procedural chain
2. actor map
3. claim lattice
4. catalyst timeline
5. linked-market cluster
6. disagreement surface

---

# 5. Agent roster

## 1. Resolution Lawyer
Purpose:
- parse settlement wording and edge cases

Input priority:
- venue rules, titles, clarifications, precedent-like patterns

Failure mode:
- too conservative on noisy but real signals

## 2. Procedure Analyst
Purpose:
- model institutional sequencing and realistic next steps

Input priority:
- calendars, dockets, process rules, agency behavior

Failure mode:
- underweights narrative and crowd reflexes

## 3. Narrative Analyst
Purpose:
- detect how the crowd is currently framing the story

Input priority:
- headlines, public framing, market drift, sentiment proxies

Failure mode:
- overreacts to noise if not checked

## 4. Timing Analyst
Purpose:
- evaluate catalyst windows and expected repricing timing

Input priority:
- deadlines, hearing windows, event clocks

Failure mode:
- can force precision where uncertainty remains high

## 5. Contrarian
Purpose:
- challenge consensus and identify lazy assumptions

Input priority:
- dominant swarm claims, crowded market beliefs, divergence anomalies

Failure mode:
- loves being early and wrong

## 6. Microstructure Analyst
Purpose:
- determine whether edge is actually tradable

Input priority:
- spread, depth, venue behavior, price jumps

Failure mode:
- can reject trades that are directionally right but operationally awkward

## 7. Risk Officer
Purpose:
- veto bad bets, size good ones, freeze unclear markets

Input priority:
- ambiguity, correlation, liquidity, bankroll state

Failure mode:
- suppresses aggression too often if thresholds are too tight

## 8. Judge / Forecast Extractor
Purpose:
- synthesize swarm state into operator-ready output

Input priority:
- weighted agent conclusions, contradictions, confidence, historical calibration

Failure mode:
- overcompresses nuance if explanation design is weak

---

# 6. Trigger rules

## Trigger classes

### Class A — Official procedural event
Examples:
- docket item posted
- order issued
- hearing scheduled
- agency memo published

Default action:
- immediate fast rerun

### Class B — Price dislocation
Examples:
- >5 point move in monitoring window
- spread explosion
- linked venue divergence

Default action:
- fast rerun, then deep if unresolved

### Class C — Narrative wave
Examples:
- major headline burst
- spokesperson comment
- crowd sentiment surge

Default action:
- fast rerun with narrative weighting

### Class D — Scheduled catalyst proximity
Examples:
- 24h / 6h / 1h windows before known deadline

Default action:
- scheduled fast rerun, precompute ticket candidates

### Class E — Rule ambiguity event
Examples:
- title and settlement mismatch
- clarification modifies interpretation

Default action:
- freeze or watch; legal-path fast rerun required

---

# 7. Rerun modes

## Fast rerun

### Use when
- event is local and urgent
- world-state can be patched incrementally
- operator needs updated fair value quickly

### Agents
- Resolution Lawyer
- Procedure Analyst
- Narrative Analyst
- Timing Analyst
- Judge
- Microstructure optional

### Target latency
- 15–60 sec

### Output shape
- belief delta
- fair value delta
- confidence delta
- recommended action

## Deep rerun

### Use when
- structure changed
- confidence fractured
- event is major
- linked markets moved together

### Agents
- full roster

### Target latency
- 2–8 min

### Output shape
- full swarm replay
- revised world-state narrative
- recalculated weighting
- risk-adjusted ticket view

---

# 8. Forecast extraction model

## Inputs
- agent probability estimates
- confidence levels
- contradiction graph
- trust weights
- market type weights
- ambiguity penalties
- microstructure tradability filter

## Extraction logic

1. compute role-weighted prior
2. penalize unresolved contradiction clusters
3. apply market-type authority shifts
4. apply ambiguity haircut
5. apply tradability haircut
6. emit fair value and confidence band

## Output contract

```json
{
  "marketId": "string",
  "eventProbability": 0.61,
  "fairValueYes": 0.59,
  "marketPriceYes": 0.44,
  "edge": 0.15,
  "confidence": "high",
  "tradability": "standard",
  "action": "queue-ticket",
  "disagreementScore": 0.27,
  "rationaleSummary": "Crowd is overweighting headline framing and underweighting procedural sequencing.",
  "primaryDrivers": ["docket timing", "settlement wording", "venue divergence"],
  "riskFlags": ["thin book on venue A"]
}
```

---

# 9. Dashboard design spec

## Principle

The dashboard is an operator console, not a graph toy.
The graph is underneath everything.

## Primary views

### 1. Command Center
Purpose:
- control reruns and system modes

Must show:
- trigger feed
- hot markets
- active jobs
- swarm health
- operator commands

### 2. Market Board
Purpose:
- rank live opportunities

Must show:
- venue
- market
- price
- fair value
- edge
- confidence
- latency state
- risk state
- watch/freeze/trade mode

### 3. World Inspector
Purpose:
- inspect graph-derived state for a selected market

Must show:
- institutions
- actors
- filings and events
- claims and counterclaims
- catalyst chain
- linked markets

### 4. Swarm Replay
Purpose:
- show why the forecast changed

Must show:
- round-by-round belief shifts
- coalition patterns
- disagreements
- final extraction

### 5. Risk / Capital Console
Purpose:
- track bankroll and approval queue

Must show:
- cash available
- allocated exposure
- venue balances
- drawdown
- active tickets
- approval gate state
- freeze alerts

## Secondary surfaces

- source audit panel
- agent registry
- linked-market cluster view
- historical calibration page

---

# 10. Safe bankroll framework for $2k–$10k

Even if operator risk tolerance is high, the kernel should default to bounded sizing.

## Capital states
- `watch-only`
- `probe`
- `standard`
- `conviction`
- `frozen`

## Suggested caps

### $2k
- probe: 1–2%
- standard: 3–4%
- conviction max: 5%

### $5k
- probe: 1–2%
- standard: 3–5%
- conviction max: 6%

### $10k
- probe: 1–2%
- standard: 3–5%
- conviction max: 7%

## Hard no-go conditions
- unresolved rule ambiguity
- insufficient liquidity
- correlated overexposure
- stale world-state
- source confidence collapse

---

# 11. Upstream MiroFish → Oracle fork mapping

## Upstream: Graph Building
### Oracle fork:
- market + rules + procedural graph construction

## Upstream: Environment Setup
### Oracle fork:
- market world-state assembly + agent role activation

## Upstream: Simulation
### Oracle fork:
- fast reruns and deep reruns over live market state

## Upstream: Report Generation
### Oracle fork:
- forecast extractor + trade rationale + operator-ready ticket brief

## Upstream: Deep Interaction
### Oracle fork:
- swarm replay + world inspector + agent interrogation

---

# 12. Maya map

“Maya” here is the build map from concept to working system.

## Maya Phase 1 — Kernel skeleton
Build:
- normalized market registry
- event intake
- trigger engine
- world-state schema
- fast rerun path

Done when:
- one policy market can rerun from an official trigger in under 60s

## Maya Phase 2 — Graph + replay
Build:
- graph store
- claim graph
- contradiction tracking
- world inspector
- swarm replay surface

Done when:
- operator can inspect exactly why a forecast moved

## Maya Phase 3 — Deep swarm
Build:
- full 8-agent roster
- trust weighting
- deep reruns
- disagreement surface
- extraction weighting rules

Done when:
- deep rerun output is stronger and more explainable than fast rerun output

## Maya Phase 4 — Risk and tickets
Build:
- risk engine
- ticket builder
- approval queue
- capital console

Done when:
- every actionable idea becomes a bounded, inspectable candidate ticket

## Maya Phase 5 — Learning loop
Build:
- resolved market ingestion
- calibration metrics
- agent performance weights
- subcategory scorecards

Done when:
- the swarm materially updates itself from outcomes instead of just rerunning static logic

---

# 13. Immediate next build sequence

1. implement market registry contracts
2. implement event intake contracts
3. implement trigger decision schema
4. implement world-state patching
5. wire fast rerun path
6. design dashboard views around market board + world inspector + replay
7. add deep rerun + risk engine

---

# 14. Final statement

This fork should not imitate MiroFish cosmetically.
It should inherit the deep idea:

> build a persistent, graph-backed, socially interactive simulation layer for prediction — then specialize it hard for policy, legal, and regulatory markets.

That is the engine.
That is the product.
