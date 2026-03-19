# MiroFish Oracle — Progress Log

## 2026-03-18

### Current phase
- Phase 1 — Live market spine

### Phase 1 goal
- Build a real, focused live market board for policy, legal, regulatory, and legislative milestone markets.

### Completed so far
- Created local dashboard app scaffold.
- Added prediction kernel spec, fork map, dashboard spec, and architecture primitive docs.
- Wired dashboard to API-backed local server routes.
- Added architecture primitives:
  - `ModelBackendSelector`
  - `GraphStore`
  - `RetrievalService`
- Added focused live market ingestion for Kalshi and Polymarket.
- Verified `/api/markets` can return live focused markets.
- Added Boris-style trigger engine scaffold, but Phase 2 is intentionally paused until Phase 1 is complete.

### Phase 1 still open
- Persistent market snapshot storage
- Ingestion health object
- Market freshness metadata
- Deterministic refresh policy / TTL
- Dashboard surface for ingestion state and degraded mode

### Notes
- Do not advance to Phase 2 until Phase 1 exit criteria are satisfied.
- Progress update cadence changed from every 5 minutes to every 10 minutes at user request.
- A recurring 10-minute progress reminder cron job is now active for the main session.

### Current progress update
- Backend closeout landed:
  - persistent snapshot storage on disk
  - ingestion health object
  - freshness metadata
  - deterministic refresh / TTL behavior
  - `/api/markets/health` and `/api/markets/snapshot`
- Frontend closeout landed:
  - app now reads the real `/api/markets` response shape
  - top-level ingestion/live/fallback/degraded visibility
  - freshness surfaced in the header and market board
- Final verification pass completed:
  - running app renders markets correctly
  - fallback mode is now represented truthfully instead of being mislabeled as live
  - focused fallback markets render in the board and selected-market panel
- One focused ingestion adjustment was added to keep Phase 1 honest:
  - focus filtering now keys off market title/subtitle instead of broad rules text, preventing irrelevant sports/noise markets from dominating the board
- Phase 1 is now considered complete enough to close.
