# Live Ingestion

## What is live now

The server now exposes focused live market ingestion through:

- `GET /api/markets`

This route currently:
- fetches Kalshi public markets from `https://api.elections.kalshi.com/trade-api/v2/markets`
- fetches Polymarket public markets from `https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100`
- normalizes both venue formats into one market shape
- filters to our target market categories
- falls back to seeded internal markets if live ingestion fails

## Focus categories

The ingestion filter is tuned for:
- court-ruling
- agency-approval
- implementation-delay
- legislative-milestone

## Current implementation notes

This is intentionally V1:
- keyword and text-pattern classification
- no authentication required
- no persistent caching yet
- no live trigger scoring yet
- no venue-linking heuristics yet

## Next upgrades

1. stronger category classifier
2. venue-linked market clustering
3. caching and polling windows
4. trigger generation from market deltas
5. rules-text parsing into world-state objects
