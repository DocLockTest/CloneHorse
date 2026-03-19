# Phase 1 Scope Guard — Closeout Only

Date: 2026-03-18

## Which Phase 1 definition this note uses

There are two Phase 1s in the repo right now:

1. `PREDICTION-KERNEL-SPEC.md` defines Phase 1 as the broader **kernel skeleton**.
2. `OBSIDIAN-PROGRESS.md` defines the current active Phase 1 as the narrower **live market spine**.

For closeout, use the **current active definition in `OBSIDIAN-PROGRESS.md`**. Do not reopen broader kernel-skeleton work just because some Phase 2+ UI and scaffolds already exist.

## Current reality

What is already real and should count as done for this phase:

- live focused venue ingestion exists for Kalshi + Polymarket via `src/server/market-ingestion.mjs`
- `/api/markets` returns normalized focused markets with fallback behavior
- the dashboard is API-backed and renders live market cards
- source-state and degraded-mode data already exist in the `/api/markets` payload under `ingestion`
- trigger engine, graph store, retrieval service, replay, agents, risk, and calibration surfaces already exist as scaffolds, but they are **not required to raise the Phase 1 bar**

## Phase 1 must be complete before closeout

Only these items should block Phase 1 closeout:

### 1. Persistent market snapshot storage
Minimum acceptable outcome:
- store the latest normalized focused market snapshots outside in-memory process state
- keep enough history to support deterministic delta comparison across restarts
- define the storage location and retention plainly in repo docs

Proof of done:
- one documented snapshot store exists
- a restart does not erase the prior comparison baseline
- trigger generation can read prior snapshots without depending only on process memory

### 2. Deterministic refresh policy / TTL
Minimum acceptable outcome:
- one explicit polling cadence for live ingestion
- one explicit freshness TTL for when data becomes stale
- one explicit fallback rule when TTL is breached or sources fail

Proof of done:
- the policy is encoded in code or config, not just prose
- `freshnessSec` is computed from real timestamps, not hard-coded `0`
- stale vs live vs fallback behavior is predictable

### 3. Honest ingestion health object
Minimum acceptable outcome:
- expose source status, last attempt, last success, duration, failed sources, mode, degraded flag, and operator note as the canonical ingestion state
- ensure this object is stable and documented

Proof of done:
- `GET /api/markets` always returns a consistent `ingestion` object
- source states clearly distinguish `live`, `degraded`, `down`, and fallback mode
- docs match the actual response shape

### 4. Dashboard visibility for ingestion state and degraded mode
Minimum acceptable outcome:
- render ingestion mode and degraded status visibly in the UI
- show per-source status and freshness in at least one operator-facing panel
- make fallback mode obvious enough that an operator cannot confuse fallback data for healthy live breadth

Proof of done:
- an operator can see whether the board is live, degraded, or fallback without opening devtools
- the UI shows stale/fresh timing and failed sources
- the operator note from ingestion is surfaced somewhere visible

## Explicitly not required for Phase 1

These should wait for Phase 2 or later, even if partial scaffolds already exist:

- better cross-venue clustering heuristics
- stronger category classifier
- official event triggers from dockets or agencies
- trigger suppression and deduping
- richer world-state patching
- graph store expansion beyond the current memory scaffold
- meaningful swarm replay fidelity
- deep reruns
- trust weighting
- risk engine hardening
- ticket workflow hardening
- calibration and learning-loop realism
- rules-text parsing into world-state objects

## Obvious scope creep to reject right now

If someone proposes any of the following before closing Phase 1, cut it:

- making replay, agents, or calibration "real" before ingestion reliability is finished
- expanding the dashboard into more views instead of making the current market board operationally honest
- improving model logic, swarm behavior, or prediction quality before persistence + freshness are trustworthy
- building official-source trigger intake before the market spine has stable snapshot persistence and TTL behavior
- polishing risk or ticket execution paths before operators can trust whether market data is fresh

## Hard recommendation

Do **not** redefine Phase 1 upward just because later-phase scaffolds are already on screen.

Phase 1 should close once the market spine is:
- persistent
- freshness-aware
- operationally inspectable
- visibly honest in degraded mode

Nothing else should block closeout.

## Strict Phase 1 checklist

- [ ] snapshot persistence implemented for normalized focused market data
- [ ] trigger baseline survives server restart
- [ ] refresh cadence documented and encoded
- [ ] freshness TTL documented and encoded
- [ ] `freshnessSec` computed from real timestamps
- [ ] fallback rule on stale or failed ingestion is deterministic
- [ ] canonical `ingestion` object documented
- [ ] per-source status includes last attempt, last success, duration, status, and error
- [ ] dashboard shows live vs degraded vs fallback state
- [ ] dashboard shows freshness timing
- [ ] dashboard shows failed source names and operator note
- [ ] docs updated so Phase 1 exit criteria are unambiguous
