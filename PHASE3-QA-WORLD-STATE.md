# Phase 3 QA — World-state truthfulness review

Date: 2026-03-18

Scope: generated world-state quality, with emphasis on rules text, catalysts, source audit, and category-specific structured extraction.

## Verdict

The current world-state surface is **presentation-complete but truth-incomplete**.

It is useful as a scaffold, but it would be misleading if treated as generated or production-trustworthy because the visible fields are not yet derived from live source documents, venue settlement text, or category-specific extraction logic.

## What would make generated world-state misleading or broken

### 1. Rules text is not actually represented as structured resolution logic
A world-state is misleading if it summarizes a market without making the settlement rules legible.

Current risk in repo:
- `src/server/market-ingestion.mjs` stores `rulesPrimary`, but `/api/world-state` does not expose parsed rule constraints.
- `server.mjs` serves `kernelData.worldStates` directly.
- `src/data/contracts.js` world-state schema has no fields for resolution criteria, exclusions, timing boundary, venue-specific wording, or ambiguous clauses.

User-visible failure mode:
- operator sees confident claims/catalysts while the actual contract wording may resolve on a narrower condition.
- especially dangerous for court and agency markets where “block”, “approve”, “effective”, or deadline wording matters more than narrative summary.

Minimum fix standard:
- include structured settlement fields such as `resolutionCriteria`, `explicitExclusions`, `deadlineBasis`, `venueRuleText`, and `ruleAmbiguities`.

### 2. “Graph-derived state” label overstates reality
A world-state is broken if UI language implies live graph-backed derivation when the payload is hard-coded.

Current risk in repo:
- `src/App.vue` panel kicker says `Graph-derived state`.
- `server.mjs` returns static `kernelData.worldStates` from `/api/world-state`.
- `src/components/WorldInspector.vue` renders the object with no provenance, freshness, or generated-at metadata.

User-visible failure mode:
- operator can reasonably infer the state was assembled from current retrieval/graph evidence when it was not.

Minimum fix standard:
- either relabel as scaffold/demo state, or attach provenance fields showing `source=seeded`, `generatedAt`, `derivedFrom`, and document counts.

### 3. Source audit is too weak to audit
A source audit is misleading if it contains confidence-flavored text but not enough information to verify origin.

Current risk in repo:
- `sourceAudit` entries are free-text labels like `Federal docket update — high confidence`.
- there are no document ids, URLs, timestamps, issuer names, retrieval methods, or evidence-to-claim mapping.

User-visible failure mode:
- operator cannot tell whether a claim comes from an official filing, reporter chatter, analogy, or internal summary.
- “high confidence” looks rigorous while remaining non-auditable.

Minimum fix standard:
- source audit items should be structured with at least: `label`, `sourceType`, `publisher`, `publishedAt`, `url/documentId`, `appliesTo`, and `confidenceReason`.

### 4. Catalysts are underspecified and can become fake precision
Catalysts are broken if they are generic nouns instead of actionable, time-bounded events.

Current risk in repo:
- catalysts are plain strings such as `staff comment cycle` or `committee markup`.
- no expected date, dependency, status, or relation to settlement window.

User-visible failure mode:
- catalyst list looks operationally useful but cannot tell the operator what is pending, confirmed, missed, or already priced.

Minimum fix standard:
- catalysts should carry `type`, `expectedAt`, `status`, `dependency`, `marketImpactPath`, and `sourceRef`.

### 5. No category-specific extraction means the same schema hides different failure modes
A world-state is misleading if it treats courts, agencies, and legislatures as the same extraction problem.

Current risk in repo:
- `classifyMarket()` in `src/server/market-ingestion.mjs` recognizes subcategories.
- but world-state objects do not branch into category-specific structured fields.

Required category-specific structure:
- `court-ruling`: court level, case posture, relief type, briefing status, hearing status, order window.
- `agency-approval`: filing/amendment stage, statutory clock, staff posture, public comment status, required agency action.
- `legislative-milestone`: chamber, committee stage, whip uncertainty, calendar gate, floor vote dependency.
- `implementation-delay`: original effective date, stay/block authority, implementation trigger, compliance deadline.

User-visible failure mode:
- important procedural blockers disappear into generic bullets, causing false comparability across markets.

### 6. Claims and counterclaims are not evidence-bound
Claims are misleading if they are not attached to specific supporting or contradicting sources.

Current risk in repo:
- graph store has `Claim` nodes and `DEPENDS_ON` edges in `src/server/graph-store.mjs`.
- but visible world-state claims in `/api/world-state` are static prose, not sourced graph outputs.

User-visible failure mode:
- claims read like conclusions rather than inspectable reasoning.

Minimum fix standard:
- each claim/counterclaim should reference `sourceRefs`, `supportingEvents`, and optional `contradictsClaimIds`.

### 7. No freshness or generation metadata on world-state itself
A world-state is misleading if market freshness is shown but world-state freshness is omitted.

Current risk in repo:
- market ingestion exposes freshness metadata.
- world-state endpoint does not expose freshness, generated time, or stale/fallback mode.

User-visible failure mode:
- operator may assume world-state updated with the latest trigger pass when it may be days or weeks out of sync.

Minimum fix standard:
- include `generatedAt`, `freshness`, `sourceMode`, and `backingSnapshotKey` on the world-state object.

## Highest-priority user-visible risks

1. **False confidence from static summaries** — the UI can make seeded prose look like live machine-generated understanding.
2. **Resolution mismatch risk** — no structured settlement/rules extraction means the most important contract constraints are not surfaced.
3. **Audit failure** — source audit cannot be checked, so operators cannot distinguish official evidence from narrative color.
4. **Catalyst ambiguity** — catalysts look actionable but are not time-bounded or stateful.
5. **Category flattening** — court, agency, and legislative markets lose the exact procedural fields that drive actual repricing.

## Concrete file references

- `server.mjs` — `/api/world-state` serves static `kernelData.worldStates`.
- `src/App.vue` — labels panel as `Graph-derived state`.
- `src/components/WorldInspector.vue` — renders claims/catalysts/audit with no provenance or freshness context.
- `src/data/contracts.js` — current world-state schema is too flat for structured extraction.
- `src/server/market-ingestion.mjs` — captures some raw rule text as `rulesPrimary` but does not parse it into world-state.
- `src/server/graph-store.mjs` — graph primitives exist, but visible world-state does not come from them.
- `LIVE-INGESTION.md` — explicitly lists `rules-text parsing into world-state objects` as a future upgrade.
- `PHASE-2-SCOPE-GUARD.md` — explicitly deferred realistic world-state work in Phase 2.

## QA recommendation

Do not call this output generated world-state without one of these changes:

1. downgrade the language to scaffold/demo state, or
2. add provenance + freshness metadata immediately, then phase in structured extraction by category.

If Phase 3 is meant to cross the truthfulness threshold, the first must-have is not prettier summaries. It is **structured rule extraction plus auditable source references**.
