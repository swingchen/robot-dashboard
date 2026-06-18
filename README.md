# Robot Dashboard

Real-time vehicle telemetry dashboard — operator console with trust-state visualization, alarm management (with critical overlay), and demo scenario control. Built as a monorepo: Express + WebSocket backend, Vite + React + Zustand frontend.

## Architecture

```
apps/
  server/     Express + ws WebSocket server, telemetry generator, scenario control
  web/        Vite + React 18 + Zustand SPA
    src/
      components/   AlarmInfoPanel, TrustBanner, PoseView, VitalsPanel, ControlPanel
      store/        Zustand telemetry store with UI snapshot batching
      services/     WebSocket client (auto-reconnect + backoff), message router
      styles/       CSS tokens → base → layout → state → per-component CSS
      utils/        Backoff strategy, freshness/trust-state derivation
```

### CSS Organization

```
tokens.css    Design variables (colors, spacing, typography, shadows, z-index)
base.css      Reset + base element styling
layout.css    Grid, panel containers, responsive breakpoints (no component styles)
state.css     Trust-state colors, animations, frozen/disconnected indicators
components/   One CSS file per component — self-contained, no cross-dependencies
```

## Quick Start

```bash
# Install dependencies
npm install
npm run install:all

# Start both web + server
npm run dev
# → Web:  http://localhost:5173
# → Server: http://localhost:3001 (WebSocket ws://localhost:3001/telemetry)

# Or start individually
npm run dev:web
npm run dev:server
```

The frontend auto-connects on page load.

## Build

```bash
npm run build

# Output:
#   apps/web/dist/     — static bundle
#   apps/server/dist/  — compiled JS
```

## Tests

```bash
npm --prefix apps/web test
# → 19 tests: backoff (reconnect delay) + freshness (trust-state derivation)
```

## Deploy

```bash
# Backend
cd apps/server
NODE_ENV=production PORT=3001 node dist/index.js

# Frontend (any static host)
npx serve apps/web/dist -l 5173
```

Optional env vars:

- `PORT` — server port (default `3001`)
- `BOOT_SCENARIO=live` — initial scenario
- `VITE_TELEMETRY_WS_URL=ws://<host>:3001/telemetry` — for split-host deploys

## Verification Checklist

### Setup

- [ ] `npm install && npm run install:all` — no errors
- [ ] `npm run build` — produces both `dist/` folders

### Backend

- [ ] `npm run dev:server` → starts on port 3001
- [ ] `curl -s http://localhost:3001/health` → `{ "status": "ok" }`
- [ ] `curl -s http://localhost:3001/api/scenario` → `{ "scenario": "live" }`

### Frontend

- [ ] `npm run dev:web` → starts on port 5173
- [ ] Page loads, TrustBanner visible, auto-connects → `no-data-yet` → `live`

### Full Integration

Start both services (`npm run dev`), then step through:

1. **① Connect** — `no-data-yet` → `live`; vehicle appears on PoseView; vitals populate; alarms cycle automatically (active ~6s, pause ~4s). When critical alarms appear, a full-screen overlay pops up for acknowledgment.
2. **② Stale** — click Stale; after ~2.5s: TrustBanner goes orange, values freeze
3. **③ Recover** — click Recover; returns to green `Live Stream`
4. **④ Drop** — click Drop; connection drops → `reconnecting` → auto-reconnects → `live`
5. **⑤ Disconnect** — click Disconnect; red pulsing `Disconnected`; no auto-reconnect

### Visual

- [ ] TrustBanner: green(live) / orange(stale) / blue(reconnecting) / red(disconnected)
- [ ] PoseView vehicle moves + heading rotates; frozen = orange dashed border
- [ ] Alarm info panel: severity color-coded items, ack buttons, count badge
- [ ] Critical alarms trigger full-screen overlay with confirm-ack flow
- [ ] No horizontal scrollbar; responsive grid stacks to single column below 1440px

---

## Bonus: Command Round-Trip (Pause/Resume)

Pause/Resume button sends a command to the server and reflects the acknowledged state:

```bash
curl -X POST http://localhost:3001/api/stream/pause
curl -X POST http://localhost:3001/api/stream/resume
curl -s http://localhost:3001/api/stream/status
```

UI shows `requesting...` during the HTTP round-trip, then `✓ Paused` / `✓ Running` on confirmation.
