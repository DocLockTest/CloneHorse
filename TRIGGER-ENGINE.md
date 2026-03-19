# Trigger Engine

## Boris method

This slice follows the Boris code method:

- one explicit service
- deterministic rules first
- explainable output objects
- stateful but minimal memory
- no hidden magic
- easy to replace later

## Current implementation

File:
- `src/server/trigger-engine.mjs`

Route:
- `GET /api/triggers`

## Current trigger types

### 1. Price dislocation
Fires when a market moves meaningfully between snapshots.

Thresholds:
- 3 points → fast rerun candidate
- 10 points → deep rerun candidate

### 2. Venue divergence
Fires when similar cross-venue markets diverge materially.

Thresholds:
- 8 points → fast rerun candidate
- 12 points → deep rerun candidate

## Why this is Boris-style

- the rules are visible
- the thresholds are editable
- the trigger object is simple and replayable
- the engine does not pretend to be intelligent before it earns it

## Next upgrades

1. persistent snapshot storage
2. better market clustering across venues
3. time-windowed delta scoring
4. official event triggers from dockets and agency sources
5. trigger suppression and deduping
