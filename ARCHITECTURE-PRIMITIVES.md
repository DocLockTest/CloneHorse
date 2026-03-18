# Architecture Primitives

These are the three backend primitives adopted into MiroFish Oracle after reviewing MiroClaw, specialized for our policy / legal / regulatory market focus.

## 1. ModelBackendSelector

Purpose:
- choose which model backend should handle a task
- preserve flexibility without letting backend choice leak everywhere

Focused use:
- deep reruns for court, agency, and legislative markets
- fast reruns for urgent market updates
- rule parsing for settlement wording and procedure

Current scaffold:
- `src/server/model-backend-selector.mjs`

## 2. GraphStore

Purpose:
- abstract graph access away from business logic
- allow Neo4j or other graph implementations later
- expose market world graph, claim neighborhood, linked markets, and actor subgraphs

Focused use:
- procedural world-state
- claims and contradictions
- linked market causality
- institution and actor views

Current scaffold:
- `src/server/graph-store.mjs`

## 3. RetrievalService

Purpose:
- combine graph, keyword, and semantic retrieval policies into one market-facing service layer
- tell the kernel what evidence to look for in our chosen categories

Focused use:
- docket and rule lookup
- agency filing retrieval
- legislative calendar retrieval
- world inspector bundles for operator review

Current scaffold:
- `src/server/retrieval-service.mjs`

## Design rule

These primitives are not generic toys.
They exist to make the swarm stronger in:
- court-ruling markets
- agency-approval markets
- implementation-delay markets
- legislative-milestone markets
