# Live Ingestion

## What is live now

The server now exposes focused live market ingestion through:

- `GET /api/markets`
- `GET /api/markets?refresh=1`
- `GET /api/markets/health`
- `GET /api/markets/snapshot`
- `GET /api/health`

## What changed in Phase 1 closeout

The ingestion path is now one explicit service with three jobs:

1. fetch focused live markets from Kalshi and Polymarket
2. persist the last good snapshot to disk at `data/live-market-snapshot.json`
3. serve deterministic cache behavior with explicit freshness and health metadata

No fake orchestration. Just a clear service with a saved snapshot and visible state.

## Deterministic refresh / TTL rules

- refresh interval: `120_000ms`
- TTL: `900_000ms`
- request timeout per venue: `8_000ms`

Behavior:

- if the stored snapshot is still fresh, `/api/markets` serves it directly
- if the snapshot is stale, the service performs a live refresh before responding
- if live refresh fails but the saved snapshot is still inside TTL, the service serves the stale snapshot and marks health accordingly
- if there is no usable snapshot inside TTL, the service falls back to seeded internal markets
- `?refresh=1` forces a synchronous refresh attempt

## Response shape highlights

`GET /api/markets` now includes:

- `source`
- `capturedAt`
- `errors`
- `freshness`
- `health`
- `markets`

Each market now carries:

- `freshness`
- `rerunFreshnessSec`
- `sourceUrl`

## Health object

`GET /api/markets/health` and `GET /api/health` expose ingestion state including:

- status
- source
- snapshot path
- refresh interval / TTL
- last attempt / success / failure timestamps
- last duration
- failure counters
- last error
- market count
- snapshot age and freshness state

## Focus categories

The ingestion filter is still tuned for:

- court-ruling
- agency-approval
- implementation-delay
- legislative-milestone

## Current implementation notes

Still intentionally simple:

- keyword and text-pattern classification
- no authentication required
- persisted last-good snapshot instead of a database
- no live trigger scoring yet
- no venue-linking heuristics yet beyond the existing trigger layer

## Next upgrades

1. stronger category classifier
2. venue-linked market clustering
3. trigger generation from market deltas against persisted history windows
4. rules-text parsing into world-state objects
5. optional operator-triggered deep refresh lanes
