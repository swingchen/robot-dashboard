# Robot Dashboard Demo Guide

This document is the concise demo script version.
Each completed phase should be appended here in a shorter form.

## Phase 1: Root Project Setup

### Goal

Set up the repository root so the web app and the server can be installed, built, and started from one place through explicit per-app root scripts.

### What Was Implemented

1. root scripts for `dev`, `dev:web`, `dev:server`, `build`, and `install:all`
2. explicit per-app install helpers for `apps/web` and `apps/server`
3. one shared TypeScript base config

### What This Phase Means

This phase is about project structure, not product features yet.

It creates:

- one root install point
- one root build point
- one root development entry
- one shared TypeScript standard

### How I Validate It

Run from the repository root:

```bash
npm install
npm run install:all
npm run build
```

Optional checks:

```bash
npm run dev:web
npm run dev:server
```

### Expected Result

This phase is complete if:

1. root tooling installs successfully
2. both apps install through the root helper scripts
3. the root build command triggers both app builds
4. the root scripts can start the web app and server consistently

### Short Demo Script

"In the first phase, I set up the repository root so both apps can still be installed, built, and started from one place through explicit root scripts. I added root-level scripts that forward into the web and server folders and kept a shared TypeScript base config so both apps follow the same rules. This phase is about project structure, not product features yet."

## Phase 2: Web and Server Scaffolding

### Goal

Create a runnable front-end shell and a runnable back-end shell before implementing telemetry behavior.

### What Was Implemented

1. a Vite + React + TypeScript web app shell
2. a TypeScript server app with dev, build, and start scripts
3. a placeholder page on the web side
4. a valid backend entry point on the server side

### What This Phase Means

This phase turns the repository into a working two-app project:

- the front end can render
- the back end can boot
- both sides can be started independently
- both sides now have stable entry points for later telemetry logic

### How I Validate It

Run from the repository root:

```bash
npm run dev:web
npm run dev:server
```

Or start both together:

```bash
npm run dev
```

Then check:

```bash
curl -s http://localhost:3001/health
```

### Expected Result

This phase is complete if:

1. the web app renders a visible placeholder page
2. the server starts cleanly
3. both apps can be launched from the root scripts
4. the project now has real web and server runtime shells

### Short Demo Script

"In the second phase, I scaffolded both applications. The front end became a runnable Vite and React app with a placeholder screen, and the back end became a runnable TypeScript server. The goal here was not telemetry yet. It was to create stable entry points on both sides so later phases could build on top of a working shell." 

## Phase 3: Telemetry Types and Generator

### Goal

Define the telemetry frame schema and build a backend generator that can continuously produce valid telemetry data.

### What Was Implemented

1. one telemetry type file for the backend data contract
2. one stateful telemetry generator
3. continuous frame generation for pose, speed, battery, and mission progress
4. a base live frame shape with alarms empty by default

### What This Phase Means

This phase is where the backend begins to own real telemetry data instead of only being a runnable server shell.

It gives the project:

- one fixed telemetry schema
- one continuously updating data source
- one data layer that can be tested even before websocket broadcasting

### How I Validate It

Build the server:

```bash
npm --prefix apps/server run build
```

Then run the generator directly:

```bash
node --input-type=module -e "import { TelemetryGenerator } from './apps/server/dist/telemetry/generator.js'; const generator = new TelemetryGenerator(); const base = Date.now(); const frames = [generator.nextFrame(base), generator.nextFrame(base + 67), generator.nextFrame(base + 134)]; console.log(JSON.stringify(frames, null, 2));"
```

### Expected Result

This phase is complete if:

1. valid telemetry frames are produced without any websocket client
2. frame timestamps increase
3. pose, speed, battery, and mission values change over time
4. the frame shape already matches the telemetry contract

### Short Demo Script

"In the third phase, I defined the telemetry frame contract and built a backend generator that continuously produces valid telemetry frames. This means the backend already has a working data source even before WebSocket broadcasting is layered on top." 

## Phase 4: Scenario Controller, Broadcaster, and Connection Manager

### Goal

Turn the generated telemetry data into a real streaming system that can express different runtime behaviors such as live streaming, stale data, alarm injection, and disconnect scenarios.

### What Was Implemented

1. a scenario controller for `live`, `stale`, `drop`, `manual-disconnect`, and `alarm`
2. a broadcaster that pushes frames at the configured stream rate
3. a connection manager that tracks and controls websocket clients
4. scenario side effects for manual disconnect and drop behavior
5. server wiring that sends a latest frame immediately to newly accepted clients

### What This Phase Means

This phase is where the backend becomes a real streaming system instead of only a frame generator.

It gives the project:

- scenario-aware telemetry behavior
- centralized websocket connection management
- clear differences between live, stale, alarm, and disconnect states

### How I Validate It

Start the server:

```bash
npm run dev:server
```

Connect a websocket client to:

```text
ws://localhost:3001/telemetry
```

Then verify:

1. live keeps sending frames
2. stale stops new frames without dropping the connection
3. alarm keeps sending frames and includes alarm data
4. manual-disconnect closes intentionally
5. drop terminates abnormally

### Expected Result

This phase is complete if:

1. the same generator output can now be expressed through multiple stream behaviors
2. clients observe a real difference between live and stale
3. clients observe a real difference between manual disconnect and drop
4. alarm data is injected at the scenario layer, not the generator layer

### Short Demo Script

"In the fourth phase, I connected scenario control, frame broadcasting, and websocket connection management. At this point the backend was no longer just generating telemetry. It could now express different runtime behaviors like live streaming, stale data, alarm injection, and different disconnect modes." 

## Phase 5: Scenario Control HTTP API

### Goal

Expose a small HTTP control surface so demo scenarios can be queried, changed, and reset without restarting the server or sending control messages over WebSocket.

### What Was Implemented

1. one Express router for scenario query and control
2. `GET /api/scenario` to read the current scenario
3. `POST /api/scenario` to switch to a supported scenario
4. `POST /api/scenario/reset` to return the server to `live`
5. request validation against the supported scenario list

### What This Phase Means

This phase adds an operator control surface to the backend:

- WebSocket remains the telemetry transport
- HTTP becomes the scenario control channel
- the existing scenario controller can now be driven externally without code changes

### How I Validate It

Start the server:

```bash
npm run dev:server
```

Then call:

```bash
curl -s http://localhost:3001/api/scenario
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"stale"}'
curl -s -X POST http://localhost:3001/api/scenario/reset
```

Also verify that invalid input returns `400`.

### Expected Result

This phase is complete if:

1. the current scenario can be queried over HTTP
2. each supported demo scenario can be selected over HTTP
3. reset returns the server to `live`
4. invalid scenario names are rejected cleanly
5. websocket behavior changes immediately after the HTTP scenario update

### Short Demo Script

"In the fifth phase, I added a small HTTP control API for the backend. WebSocket is still used for telemetry streaming, but HTTP now drives scenario changes. That lets the demo switch between live, stale, alarm, and disconnect behaviors without restarting the server."

## Phase 6: Front-End Types, Store, Freshness, and Backoff

### Goal

Build the front-end telemetry state layer before the final dashboard UI so trust state, stale detection, alarms, and reconnect timing can be validated directly.

### What Was Implemented

1. one front-end telemetry type file that mirrors the backend frame contract
2. one freshness utility for `no-data-yet`, `fresh`, and `stale`
3. one reconnect backoff utility with bounded exponential delays
4. one Zustand store that keeps raw frame data and derived UI state together
5. one temporary state-inspector screen for manual action-driven validation

### What This Phase Means

This phase creates the front-end state foundation:

- raw websocket data and UI-facing state are separated cleanly
- trust state is derived in one place instead of scattered through components
- reconnect timing is explicit and testable before transport wiring is added
- alarms stay visible in state without replacing the trust-state signal

### How I Validate It

Build the web app:

```bash
npm --prefix apps/web run build
```

Then run the web app:

```bash
npm run dev:web
```

Use the temporary inspector page to verify:

1. `Mark open` still shows `no-data-yet` before any frame exists
2. `Receive live frame` moves trust state to `live`
3. `Advance past stale threshold` flips trust state to `stale`
4. `Mark reconnecting` shows reconnect state and a backoff delay
5. `Mark disconnected` freezes last-known values without pretending they are live

### Expected Result

This phase is complete if:

1. the front end has explicit telemetry, freshness, trust, and view-state types
2. the store can derive `no-data-yet`, `live`, `stale`, `reconnecting`, and `disconnected`
3. reconnect delay is calculated independently from the UI layer
4. alarms remain separate from trust-state derivation
5. state transitions can be validated manually before the final UI is built

### Short Demo Script

"In the sixth phase, I built the front-end telemetry state layer before the final dashboard UI. The web app now has typed telemetry state, stale detection, reconnect backoff, and a temporary inspector screen that proves the trust-state logic works before the websocket client and full dashboard components are added."

## Phase 7: WebSocket Client and Message Router

### Goal

Connect the web app to the real backend telemetry stream and make transport behavior explicit: connect, disconnect, reconnect, latest-only frame buffering, and immediate alarm delivery.

### What Was Implemented

1. one browser websocket client for connect, disconnect, and reconnect behavior
2. one message router that parses telemetry messages and buffers frames in latest-only mode
3. immediate frame commits for the first frame and alarm changes
4. automatic clock syncing so stale detection still advances between frames
5. one live transport inspector screen wired to the real backend websocket

### What This Phase Means

This phase turns the front end from a local state harness into a real streaming client:

- the web app now receives telemetry from the backend websocket
- reconnect timing is no longer theoretical; it drives actual transport recovery
- UI updates stay bounded through latest-only buffering
- short alarm bursts are still surfaced immediately instead of being swallowed by throttling

### How I Validate It

Start the backend and the web app:

```bash
npm run dev:server
npm run dev:web
```

Then verify on the browser page:

1. the page auto-connects and reaches `live`
2. `Disconnect stream` moves trust state to `disconnected`
3. `Connect stream` restores the stream
4. `Simulate reconnect flow` triggers reconnect behavior and exposes backoff state
5. switching the backend to `stale` eventually moves trust state to `stale`
6. switching the backend to `alarm` updates alarms immediately

### Expected Result

This phase is complete if:

1. the front end consumes the real websocket telemetry stream
2. reconnect behavior is automatic and visible in state
3. no duplicate websocket listener registration occurs across rerenders
4. frame commits are latest-only by default
5. alarm-bearing frames are not swallowed by the UI commit interval

### Short Demo Script

"In the seventh phase, I connected the web app to the real telemetry websocket. The browser now manages connection lifecycle, reconnects automatically, buffers frames in latest-only mode, and still flushes alarm changes immediately so trust state and alarms stay accurate under real streaming conditions."

## Phase 8: Front-End State Layer Walkthrough

### Goal

Run the already-wired front-end state layer end to end and prove that the operator-facing trust-state semantics are correct before the final dashboard components are introduced.

### What Was Implemented

1. one live inspector screen that exposes trust state, connection state, freshness, frame age, reconnect attempt, next backoff delay, alarm count, and frozen-value status
2. one timer-driven stale check via `syncClock()` so stale transitions still happen when the backend simply stops sending frames
3. one clear distinction between local manual disconnect and backend-driven reconnect scenarios
4. one alarm path that stays visible without replacing the `live` trust state
5. raw and derived telemetry snapshots side by side for manual verification

### What This Phase Means

This phase turns the current app shell into a formal state-validation harness:

- `no-data-yet`, `live`, `stale`, `reconnecting`, and `disconnected` are now observable on one page
- `stale` comes from time passing without new frames, not from a special server message
- `alarm` stays a local alarm signal while trust state remains driven by connection and freshness
- `Disconnect stream` is intentionally different from backend `manual-disconnect` and `drop`, because one stops locally while the others force reconnect behavior

### How I Validate It

Start both apps:

```bash
npm run dev:server
npm run dev:web
```

Then verify these behaviors on the page:

1. load the page and wait for the websocket client to reach `live`
2. switch the backend to `stale` and confirm frame age keeps increasing until trust state becomes `stale`
3. switch the backend to `alarm` and confirm trust state stays `live` while alarm count updates immediately
4. click `Disconnect stream` and confirm trust state becomes `disconnected` without automatic reconnect
5. click `Connect stream` or `Simulate reconnect flow` and confirm the stream can recover
6. switch the backend to `manual-disconnect` or `drop` and confirm trust state becomes `reconnecting` while backoff state advances

Useful backend control commands:

```bash
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"stale"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"alarm"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"manual-disconnect"}'
curl -s -X POST http://localhost:3001/api/scenario/reset
```

### Expected Result

This phase is complete if:

1. all five trust states are visible on the live page
2. stale detection is clearly timer-driven instead of server-labeled
3. alarm visibility is independent from trust-state selection
4. local and remote disconnect semantics are distinguishable
5. the current inspector already satisfies the assignment's core trust-state validation requirement

### Short Demo Script

"In the eighth phase, I used the live transport inspector as an end-to-end trust-state walkthrough. The app now proves the difference between no data yet, live, stale, reconnecting, and disconnected on top of the real websocket stream, while alarms stay visible without taking over the main trust-state signal."