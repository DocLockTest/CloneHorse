# Phase 2 Scope Guard — Trigger Phase Only

Date: 2026-03-18

## What Phase 2 is in this repo

Phase 2 is **not** “make the whole kernel real.”
Phase 2 is the narrow trigger-system follow-through that should exist immediately after the live market spine becomes trustworthy.

The job here is simple:

> make trigger generation persistent, accumulative, deduped, suppressible, and operationally truthful

Nothing more should be allowed to sneak in under the Phase 2 label.

## Phase 2 thesis

Phase 1 made market ingestion honest.
Phase 2 should make the trigger feed honest.

That means:

- triggers survive restart
- triggers accumulate across refresh windows instead of disappearing every request
- repeated detections do not spam the operator as fake novelty
- suppressed triggers are visibly suppressed, not silently erased
- the feed tells the truth about what is new, repeated, active, cooled off, or suppressed

If the operator cannot trust the trigger feed, the rest of the system is theater.

## Exact scope for Phase 2

Only these four deliverables belong in Phase 2.

### 1. Persistent trigger history

Minimum acceptable outcome:
- trigger events are written to durable storage
- restart does not erase prior trigger history
- each stored trigger records enough context to explain why it fired

Minimum trigger record should include:
- stable trigger id
- trigger class
- market id or linked market group id
- source snapshot reference or comparison window reference
- happened-at timestamp
- score / severity
- rerun recommendation
- current lifecycle state
- suppression metadata if applicable

Proof of done:
- a trigger fired before restart is still present after restart
- the API can return recent trigger history without recomputing the past from scratch
- docs name the storage location and retention rule

### 2. Accumulation across refresh windows

Minimum acceptable outcome:
- the system builds a rolling trigger log instead of returning only the latest scan result
- repeated detection of the same condition updates lifecycle state rather than creating fake first-seen events every time
- trigger history preserves first seen, last seen, and occurrence count

Proof of done:
- one continuing price dislocation shows as one accumulated trigger thread, not five unrelated clones
- operator can distinguish newly fired triggers from still-active recurring ones
- cooling or resolved triggers remain visible long enough for auditability

### 3. Deterministic dedupe and suppression

Minimum acceptable outcome:
- explicit matching rules decide when two detections are the same trigger family
- explicit suppression rules prevent noisy repetitive surfaces
- suppression never destroys history; it only changes visibility/state

Required behavior:
- dedupe keys are documented and stable
- suppression has an observable reason code
- suppressed triggers remain queryable for audit
- repeated spam does not inflate “new trigger” counts

Proof of done:
- the same venue divergence seen across adjacent refreshes does not flood the feed
- operator can tell whether a trigger is new, repeated, suppressed, cooled, or resolved
- suppression logic is rule-based and inspectable, not hidden magic

### 4. Trigger feed truthfulness

Minimum acceptable outcome:
- the API and UI describe trigger state honestly
- the feed distinguishes new vs repeated vs suppressed vs resolved
- the feed clearly reflects source snapshot timing and freshness context
- counts and labels do not imply novelty where only recurrence exists

The operator must be able to answer:
- Is this actually new?
- Is this the same thing firing again?
- Was this suppressed?
- Is this still active or already cooling off?
- What snapshot window produced this?

Proof of done:
- feed labels match backend lifecycle state
- “new” counts only mean first-seen triggers in the active review window
- suppressed items are not mislabeled as missing or resolved
- feed timestamps and snapshot references are visible enough for audit

## Explicitly out of scope for Phase 2

Do **not** let any of the following ride along with this phase:

### Deeper world-state work
- graph-backed world-state patching
- claim extraction
- contradiction tracking
- procedural chain construction
- rules-text parsing into world-state objects
- world inspector realism beyond current scaffolds

### Swarm behavior work
- deep rerun orchestration
- richer fast-rerun logic
- agent trust weighting
- disagreement surfaces
- replay fidelity upgrades
- forecast extraction improvements
- swarm memory realism

### Broader intelligence upgrades
- official docket / agency event intake beyond what is strictly required to store trigger records
- smarter market clustering beyond what is minimally necessary for deterministic dedupe keys
- better prediction quality work
- risk engine hardening
- ticket workflow changes
- calibration loop changes

If someone says “while we are here, let’s also make world-state updates real” or “let’s connect suppression to swarm memory,” the answer is no.

## Why this boundary matters

Phase 2 should still be Boris-style:

- one narrow system responsibility
- deterministic rules
- inspectable state transitions
- durable history
- no pretending the rest of the intelligence stack is already real

The trigger layer should become a trustworthy operational ledger before it becomes a clever orchestration layer.

## Hard recommendation

Treat Phase 2 as a **trigger ledger phase**, not an intelligence phase.

Close it when the trigger feed becomes:
- persistent
- accumulative
- deduped
- suppressible
- truthful

Do not block closeout on real graph state, real swarm behavior, or deeper model logic.

## Strict Phase 2 checklist

- [ ] durable trigger history storage exists
- [ ] trigger history survives server restart
- [ ] trigger record schema is documented
- [ ] each trigger stores first seen, last seen, and occurrence count
- [ ] trigger records carry snapshot/window reference
- [ ] trigger lifecycle state is explicit and documented
- [ ] trigger log accumulates across refresh windows
- [ ] repeated detections update existing trigger threads instead of creating fake novelty
- [ ] cooled/resolved triggers remain visible for audit for a defined retention window
- [ ] dedupe key rules are documented and deterministic
- [ ] suppression rules are documented and deterministic
- [ ] suppression writes reason codes and preserves history
- [ ] suppressed triggers remain queryable/auditable
- [ ] trigger counts exclude repeated detections from “new” totals
- [ ] API exposes enough state to distinguish new, repeated, suppressed, cooled, and resolved
- [ ] trigger feed labels match backend lifecycle state
- [ ] trigger feed shows enough timing/freshness context to audit why an item appears
- [ ] docs explicitly defer world-state buildout and swarm behavior to later phases
