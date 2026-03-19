# Phase 2 QA — trigger history and replay trust

## Release-blocking risks

1. **Trigger history disappears or rewrites itself across restart, so replay is not trustworthy.**
   - `src/server/trigger-engine.mjs` keeps previous prices only in `previousById` process memory.
   - After a server restart, `/api/triggers` loses baseline context and stops emitting price-dislocation history until another fresh comparison exists.
   - User-visible failure: operators see an empty or incomplete trigger feed and may assume nothing moved.

2. **Trigger timestamps are request-time artifacts, not event-time facts.**
   - Each `/api/triggers` request calls `triggerEngine.evaluate(...)` and stamps new `Date.now()` / `nowIso()` values.
   - The same underlying market state can produce different trigger IDs and `happenedAt` values on refresh.
   - User-visible failure: history ordering, dedupe, and replay provenance become misleading because triggers look newly created each poll.

3. **Trigger feed has no durable history at all; it only shows whatever the latest evaluation generated.**
   - `server.mjs` returns freshly generated triggers instead of a persisted event log.
   - There is no acknowledged/closed/completed lifecycle for generated triggers.
   - User-visible failure: operators cannot tell whether a trigger already fired, reran, or was superseded.

4. **Replay is not causally tied to the trigger being shown.**
   - `src/App.vue` loads `/api/triggers`, `/api/world-state`, and `/api/swarm-runs` independently.
   - `/api/swarm-runs` serves static `kernelData.swarmRuns`; it is not keyed to a trigger id or generated event.
   - User-visible failure: the UI can imply that the displayed replay was caused by the visible trigger when that linkage does not exist.

5. **Cross-venue divergence logic can silently miss true comparables and mislead on replay coverage.**
   - `#normalizeComparableKey()` in `src/server/trigger-engine.mjs` just normalizes title text and truncates to 80 chars.
   - Comparable markets with wording differences across venues will not cluster; non-equivalent markets with similar titles may cluster.
   - User-visible failure: important divergence triggers are missed, or noisy fake divergences appear explainable when they are not.

## Concise QA punch list

- Verify trigger history survives server restart with identical prior snapshot context.
- Verify repeated GETs to `/api/triggers` without new market data do **not** mint new IDs or new `happenedAt` timestamps.
- Verify one market move creates one durable trigger record, not a fresh clone every poll.
- Verify trigger lifecycle fields exist and progress truthfully: detected, queued, running, completed, dismissed, superseded.
- Verify replay rows are linked to a concrete `triggerId` and expose input snapshot time, replay start time, and replay completion time.
- Verify selected trigger and selected replay stay in sync when switching markets or refreshing the page.
- Verify empty states distinguish:
  - no triggers yet
  - trigger history unavailable
  - replay not run yet
  - replay failed
- Verify stale/fallback market snapshots do not present generated triggers as fresh live events.
- Verify restart behavior when only one venue is available: prior baselines, divergence triggers, and replay links should remain truthful.
- Verify comparator clustering on near-duplicate cross-venue markets with title wording drift.
- Verify keyboard/mobile usability of trigger feed once history grows beyond a handful of items.
- Add a regression test around `/api/triggers` idempotency and replay-to-trigger linkage.

## Files implicated

- `src/server/trigger-engine.mjs`
- `server.mjs`
- `src/App.vue`
- `src/components/TriggerFeed.vue`
- `src/components/SwarmReplay.vue`
- `src/server/market-ingestion.mjs`

## What would make history/replay misleading

- request-time trigger generation instead of persisted event-time records
- volatile IDs/timestamps across refreshes
- loss of trigger baseline across restart
- replay records without explicit trigger provenance
- market freshness and replay freshness presented as if they are the same clock
