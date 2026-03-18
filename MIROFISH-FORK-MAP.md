# MiroFish Oracle — Fork Map

## What we are borrowing

From upstream MiroFish, the valuable ideas are:

- graph-backed seed extraction
- environment setup before simulation
- persistent agents instead of stateless prompts
- simulation rounds with memory updates
- post-simulation interaction and report generation

## What we are changing

We are narrowing the domain hard:

- upstream: predict anything
- oracle: predict policy, legal, and regulatory market mispricings

We are also changing the operational center:

- upstream: simulation-first product flow
- oracle: operator console + live market workflow

## Conceptual mapping

### Upstream graph building
Oracle equivalent:
- market normalization
- settlement interpretation graph
- institutional graph
- catalyst graph
- claim graph

### Upstream environment setup
Oracle equivalent:
- market world-state assembly
- venue-linked scenario setup
- activation of relevant agents by market type

### Upstream simulation
Oracle equivalent:
- fast reruns for urgent updates
- deep reruns for structural market changes
- selective agent invocation

### Upstream report agent
Oracle equivalent:
- forecast extractor
- rationale summarizer
- operator brief generator
- ticket generation payload

### Upstream deep interaction
Oracle equivalent:
- swarm replay
- graph/world inspector
- agent interrogation panel
- source-to-claim audit trail

## Why the graph matters

The graph is not for decoration.
It is useful because it makes these things durable:

- who affected what
- what claim depends on which filing or rule
- where contradictions live
- how linked markets share causal structure
- which agent changed belief because of which event

Without this, the swarm becomes fancy text generation.
With it, the swarm becomes inspectable and stateful.

## UI translation rule

Do not make the graph the homepage.
Make the graph the substrate.
Surface graph-derived views where they matter:

- world inspector
- disagreement map
- catalyst chain
- claim audit
- related market cluster

## Build rule

We only keep upstream ideas that help one of these:

- lower rerun latency
- improve procedural understanding
- improve inspectability
- improve forecast extraction
- improve operator control

Everything else is optional.
