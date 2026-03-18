# MiroFish Oracle — Dashboard Spec

## Product role

This dashboard is the operator surface for the prediction kernel.
It is not a marketing page.
It is not a graph art project.
It is a control room.

## Primary navigation

1. Command Center
2. Markets
3. World Inspector
4. Swarm Replay
5. Risk / Capital
6. Agents
7. Calibration

---

## 1. Command Center

### Purpose
Central place to manage active swarm operations.

### Must include
- live trigger feed
- active rerun jobs
- top opportunity cards
- system health
- command composer
- freeze / resume controls

### Key operator actions
- run fast rerun
- run deep rerun
- freeze market
- boost watch priority
- open selected market in World Inspector

---

## 2. Markets

### Purpose
Rank and inspect opportunities across Kalshi and Polymarket.

### Table columns
- market
- venue
- current price
- fair value
- edge
- confidence
- tradability
- rerun freshness
- risk state
- linked market count

### Filters
- venue
- subcategory
- confidence
- edge band
- risk state
- watch priority

### Row click opens
- market detail drawer with ticket summary, linked markets, and latest belief shift

---

## 3. World Inspector

### Purpose
Expose graph-derived state for a selected market.

### Panels
- procedural chain
- institutions / actors
- filings and event timeline
- claims / counterclaims
- source audit
- linked markets

### View types
- timeline
- graph
- document-linked list

### Key operator actions
- annotate claim
- downgrade source trust
- mark ambiguity
- open linked market cluster

---

## 4. Swarm Replay

### Purpose
Show how the swarm reached its conclusion.

### Panels
- round-by-round belief changes
- coalition map
- disagreement intensity
- final extraction summary
- per-agent rationale cards

### Key operator actions
- replay fast rerun
- replay deep rerun
- compare two runs
- inspect belief delta by event

---

## 5. Risk / Capital

### Purpose
Track capital, queue tickets, and enforce bounded control.

### Panels
- bankroll overview
- venue allocations
- open risk by category
- linked exposure clusters
- approval queue
- frozen markets

### Key operator actions
- approve ticket
- reject ticket
- reduce size
- set market freeze
- set venue max exposure

---

## 6. Agents

### Purpose
Inspect persistent swarm identities.

### Per-agent fields
- role
- specialty
- trust weight
- recent accuracy
- current status
- known blind spots
- best market types

### Key operator actions
- adjust influence band
- inspect recent belief shifts
- compare to peer agents

---

## 7. Calibration

### Purpose
Measure whether the system is actually improving.

### Must include
- Brier score
- confidence calibration
- edge realized vs market
- category-specific performance
- no-trade quality
- fast rerun latency
- deep rerun latency

---

## UI laws

1. operator-first
2. market board first, graph second
3. every number should have drill-down
4. every forecast should have replay
5. every action candidate should show risk context
6. graph views must answer a question, not just look smart

---

## Recommended homepage layout

### Row 1
- command composer
- trigger feed
- system health strip

### Row 2
- top opportunity board
- active reruns
- approval queue

### Row 3
- selected market summary
- world-state snapshot
- recent belief changes

### Row 4
- linked market cluster
- capital status
- freeze alerts
