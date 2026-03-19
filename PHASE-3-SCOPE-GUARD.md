# Phase 3 Scope Guard — World-State Spine Only

Date: 2026-03-18

## What Phase 3 is in this repo

Phase 3 is **not** “make the whole intelligence layer real.”
Phase 3 is the narrow follow-through that turns triggerable market changes into a durable, inspectable **world-state spine**.

The job here is simple:

> convert market settlement wording and category-specific evidence into a bounded world-state record with explicit catalysts and source audit

Nothing more should be allowed to hide under the Phase 3 label.

## Phase 3 thesis

Phase 1 made market ingestion honest.
Phase 2 should make the trigger feed honest.
Phase 3 should make the world inspector honest.

That means:

- settlement and rules text are parsed into explicit structured fields
- each market can generate a deterministic world-state record from market metadata plus approved evidence inputs
- extraction is category-specific instead of one generic blob parser
- catalysts are represented as a timeline, not a loose bullet pile
- every meaningful field can be traced back to sources with confidence and provenance

If the operator cannot tell **what the market is actually asking, what procedural state we think exists, what could move it next, and why we believe that**, the rest of the stack is theater.

## Exact scope for Phase 3

Only these five deliverables belong in Phase 3.

### 1. Rules-text parsing into world-state fields

Minimum acceptable outcome:
- parse market title, subtitle, resolution criteria, and venue rules text into a stable structured record
- extract the actual settlement target, decision boundary, deadline or end condition, relevant institution, and obvious procedural verbs
- preserve the raw source text alongside parsed output for audit

Minimum parsed record should include:
- stable market-world-state id
- market id and venue
- raw rules text snapshot reference
- settlement target
- decision condition
- deadline / terminal date if one exists
- primary institution or authority
- parser confidence and parser notes

Proof of done:
- the same market text parses to the same normalized fields across reruns
- parser output keeps the raw text reference instead of replacing it
- the operator can inspect both parsed fields and original rules text lineage

### 2. Market-to-world-state generation

Minimum acceptable outcome:
- generate one durable world-state object per tracked market from market metadata, parsed rules text, and approved extracted evidence
- define the world-state schema clearly enough that downstream systems do not guess
- support incremental patching of the record without pretending full graph realism exists yet

Minimum world-state record should include:
- world-state id
- market linkage
- category
- procedural state summary
- actors
- institutions
- claims
- counterclaims
- catalyst timeline
- source audit entries
- last-updated timestamp

Proof of done:
- each tracked market can produce a stored world-state record
- update paths modify the existing record instead of creating opaque freeform summaries
- docs name the schema and storage location plainly

### 3. Category-specific extraction

Minimum acceptable outcome:
- extraction rules differ by market category instead of one universal prompt or parser
- at minimum, support the repo’s core policy/legal/regulatory categories with explicit field mapping
- extraction contracts say what each category must produce and what it may leave unknown

Minimum first categories:
- court-ruling / injunction / appeal markets
- agency approval / rule / enforcement markets
- legislative milestone / passage / markup / recess markets
- implementation-delay / deadline / procedural milestone markets

Required behavior:
- each category has explicit extraction fields
- unknown or missing fields remain marked unknown instead of hallucinated
- category selection logic is documented and inspectable

Proof of done:
- a court market and a legislative market do not emit the same lazy generic record shape
- extractor output shows category-specific fields with null/unknown handling
- docs specify what counts as minimally complete per category

### 4. Catalyst timeline

Minimum acceptable outcome:
- catalysts are stored as ordered timeline entries, not just unordered strings
- each catalyst states expected date or window when available, type, source basis, and confidence
- timeline distinguishes scheduled events from contingent watchpoints

Minimum catalyst entry should include:
- catalyst id
- world-state id
- type
- label
- expected date or window
- status
- confidence
- source references
- note on why it matters to repricing

Proof of done:
- the operator can see what is upcoming, what is contingent, and what has already passed
- catalysts can be sorted and filtered by timing and status
- timeline entries remain attached to source audit references

### 5. Source audit

Minimum acceptable outcome:
- every extracted claim, counterclaim, and catalyst can point to one or more explicit sources
- source audit records store provenance, recency, confidence, and extraction method
- conflicting sources remain visible instead of being silently collapsed

Minimum source audit record should include:
- source id
- source type
- URL or document reference
- captured-at timestamp
- extraction method
- confidence
- linked world-state fields
- contradiction or dispute note if applicable

Proof of done:
- an operator can trace a world-state field back to supporting source records
- stale or weak evidence is visibly weaker than primary procedural sources
- conflicting evidence survives as audit state instead of disappearing into summary prose

## Explicitly out of scope for Phase 3

Do **not** let any of the following ride along with this phase.

### Deep swarm behavior
- richer agent deliberation
- trust weighting changes
- memory realism
- disagreement engines
- forecast extraction upgrades
- multi-round belief mutation
- adaptive swarm learning

### Replay richness
- cinematic replay UI
- full belief-delta timelines
- richer interrogation surfaces
- agent-by-agent narrative playback
- deeper rerun orchestration tied to every world-state patch

### Execution logic
- trade sizing changes
- approval workflow expansion
- automated order routing
- capital policy changes
- ticket-generation logic upgrades
- execution heuristics connected to world-state confidence

### Broader graph ambitions
- full graph-native causality engine
- contradiction propagation across the whole market network
- linked-market simulation depth beyond minimal references
- ontology expansion for its own sake

If someone says “while we are here, let’s also make the swarm respond to world-state changes in a more lifelike way” or “let’s connect world-state confidence directly into execution,” the answer is no.

## Why this boundary matters

Phase 3 should still be Boris-style:

- one narrow system responsibility
- deterministic schema first
- inspectable extraction rules
- explicit provenance
- no pretending the swarm or execution layer is already intelligent just because the world inspector looks richer

The world-state layer should become a trustworthy structured ledger before it becomes a clever simulation engine.

## Hard recommendation

Treat Phase 3 as a **world-state spine phase**, not a swarm phase and not an execution phase.

Close it when the world-state layer becomes:
- parsed
- generated
- category-specific
- timeline-based
- auditable

Do not block closeout on deep replay, deep swarm behavior, or trading logic.

## Strict Phase 3 checklist

- [ ] rules text is stored and referenced as raw source input
- [ ] parser output includes settlement target, decision condition, deadline/end condition, institution, and parser confidence
- [ ] parser output is deterministic across reruns for unchanged input
- [ ] durable world-state storage exists per tracked market
- [ ] world-state schema is documented with explicit required fields
- [ ] market-to-world-state generation updates an existing record instead of producing opaque freeform summaries
- [ ] category classification logic is documented and inspectable
- [ ] court-ruling extraction contract exists
- [ ] agency/regulatory extraction contract exists
- [ ] legislative/procedural extraction contract exists
- [ ] unknown fields remain explicit unknown/null instead of inferred fiction
- [ ] catalyst entries are stored as ordered timeline records
- [ ] each catalyst records timing/window, type, confidence, and why it matters
- [ ] catalyst timeline distinguishes scheduled events from contingent watchpoints
- [ ] source audit records exist for extracted claims, counterclaims, and catalysts
- [ ] source audit stores provenance, recency, extraction method, and confidence
- [ ] conflicting evidence remains visible in audit state
- [ ] operator-facing docs explicitly defer deep swarm behavior
- [ ] operator-facing docs explicitly defer replay richness
- [ ] operator-facing docs explicitly defer execution logic
