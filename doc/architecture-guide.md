# Robot Dashboard — Architecture Guide

> Architecture, data flow, design decisions, and AI usage notes for the robot-dashboard project.

---

## Overview

Robot Dashboard is a **two-application monorepo** that simulates an operator console for an autonomous vehicle. The backend generates realistic telemetry frames (pose, speed, battery, mission progress) at 15 Hz and streams them over WebSocket. The frontend renders live vehicle vitals, a 2D position view, active alarm panels, and a prominent trust-state banner that tells the operator whether the data they see is **live, stale, reconnecting, or disconnected**.

Five demo scenarios (`live`, `stale`, `drop`, `manual-disconnect`, `alarm`) can be triggered via an HTTP API or the in-app control panel.

---

## Project Structure

```
robot-dashboard/
├── package.json              # Root scripts (dev, build, install:all)
├── tsconfig.base.json        # Shared strict TypeScript baseline
├── README.md
│
├── apps/
│   ├── server/               # Backend: Express + ws + TypeScript
│   │   ├── src/
│   │   │   ├── index.ts                    # Server entry: wires HTTP, WS, scenarios
│   │   │   ├── telemetry/
│   │   │   │   ├── types.ts                # TelemetryFrame, Pose, MissionState, TelemetryAlarm
│   │   │   │   ├── generator.ts            # Stateful frame generator with warehouse patrol motion
│   │   │   │   └── broadcaster.ts          # Interval-based broadcaster with pause/resume + alarm injection
│   │   │   ├── scenarios/
│   │   │   │   ├── controller.ts           # Scenario state machine (live/stale/drop/manual-disconnect/alarm)
│   │   │   │   ├── applyScenario.ts        # Side effects: terminate/close connections on scenario switch
│   │   │   │   └── autoFaultScheduler.ts   # Automatic fault-injection sequence (stale → alarm → drop → …)
│   │   │   ├── connection/
│   │   │   │   └── manager.ts              # WebSocket connection tracking, broadcast, graceful/force close
│   │   │   └── routes/
│   │   │       └── scenario-control.ts     # HTTP API: /api/scenario, /api/stream/*, /api/auto-faults/*
│   │   └── package.json
│   │
│   └── web/                  # Frontend: Vite + React + Zustand + TypeScript
│       ├── src/
│       │   ├── main.tsx                    # ReactDOM entry
│       │   ├── App.tsx                     # Root component: wires store, WS client, message router
│       │   ├── types/
│       │   │   └── telemetry.ts            # TelemetryFrame + UI-only types (ConnectionState, TrustState, etc.)
│       │   ├── store/
│       │   │   ├── telemetryStore.ts       # Zustand store: raw frame → derived trust/UI state
│       │   │   └── selectors.ts            # Memoized selectors (uiSnapshot, rawFrame, debugSummary)
│       │   ├── services/
│       │   │   ├── websocketClient.ts      # WebSocket lifecycle: connect, reconnect (exponential backoff), events
│       │   │   └── messageRouter.ts        # Latest-only buffering + immediate alarm flush (100ms commit interval)
│       │   ├── utils/
│       │   │   ├── freshness.ts            # Trust-state derivation logic (STALE_THRESHOLD_MS = 2500)
│       │   │   ├── backoff.ts              # Exponential backoff: 1s → 2s → 4s → … → 30s max, 10 attempts
│       │   │   └── api.ts                  # Thin fetch wrapper for HTTP scenario/stream control
│       │   ├── components/
│       │   │   ├── TrustBanner.tsx          # Page-level trust-state indicator (icon + label + elapsed time)
│       │   │   ├── PoseView.tsx             # 2D SVG top-down vehicle view with grid, position text, heading arrow
│       │   │   ├── VitalsPanel.tsx          # Speed, battery (color-coded), mission (label + progress bar + state)
│       │   │   ├── AlarmInfoPanel.tsx       # Active alarm list sorted by severity, with acknowledge flow
│       │   │   └── ControlPanel.tsx         # Connect/disconnect + scenario buttons + stream pause/resume
│       │   └── styles/
│       │       ├── tokens.css               # Design tokens (colors, spacing, typography, trust-state palette)
│       │       ├── base.css                 # Reset + typography
│       │       ├── layout.css               # Dashboard grid (responsive 1/2/3 columns) + panel base
│       │       ├── state.css                # Trust-state colors, pulse animations, frozen data styling
│       │       └── components/              # Per-component CSS (trust-banner, vitals, pose-view, alarms, control)
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
│
├── design/                   # Reference images for UI layout (not used at runtime)
│   ├── linde_dashboard_normal.png
│   ├── linde_dashboard_stale.png
│   └── linde_dashboard_disconnected.png
│
└── doc/                      # In-depth documentation
    ├── architecture-guide.md          # This file
    ├── project-guide.zh.md
    ├── project-detailed-guide.md
    ├── project-demo-guide.md
    └── project-kickoff-plan.zh.md
```

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (apps/server)                                      │
│                                                             │
│  TelemetryGenerator ──→ ScenarioController                  │
│    (warehouse patrol     (live/stale/drop/                   │
│     motion model)         manual-disconnect/alarm)           │
│         │                      │                            │
│         └──────────┬───────────┘                            │
│                    ▼                                         │
│          TelemetryBroadcaster                               │
│           (15 Hz timer, pause/resume,                       │
│            alarm injection, latest-frame cache)              │
│                    │                                         │
│                    ▼                                         │
│          ConnectionManager                                  │
│           (broadcast to all open sockets,                    │
│            cleanup stale connections)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket (ws://)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND (apps/web)                                         │
│                                                              │
│  TelemetryWebSocketClient                                    │
│   (connect, disconnect, auto-reconnect with backoff)         │
│                       │                                      │
│                       ▼                                      │
│  TelemetryMessageRouter                                      │
│   (latest-only buffering @ 100ms,                            │
│    immediate alarm flush on signature change)                │
│                       │                                      │
│                       ▼                                      │
│  Zustand TelemetryStore                                      │
│   rawFrame → freshnessState → trustState → uiSnapshot        │
│                       │                                      │
│                       ▼                                      │
│  React Components                                            │
│   TrustBanner | PoseView | VitalsPanel                       │
│   AlarmInfoPanel | ControlPanel                              │
└──────────────────────────────────────────────────────────────┘
```

### Trust-State Model

The frontend derives a **trust-state** from two inputs — the WebSocket connection state and data freshness — producing five distinct states visible to the operator:

| Trust State      | Connection  | Freshness     | Meaning                                           |
|------------------|-------------|---------------|---------------------------------------------------|
| `no-data-yet`    | any         | no-data-yet   | Connected but no frame received yet               |
| `live`           | open        | fresh         | Real-time data is flowing normally                |
| `stale`          | open        | stale (>2.5s)| Connection OK but no new frames arriving          |
| `reconnecting`   | reconnecting| —             | WebSocket dropped, automatically retrying         |
| `disconnected`   | disconnected| —             | Manually or permanently disconnected              |

When in `stale`, `reconnecting`, or `disconnected` states, the UI displays **last-known values** with a frozen indicator (orange styling, dashed borders) so operators are never tricked into thinking stale data is live.

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **100ms UI commit interval** | Decouples 15 Hz stream rate from React re-renders; prevents jank |
| **Immediate alarm flush** | Alarm state changes bypass the commit interval so operators see alerts instantly |
| **Exponential backoff reconnect** | 1s → 2s → 4s → … → 30s max, 10 attempts — standard resilience pattern |
| **Latest-only frame buffering** | Drops intermediate frames during backpressure; always commits the freshest data |
| **Auto-fault scheduler** | Cycles through stale/alarm/drop scenarios automatically for unattended demos |
| **Alarm acknowledges** | Operators must explicitly acknowledge alarms; acknowledged alarms don't re-trigger |

---

## Running Parameters

| Parameter              | Value    | Location                        |
|------------------------|----------|----------------------------------|
| Stream rate            | 15 Hz    | `apps/server/src/index.ts`      |
| Stale threshold        | 2500 ms  | `apps/web/src/utils/freshness.ts`|
| UI commit interval     | 100 ms   | `apps/web/src/services/messageRouter.ts` |
| Reconnect base delay   | 1000 ms  | `apps/web/src/utils/backoff.ts`  |
| Reconnect max delay    | 30000 ms | `apps/web/src/utils/backoff.ts`  |
| Reconnect max attempts | 10       | `apps/web/src/utils/backoff.ts`  |

---

## Build

```bash
# Build both apps (type-check + compile)
npm run build

# Output artifacts:
#   apps/web/dist/     — Vite static bundle
#   apps/server/dist/  — TypeScript → JavaScript
```

---

## API Reference

All endpoints are under `http://localhost:3001/api`.

### Health

```bash
GET /health
# → { "status":"ok", "scenario":"live", "clients":1, "streamHz":15, "autoFaultsEnabled":true }
```

### Scenario Control

```bash
# Get current scenario
GET /api/scenario
# → { "scenario":"live", "availableScenarios":["live","stale","drop","manual-disconnect","alarm"] }

# Switch scenario
POST /api/scenario  { "scenario": "stale" }
# → { "scenario":"stale", "changedAt":1718700000000 }

# Reset to live
POST /api/scenario/reset
# → { "scenario":"live", "changedAt":1718700001000 }
```

### Stream Control (Pause/Resume)

```bash
# Pause telemetry broadcast
POST /api/stream/pause
# → { "status":"paused", "timestamp":1718700002000 }

# Resume telemetry broadcast
POST /api/stream/resume
# → { "status":"resumed", "timestamp":1718700003000 }

# Check stream status
GET /api/stream/status
# → { "isPaused":false, "timestamp":1718700004000 }
```

> **Note**: Pausing stops broadcast but the generator keeps running, so resumed streams start with the latest frame — no cold-start gap.

### Auto-Fault Scheduler Control

```bash
# Check auto-fault status
GET /api/auto-faults/status
# → { "enabled":true, "isRunning":true, "timestamp":1718700005000 }

# Pause the scheduler
POST /api/auto-faults/pause
# → { "status":"paused", "isRunning":false }

# Resume the scheduler
POST /api/auto-faults/resume
# → { "status":"running", "isRunning":true }
```

The auto-fault sequence cycles through: `stale(4.5s)` → `live(7s)` → `warning alarm(5.5s)` → `live(7s)` → `drop(5s)` → `live(8s)` → `critical alarm(6s)` → `stale(4.5s)` → `live(9s)` → repeat.

Disable it at startup with `AUTO_FAULTS_ENABLED=false`.

---

## Demo Scenarios

The six demo scenarios walk through every major trust-state transition:

| # | Button / Action         | State Transition                          | What Happens                                           |
|---|--------------------------|-------------------------------------------|--------------------------------------------------------|
| ① | **Connect**              | `no-data-yet` → `live`                    | WebSocket connects; first frame populates all panels   |
| ② | **Stale**                | `live` → `stale`                          | Backend stops sending frames; UI freezes after 2.5s    |
| ③ | **Recover** (Reset)      | `stale` → `live`                          | Backend resumes streaming; values begin updating again |
| ④ | **Simulate Reconnect**   | `live` → `reconnecting` → `live`          | Frontend simulates WS drop; backoff retries shown      |
| ⑤ | **Disconnect**           | `live` → `disconnected`                   | Manual close; no auto-reconnect; last-known shown      |
| ⑥ | **Alarm**                | alarms injected                           | Alarm panel shows severity+code+message; auto-clears   |

> **Alarm severity rotates** on each click: `info` → `warning` → `critical` → `info`…

---

## Deployment

The project deploys as two independent processes:

### 1. Build

```bash
npm run build
```

### 2. Run Backend

```bash
cd apps/server
NODE_ENV=production PORT=3001 node dist/index.js
```

Environment variables:
- `PORT` — HTTP/WS port (default: `3001`)
- `AUTO_FAULTS_ENABLED` — set to `false` to disable the auto-fault scheduler
- `BOOT_SCENARIO` — initial scenario (`live`, `stale`, `drop`, `manual-disconnect`, `alarm`)

### 3. Serve Frontend

Serve `apps/web/dist/` with any static host (Nginx, Caddy, Vercel, Netlify, etc.):

```bash
npx serve apps/web/dist -l 5173
```

If frontend and backend are on different hosts, set the WebSocket URL at build time:

```bash
VITE_TELEMETRY_WS_URL=ws://<backend-host>:3001/telemetry
```

---

## Bonus: Command Round-Trip (Pause/Resume)

The dashboard implements a **Pause/Resume** command round-trip — sending a command from the UI to the mock server and reflecting the acknowledged state back:

- **Pause** (`⏸`): Stops WebSocket broadcast while the generator keeps producing frames
- **Resume** (`▶`): Restarts broadcast — first frame sent is the latest generated (no gap)
- **Optimistic UI**: Button disables immediately on click; confirmed status shown after server responds

This demonstrates the **requested vs. confirmed** pattern: the button shows `requesting...` while the HTTP round-trip is in flight, then transitions to `✓ Paused` or `✓ Running` once the server acknowledges.

---

## Testing Strategy

### Build-Time Type Safety

`tsconfig.base.json` enforces `strict: true`, `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` across both apps. The build runs `tsc --noEmit` before bundling.

### Manual Verification Checklist

The README's Verification Checklist serves as a structured manual integration test suite covering backend contract, frontend behavior, full demo scenarios, and visual validation.

### Why No Automated Tests (MVP)

~1 day scope. Automated tests deferred in favor of TypeScript strict mode + manual checklist + clean module boundaries (`backoff.ts`, `freshness.ts`, `messageRouter.ts` are pure-logic, trivially testable later).

### Production Test Plan

| Test Scope       | Tool                  | What It Covers |
|------------------|-----------------------|----------------|
| Unit tests       | Vitest / Jest         | `backoff.ts`, `freshness.ts`, `messageRouter.ts` |
| Component tests  | React Testing Library | TrustBanner per-state rendering, AlarmInfoPanel sort order, PoseView coordinates |
| Integration tests| Playwright            | Full WS lifecycle: connect → stale → reconnect → alarm |
| WS mock          | `ws` / `msw`          | Simulate `drop`, `stale`, `alarm` without real backend |

---

## AI Usage Notes

> *"AI-assisted development is encouraged; we use it daily. Be transparent about what you generated, what you wrote, and how you validated the generated parts."*

### What Was AI-Generated

| Area | Generated by AI | Refined By Author |
|------|----------------|-------------------|
| Project scaffolding | Boilerplate structure | Adjusted (non-workspace root scripts) |
| `TelemetryGenerator` | Motion model + frame assembly | Verified frame shape; adjusted smoothing |
| `TelemetryBroadcaster` | Interval tick loop | Added pause/resume, latest-frame cache |
| `ConnectionManager` | Socket Set tracking + broadcast | Added scenario-aware connection rejection |
| `ScenarioController` + `AutoFaultScheduler` | State machine + sequence loop | Tuned durations; added alarm severity rotation |
| `scenario-control.ts` routes | REST endpoints | Added stream pause/resume + auto-fault endpoints |
| `WebSocketClient` + `MessageRouter` | WS lifecycle + buffering | Verified no duplicate listeners; alarm-immediate flush |
| `backoff.ts` + `freshness.ts` | Pure logic modules | Verified edge cases |
| `telemetryStore.ts` | Zustand store + derivation | Confirmed all five trust-state transitions |
| UI components | Layout + styling | Adjusted alarm acknowledge flow, responsive breakpoints |
| CSS | Design tokens + layout | Verified frozen-state visuals, pulse animations |

### What Was Author-Written

- **Trust-state semantics**: Five-state model and the rule that frozen ≠ current
- **Demo scenario flow**: Six-step sequence and what each step proves
- **Alarm UX policy**: Data-driven auto-clear, severity-sorted, explicit acknowledge
- **Manual-connect startup**: `no-data-yet` initial state for explicit transition
- **Scope boundary**: Manual validation over automated tests for one-day MVP

### How AI-Generated Code Was Validated

1. **TypeScript strict build**: `npm run build` catches type errors, dead code
2. **Runtime walkthrough**: Verification Checklist exercises every code path
3. **WebSocket lifecycle**: Multiple connect/disconnect cycles — no duplicate listeners or leaked timers
4. **Cross-browser**: Chrome + Firefox; no horizontal scroll at any breakpoint
5. **Manual code review**: Each AI-generated module read top-to-bottom; behavior mismatches fixed before commit

### Limitations

- AI-generated code treated as **draft output** — reviewed for operator safety (frozen ≠ current)
- Automated tests are the most notable omission for MVP scope
