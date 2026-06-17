# Robot Dashboard

Real-time vehicle telemetry dashboard with trust-state visualization and demo scenario control.

## Quick Start

```bash
# Install dependencies
npm install
npm run install:all

# Start both web and server
npm run dev

# Or start them separately
npm run dev:web   # Web app on http://localhost:5173
npm run dev:server  # Server on http://localhost:3001
```

## Architecture

### Frontend (`apps/web`)

- **Tech**: Vite + React + TypeScript + Zustand
- **Key Components**:
  - `TrustBanner`: Displays connection/data freshness state (live/stale/reconnecting/disconnected)
  - `PoseView`: 2D top-down vehicle position and heading visualization
  - `VitalsPanel`: Real-time speed, battery, and mission metrics
  - `AlarmsPanel`: Active alarm severity and details
  - `DemoControls`: Six-button scenario controller
- **State Management**: Zustand store with trust-state derivation, freshness detection, reconnect backoff
- **WebSocket**: Manual connect via the `Connect` control, latest-only frame buffering, immediate alarm/trust-state updates

### Backend (`apps/server`)

- **Tech**: Node.js + Express + TypeScript + WebSocket
- **Core Responsibility**:
  - Continuous telemetry generation with realistic vehicle motion
  - Scene-based streaming: `live` (normal), `stale` (no new frames), `drop` (abnormal close), `manual-disconnect` (graceful close), `alarm` (inject alarm data)
  - HTTP API for demo scenario control
  - WebSocket broadcaster with connection lifecycle management

### Data Flow

```
Backend Telemetry Generator (15 Hz)
  ↓
Scenario Controller (applies live/stale/alarm/disconnect rules)
  ↓
Broadcaster (sends to connected clients)
  ↓
WebSocket (transport)
  ↓
Frontend Message Router (latest-only buffering, alarm-immediate flushing)
  ↓
Zustand Store (trust-state derivation)
  ↓
React Components (render UI)
```

## Build

```bash
# Build both apps
npm run build

# Output
# - apps/web/dist/ (Vite static output)
# - apps/server/dist/ (TypeScript compiled output)
```

## Deployment

The project deploys as two processes:

1. **Backend API/WebSocket service** (`apps/server/dist/index.js`)
2. **Frontend static assets** (`apps/web/dist`)

### 1) Build artifacts

```bash
npm run build
```

### 2) Run backend in production

```bash
cd apps/server
NODE_ENV=production PORT=3001 node dist/index.js
```

Optional toggles:
- `AUTO_FAULTS_ENABLED=false` disables automatic fault scheduling
- `BOOT_SCENARIO=live` sets the initial scenario

### 3) Serve frontend static files

Any static host works (Nginx, Caddy, Vercel static, Netlify, etc.).
For a quick local production preview:

```bash
npx serve apps/web/dist -l 5173
```

If frontend and backend are on different hosts/ports, set:

```bash
VITE_TELEMETRY_WS_URL=ws://<backend-host>:3001/telemetry
```

### 4) Smoke checks after deployment

- Open frontend page and click `Connect`
- Verify trust-state transitions from `no-data-yet` to `live`
- Verify backend health endpoint: `GET /health`

## Demo Scenarios

The dashboard supports six sequential demo scenarios that showcase the trust-state system:

### ① Connect
- **What it does**: Initiates WebSocket connection
- **Expected state**: `no-data-yet` → `live` (once first frame arrives)
- **How to trigger**: Click `Connect stream` button

### ② Stale
- **What it does**: Backend stops sending new frames but keeps connection open
- **Expected state**: `live` → `stale` (after ~2.5 seconds with no new data)
- **How to trigger**: Click `Stale` button

### ③ Recover
- **What it does**: Backend returns to normal streaming
- **Expected state**: `stale` → `live`
- **How to trigger**: Click `Recover` button

### ④ Reconnect Flow
- **What it does**: Triggers reconnect with exponential backoff (1s → 2s → 4s ... max 30s)
- **Expected state**: `live` → `reconnecting` (shows attempt count) → `live`
- **How to trigger**: Click `Simulate reconnect flow` button

### ⑤ Disconnect
- **What it does**: Locally stops WebSocket without automatic reconnect
- **Expected state**: `live` → `disconnected` (stays disconnected until reconnect button pressed)
- **How to trigger**: Click `Disconnect stream` button

### ⑥ Alarm
- **What it does**: Injects alarm data, then automatically clears after ~3 seconds
- **Expected state**: Alarm panel shows severity/code/message, then clears
- **How to trigger**: Click `Alarm` button

## Verification Checklist

Run through this checklist to validate all core functionality:

### Setup Validation

- [ ] `npm install` succeeds with no errors
- [ ] `npm run install:all` completes both app installs
- [ ] `npm run build` produces both `apps/web/dist` and `apps/server/dist`

### Backend Validation

- [ ] `npm run dev:server` starts on port 3001
- [ ] Health check: `curl -s http://localhost:3001/health` returns 200
- [ ] Scenario query: `curl -s http://localhost:3001/api/scenario` returns `{ "scenario": "live", "availableScenarios": [...] }`
- [ ] Scenario switch: `curl -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"stale"}'` succeeds
- [ ] Scenario reset: `curl -X POST http://localhost:3001/api/scenario/reset` returns to `live`

### Frontend Validation

- [ ] `npm run dev:web` starts on port 5173
- [ ] Page loads and shows TrustBanner
- [ ] Click `Connect stream`, trust-state moves from `no-data-yet` → `live`

### Full Integration Validation

Start both services in separate terminals:

```bash
npm run dev:server  # Terminal 1
npm run dev:web     # Terminal 2
```

Then validate the demo sequence:

1. **① Connect**
   - [ ] Trust-state: `no-data-yet` → `live`
   - [ ] Vehicle circle appears on PoseView grid
   - [ ] Speed, battery, mission values populate
   - [ ] TrustBanner shows green "Live Stream"

2. **② Stale**
   - [ ] Click `Stale` button
   - [ ] Wait ~2.5 seconds
   - [ ] Trust-state: `live` → `stale`
   - [ ] TrustBanner shows orange "No New Data" with elapsed time
   - [ ] Vehicle circle turns orange, border becomes dashed
   - [ ] Values show frozen indicator

3. **③ Recover**
   - [ ] Click `Recover` button
   - [ ] Trust-state: `stale` → `live`
   - [ ] Vehicle turns green again
   - [ ] Values resume updating
   - [ ] TrustBanner returns to "Live Stream"

4. **④ Reconnect Flow**
   - [ ] Click `Simulate reconnect flow` button
   - [ ] Trust-state: `live` → `reconnecting`
   - [ ] TrustBanner shows blue "Reconnecting..." with pulsing animation
   - [ ] Backoff delay shown (1s, 2s, 4s, etc.)
   - [ ] After ~5 seconds: `reconnecting` → `live`
   - [ ] Connection restored

5. **⑤ Disconnect**
   - [ ] Click `Disconnect stream` button
   - [ ] Trust-state: `live` → `disconnected`
   - [ ] TrustBanner shows red "Disconnected" with pulsing animation
   - [ ] Last-known values remain frozen on screen
   - [ ] No automatic reconnect happens (stays disconnected)

6. **⑥ Alarm**
   - [ ] Click `Alarm` button
   - [ ] AlarmsPanel appears with severity badge, code, and message
   - [ ] Alarm list is sorted by severity (critical first)
   - [ ] ~3 seconds later, alarm auto-clears

### Visual Validation

- [ ] TrustBanner colors match states (live=green, stale=orange, reconnecting=blue, disconnected=red)
- [ ] TrustBanner animations (reconnecting and disconnected pulse)
- [ ] PoseView vehicle moves on grid as position changes
- [ ] PoseView arrow rotates as heading changes
- [ ] Frozen state visually distinct (orange + dashed)
- [ ] No horizontal scrollbar at any viewport size
- [ ] Dashboard grid responsive: 1 col (mobile) → 2 col (1024px) → 3 col (1440px)

### Responsive Design Validation

Use browser dev tools to test at each breakpoint:

- [ ] Mobile (320px): 1-column layout, all controls stacked
- [ ] Tablet (768px): 2-column layout, vitals + pose side-by-side
- [ ] Desktop (1440px): 3-column layout (vitals | pose | controls)
- [ ] Ultra-wide (2560px): Layout remains stable, proportions correct

## Bonus Features

### 1. Phase 15: Pause/Resume Stream Control

Beyond the six core demo scenarios, the dashboard includes stream pause/resume to demonstrate real-world command patterns:

#### What It Does

- **Pause Button** (`⏸`): Stops telemetry broadcast without stopping frame generation
  - Ensures resumed stream starts with latest data (no cold-start delay)
  - Perfect for network congestion or analysis of a frozen snapshot
- **Resume Button** (`▶`): Restarts telemetry broadcast
- **Status Indicator**: Shows request state (optimistic feedback) separately from server confirmation
  - Displays "Syncing..." while states diverge
  - Shows "✓ Paused" or "✓ Running" when confirmed

#### Why This Pattern Matters

In distributed systems, commands are never instantly confirmed due to network latency or failures. By separating:
- **Local request state** (what user just clicked)
- **Server confirmation state** (what server applied)

The UI provides accurate feedback and graceful error handling.

#### How to Use It

```bash
npm run dev  # Start both web and server
```

In the frontend, click the "⏸ Pause" button:
1. Button disables immediately (optimistic feedback)
2. Page stops receiving new frames
3. After ~1-2s: Status shows "✓ Paused" (server confirmation)

Then click "▶ Resume":
1. Page resumes updates
2. Status shows "✓ Running" (confirmed)

#### API Endpoints

```bash
# Pause the stream
curl -X POST http://localhost:3001/api/stream/pause

# Check current status
curl -s http://localhost:3001/api/stream/status
# Returns: { "isPaused": false, "timestamp": 1234567890 }

# Resume the stream
curl -X POST http://localhost:3001/api/stream/resume
```

## AI Usage Notes

This project was developed with AI assistance. Final implementation choices and acceptance criteria were reviewed by the author.

### 1) Generated with AI Assistance

- Initial scaffolding for React/TypeScript frontend and Node/Express backend
- Boilerplate for WebSocket transport, scenario routes, and telemetry state wiring
- Draft versions of UI component structure and CSS organization
- First-pass documentation structure and checklists

### 2) Written / Decided by the Author

- Trust-state model and operator-facing semantics (`no-data-yet`, `live`, `stale`, `reconnecting`, `disconnected`)
- Fault-injection behavior and demo flow (stale, drop, warning/critical alarm)
- Alarm priority UX policy (critical full-screen alert, warning lightweight popup)
- Manual connect startup behavior for explicit `no-data-yet` demonstration
- Scope decisions for a one-day MVP (manual validation over full automated test suite)

### 3) Validation of AI-Assisted Output

- Type-check and production build verification for frontend and backend
  - `npm --prefix apps/web run build`
  - `npm --prefix apps/server run build`
- Runtime validation using the checklist in this README
  - connect/disconnect flow
  - stale data handling
  - reconnect backoff behavior
  - alarm raise/clear behavior
- Manual review to ensure docs match implementation (for example, manual connect behavior)

### Notes and Limitations

- AI-generated code was treated as draft output and refined where behavior did not match operator safety intent.
- Automated tests are currently a bonus item, not part of the MVP acceptance gate for this assignment.

## Project Documentation

For deeper understanding of each phase:

- `doc/project-guide.zh.md`: Complete Chinese implementation guide with design decisions
- `doc/project-detailed-guide.md`: Technical reference with code snippets and architecture details
- `doc/project-demo-guide.md`: Quick demo script and validation steps
- `doc/project-kickoff-plan.zh.md`: Original 15-step execution plan