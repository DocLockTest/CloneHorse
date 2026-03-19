# Phase 1 QA — live market spine closeout

## Release-blocking findings

1. **Market board is blank in the running app because the frontend/backend contract is mismatched.**
   - Running UI at `http://localhost:4178` renders no market cards and no selected market details.
   - `src/App.vue` expects `/api/markets` to return `{ markets, freshness, health, source }` and reads `marketData.markets`.
   - The app actually running on `:4178` is returning a bare array from `/api/markets`, so `markets.value` becomes `[]` and `selectedMarketId` stays `null`.
   - User-visible result: command center shows blank market fields, market board is empty, world inspector and swarm replay stay empty.

2. **The dashboard still claims it is “backed by API routes” and visually looks healthy even when the live spine is absent.**
   - There is no top-level banner, badge, or inline status showing whether data is `live`, `stale-cache`, or `fallback`.
   - The current UI hides the truth that the primary market surface is nonfunctional.

## Missing to consider Phase 1 complete

### Freshness / status surfaces
- Show a top-level ingestion banner with:
  - source (`live`, `stale-cache`, `fallback`)
  - captured time / age
  - degraded status
  - failed sources (Kalshi / Polymarket)
  - operator note / error summary
- Surface market-level freshness and whether a market is live, cached, or seeded fallback.
- Distinguish **market price freshness** from **swarm rerun freshness** so stale quotes are not mistaken for fresh analysis.

### Degraded / empty behavior
- Add explicit empty states for:
  - no focused markets
  - no world state for selected market
  - no swarm runs yet
  - no triggers yet
  - no tickets for selected market
- Blank panels currently read as broken or misleadingly complete.

### Misleading controls / affordances
- The two “Run Fast Rerun” buttons and “Open Swarm Config” appear actionable but do nothing.
- If Phase 1 is informational-only, disable them and label them as stubbed; otherwise wire them up.

### Data trust / truthfulness gaps
- Snapshot KPI cards (`activeMarkets`, `openPositions`, `bankroll`, etc.) are static kernel data and can look authoritative even when the market spine is degraded.
- Those KPIs need freshness/source labeling or they should be visually separated from live-ingestion status.
- Triggers, world state, and swarm replay are not clearly tied to the same snapshot age as the quotes.

### Verification gaps
- Need an explicit test/repro for:
  - live mode
  - stale cached mode
  - fallback mode
  - partial vendor outage (one source degraded)
  - empty focused-market result
- Need a smoke test that fails if `/api/markets` response shape no longer matches what `src/App.vue` expects.

## Files implicated
- `src/App.vue`
- `src/api.js`
- `server.mjs`
- `src/server/market-ingestion.mjs`
- `src/components/MarketBoard.vue`
- `src/components/TriggerFeed.vue`
- `src/components/WorldInspector.vue`
- `src/components/SwarmReplay.vue`
- `src/components/TopBar.vue`
