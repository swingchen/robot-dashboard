# Robot Dashboard Detailed Guide

This document is the detailed implementation reference.
Each completed phase should be appended here.

## Phase 1: Root Project Setup

### Goal

Set up the repository root so the web app and the server can be installed, built, and started from one place through explicit per-app root scripts.

### 1. What code was written

The first phase added the root project files that let the repository control both apps from one place:

- `package.json`
- `tsconfig.base.json`
- `README.md` with basic run instructions

### Root `package.json`

```json
{
  "name": "robot-dashboard",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "concurrently -n web,server -c blue,green \"npm run dev:web\" \"npm run dev:server\"",
    "dev:web": "npm --prefix apps/web run dev",
    "dev:server": "npm --prefix apps/server run dev",
    "build": "npm --prefix apps/web run build && npm --prefix apps/server run build",
    "install:web": "npm --prefix apps/web install",
    "install:server": "npm --prefix apps/server install",
    "install:all": "npm run install:web && npm run install:server"
  },
  "devDependencies": {
    "concurrently": "^9.1.2",
    "typescript": "^5.6.3"
  }
}
```

### Shared TypeScript base config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

### 2. What each part does

#### Root scripts

```json
"dev": "concurrently -n web,server -c blue,green \"npm run dev:web\" \"npm run dev:server\""
```

This starts the web app and the server at the same time from the root folder.

```json
"dev:web": "npm --prefix apps/web run dev"
```

This forwards the command to the web app folder only.

```json
"dev:server": "npm --prefix apps/server run dev"
```

This forwards the command to the server app folder only.

```json
"build": "npm --prefix apps/web run build && npm --prefix apps/server run build"
```

This runs the web build and then the server build from the root.

```json
"install:all": "npm run install:web && npm run install:server"
```

Because the root now installs each app explicitly, the package provides install helpers for each app.

#### Shared TypeScript config

```json
"strict": true,
"noUnusedLocals": true,
"noUnusedParameters": true
```

These settings enforce a stricter TypeScript baseline for both apps, which helps catch mistakes early before the project grows.

### 3. What this phase means

This phase does not implement telemetry or UI features yet.

Its purpose is to create a stable project foundation:

- one root repository
- one command surface for development
- one shared TypeScript baseline
- one explicit way to install, build, and run both apps

In demo terms, this phase proves that the project is organized correctly before any telemetry or UI logic is added.

### 4. How to validate it

Run these commands from the repository root:

```bash
npm install
npm run install:all
npm run build
```

Optional command checks:

```bash
npm run dev:web
npm run dev:server
```

### Expected acceptance result

This phase is accepted if:

1. the root directory installs its own tooling successfully
2. the root helper scripts install both apps successfully
3. `npm run build` can trigger both app builds from the root
4. the root scripts provide one consistent way to start the project

## Phase 2: Web and Server Scaffolding

### Goal

Create a minimal runnable web app and a minimal runnable server so both sides of the project can start independently before any real telemetry or trust-state logic is added.

### 1. What code was written

The second phase added the initial application shells for both apps:

- `apps/web/package.json`
- `apps/web/src/main.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/styles.css`
- `apps/server/package.json`
- `apps/server/src/index.ts`

### Web app package

```json
{
  "name": "@robot-dashboard/web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  }
}
```

### Web entry point

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### Web placeholder component

```tsx
const checkpoints = [
  'Root project configured',
  'Web shell ready',
  'Server shell ready',
  'Telemetry stream wiring next',
];
```

This placeholder UI was used to prove that the front end could boot, render, and load styles before the telemetry state layer was implemented.

### Server app package

```json
{
  "name": "@robot-dashboard/server",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  }
}
```

### Server entry point

```ts
const app = express();
const server = createServer(app);
const wsServer = new WebSocketServer({
  server,
  path: '/telemetry',
});
```

The server entry file started as the runnable shell for the backend. In later phases, the same entry point was expanded with telemetry streaming and scenario logic, but in this phase its main job was to prove that the backend app could start cleanly and expose a valid runtime surface.

### 2. What each part does

#### Web package scripts

```json
"dev": "vite",
"build": "tsc --noEmit && vite build",
"preview": "vite preview"
```

These scripts make the front end a standard Vite application with a dev server, a type-checked production build, and a preview mode.

#### `main.tsx`

```tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

This mounts the React application into the page and loads the top-level `App` component.

#### `App.tsx`

```tsx
<h1>Project skeleton is up.</h1>
```

The placeholder content confirms that the front end starts successfully. At this stage, it is intentionally static. The purpose is to validate the shell, not the telemetry UI.

#### `styles.css`

The CSS adds a complete but lightweight visual shell so the project does not start as an unstyled blank page. This helps the scaffold feel intentional without locking in the final dashboard design too early.

#### Server package scripts

```json
"dev": "tsx watch src/index.ts",
"build": "tsc -p tsconfig.json",
"start": "node dist/index.js"
```

These scripts make the backend runnable in both development and built modes.

#### `src/index.ts`

This is the backend entry point. Even though it grew in later phases, the important purpose of this phase was to establish:

- one valid Express app
- one valid Node HTTP server
- one valid application startup path
- one place where backend runtime behavior would continue to grow

### 3. What this phase means

This phase proves that both applications exist as real runnable programs.

It is the transition from project structure to executable software:

- the web side can render a visible page
- the server side can boot as a TypeScript application
- both apps now have stable entry points for future work

In demo terms, this is the point where the repository stops being only a structural shell and becomes a working two-app system.

### 4. How to validate it

Run the apps independently from the repository root:

```bash
npm run dev:web
npm run dev:server
```

You can also run both together:

```bash
npm run dev
```

Then validate the running surfaces:

1. open the Vite app in the browser
2. confirm the placeholder page renders
3. call the backend health endpoint

```bash
curl -s http://localhost:3001/health
```

### Expected acceptance result

This phase is accepted if:

1. the web app starts and renders a visible placeholder page
2. the server starts without runtime errors
3. both apps can be launched independently from the root scripts
4. the repository now has stable front-end and back-end entry points

### Notes for later phases

The current server entry file now contains more logic than it did at the end of Phase 2 because telemetry and scenario support were added later. That is expected. For this phase, the key idea is not the full server feature set yet, but the fact that the server had already become a real executable application shell.

## Phase 3: Telemetry Types and Generator

### Goal

Define the telemetry data contract and implement a generator that can continuously produce valid telemetry frames even before WebSocket broadcasting is added.

### 1. What code was written

The third phase added the core backend telemetry data layer:

- `apps/server/src/telemetry/types.ts`
- `apps/server/src/telemetry/generator.ts`

### Telemetry type definitions

```ts
export interface TelemetryFrame {
  ts: number;
  pose: Pose;
  speed: number;
  battery: number;
  mission: MissionState;
  alarms: TelemetryAlarm[];
}
```

This file defines the schema for a single telemetry frame. It locks in the assignment-critical fields that later layers will rely on.

### Generator structure

```ts
interface GeneratorState {
  x: number;
  y: number;
  headingRad: number;
  battery: number;
  missionIndex: number;
  missionProgress: number;
  lastTimestamp: number;
}
```

This internal state makes the generator stateful instead of random. Each new frame advances from the previous one.

### Generator entry point

```ts
nextFrame(now = Date.now()): TelemetryFrame {
```

This method generates a new telemetry frame based on the elapsed time and the previous internal state.

### 2. What each part does

#### `types.ts`

The telemetry types establish one stable data contract for:

- backend generation
- websocket transport
- front-end state handling
- UI rendering later on

#### `MISSIONS`

```ts
const MISSIONS = [
  'Transit to waypoint alpha',
  'Inspect storage lane',
  'Return to charging berth',
] as const;
```

This gives the generator a rotating set of mission labels so the mission field is not static.

#### Stateful generation

```ts
private readonly state: GeneratorState = {
  x: 0,
  y: 0,
  headingRad: Math.PI / 8,
  battery: 100,
  missionIndex: 0,
  missionProgress: 12,
  lastTimestamp: Date.now(),
};
```

The generator keeps track of motion, battery, mission progress, and time so each frame evolves continuously instead of jumping randomly.

#### Time-based progression

```ts
const deltaMs = Math.max(now - this.state.lastTimestamp, 1000 / 15);
const deltaSeconds = deltaMs / 1000;
```

This makes frame updates depend on elapsed time instead of hard-coded fixed steps.

#### Continuous value updates

```ts
this.state.x += Math.cos(this.state.headingRad) * speed * deltaSeconds;
this.state.y += Math.sin(this.state.headingRad) * speed * deltaSeconds;
this.state.battery -= deltaSeconds * 0.35;
this.state.missionProgress += deltaSeconds * 7.5;
```

These updates make pose, battery, and mission values look continuous and alive.

#### Demo-friendly cycling

```ts
if (this.state.battery < 18) {
  this.state.battery = 100;
}

if (this.state.missionProgress >= 100) {
  this.state.missionProgress -= 100;
  this.state.missionIndex = (this.state.missionIndex + 1) % MISSIONS.length;
}
```

These resets keep the demo data usable over time instead of letting values hit dead ends.

#### Frame output

```ts
return {
  ts: now,
  pose: { ... },
  speed: roundTo(speed),
  battery: roundTo(this.state.battery),
  mission: { ... },
  alarms: [],
};
```

The generator outputs a valid `TelemetryFrame` and intentionally leaves alarms empty at this stage. Alarm injection belongs to a later scenario layer.

### 3. What this phase means

This phase is where the backend stops being only a runnable shell and starts owning real telemetry data.

It establishes:

- one fixed telemetry schema
- one stateful telemetry source
- one backend data stream origin that does not depend on WebSocket clients yet

In demo terms, this phase proves that the backend can already generate realistic-looking telemetry before transport and scenarios are layered on top.

### 4. How to validate it

Build the server app:

```bash
npm --prefix apps/server run build
```

Then run the generator directly from the built output:

```bash
node --input-type=module -e "import { TelemetryGenerator } from './apps/server/dist/telemetry/generator.js'; const generator = new TelemetryGenerator(); const base = Date.now(); const frames = [generator.nextFrame(base), generator.nextFrame(base + 67), generator.nextFrame(base + 134)]; console.log(JSON.stringify(frames, null, 2));"
```

### Expected acceptance result

This phase is accepted if:

1. the telemetry types compile cleanly
2. the generator produces valid telemetry frames without any websocket client
3. timestamps increase across frames
4. pose, speed, battery, and mission values change over time
5. alarms default to an empty array at this stage

## Phase 4: Scenario Controller, Broadcaster, and Connection Manager

### Goal

Turn the generated telemetry data into a real streaming system that can express different runtime scenarios such as live streaming, stale data, alarm injection, and disconnect behaviors.

### 1. What code was written

The fourth phase added the server-side control and delivery layer:

- `apps/server/src/scenarios/controller.ts`
- `apps/server/src/scenarios/applyScenario.ts`
- `apps/server/src/connection/manager.ts`
- `apps/server/src/telemetry/broadcaster.ts`
- wiring in `apps/server/src/index.ts`

### Scenario controller

```ts
export const scenarioNames = ['live', 'stale', 'drop', 'manual-disconnect', 'alarm'] as const;
```

This file defines the supported runtime scenarios and provides a controller that tracks the active scenario, exposes it as a snapshot, and notifies listeners when the scenario changes.

### Broadcaster

```ts
private tick(): void {
  if (!this.options.controller.shouldStream()) {
    return;
  }

  const baseFrame = this.options.generator.nextFrame();
  const nextFrame = this.options.controller.shouldInjectAlarm()
    ? withInjectedAlarm(baseFrame)
    : baseFrame;

  this.latestFrame = nextFrame;
  this.options.connectionManager.broadcast(JSON.stringify(nextFrame));
}
```

This is the core runtime loop that decides whether frames should be sent, whether an alarm should be injected, and how the latest frame is broadcast to active clients.

### Connection manager

```ts
private readonly sockets = new Set<WebSocket>();
```

This file centralizes how active websocket clients are registered, cleaned up, broadcast to, closed, or terminated.

### Scenario side effects

```ts
if (next.current === 'drop') {
  connectionManager.terminateAll();
  return;
}

if (next.current === 'manual-disconnect') {
  connectionManager.closeAll(MANUAL_DISCONNECT_CODE, MANUAL_DISCONNECT_REASON);
}
```

This file maps scenario changes to immediate connection-side effects.

### 2. What each part does

#### `ScenarioController`

This class is the scenario state machine for the backend. It tracks the current scenario, stores when it changed, and exposes helpers such as:

- `shouldStream()`
- `shouldInjectAlarm()`

These helpers define scenario meaning in one place instead of scattering conditions throughout the server.

#### `TelemetryBroadcaster`

The broadcaster converts generated data into a transport stream:

- it keeps a `latestFrame` cache
- it starts a timed loop at the configured stream rate
- it asks the scenario controller whether streaming should continue
- it optionally injects alarm data
- it broadcasts the frame through the connection manager

#### `ConnectionManager`

The connection manager owns websocket lifecycle behavior:

- accepting or rejecting new connections depending on the active scenario
- tracking open sockets
- cleaning up dead sockets
- broadcasting frames only to open sockets
- closing or terminating all sockets when needed

#### `applyScenario()`

This function handles immediate side effects of scenario changes:

- `drop` maps to abnormal termination
- `manual-disconnect` maps to an explicit close with a code and reason

This separation keeps scenario state and scenario effects from being mixed into the same class.

#### `index.ts` wiring

The server entry point wires together:

- one scenario controller
- one connection manager
- one telemetry generator
- one broadcaster

It also sends the latest frame immediately to newly accepted clients so they do not have to wait for the next interval tick.

### 3. What this phase means

This phase is where the backend becomes a real telemetry streaming system instead of only a data producer.

It establishes:

- one scenario-aware stream controller
- one transport-aware broadcaster
- one centralized websocket connection lifecycle manager
- one backend that can deliberately express different trust-relevant states

In demo terms, this is the phase where the backend can now show the behavioral difference between live, stale, alarm, manual disconnect, and drop.

### 4. How to validate it

Start the server:

```bash
npm run dev:server
```

Connect any websocket client to:

```text
ws://localhost:3001/telemetry
```

Then validate scenario differences:

1. `live` continues sending frames
2. `stale` keeps the connection but stops new frames
3. `alarm` continues sending frames and includes alarm data
4. `manual-disconnect` closes the connection intentionally
5. `drop` terminates the connection abnormally

### Expected acceptance result

This phase is accepted if:

1. frames are broadcast continuously in the live scenario
2. stale behavior is observably different from live behavior
3. alarm injection appears without changing the base generator logic
4. manual disconnect and drop produce different disconnect semantics
5. the server can manage multiple clients through a single connection manager

## Phase 5: Scenario Control HTTP API

### Goal

Expose an HTTP control layer so the backend scenarios can be queried, changed, and reset independently of the WebSocket telemetry stream.

### 1. What code was written

The fifth phase added the backend control API layer:

- `apps/server/src/routes/scenario-control.ts`
- API router wiring in `apps/server/src/index.ts`

### Router factory

```ts
export function createScenarioControlRouter(controller: ScenarioController): Router {
  const router = Router();
  return router;
}
```

This file creates an Express router around the existing `ScenarioController` instead of mixing route logic directly into the server entry point.

### Scenario query endpoint

```ts
router.get('/scenario', (_request, response) => {
  response.json({
    scenario: controller.getSnapshot().current,
    availableScenarios: scenarioNames,
  });
});
```

This endpoint returns the active scenario and the full supported scenario list so clients can discover the valid control surface.

### Scenario switch endpoint

```ts
router.post('/scenario', (request, response) => {
  const { scenario } = request.body as ScenarioRequestBody;

  if (!scenario || !isScenarioName(scenario)) {
    response.status(400).json({
      error: 'scenario must be one of the supported demo scenario names',
      availableScenarios: scenarioNames,
    });
    return;
  }

  const snapshot = controller.setScenario(scenario satisfies ScenarioName ? scenario : 'live');

  response.json({
    scenario: snapshot.current,
    changedAt: snapshot.changedAt,
  });
});
```

This endpoint validates the incoming scenario name, rejects unsupported values, and applies the change through the existing controller so all broadcaster and connection-side effects continue to flow through the same backend state machine.

### Reset endpoint

```ts
router.post('/scenario/reset', (_request, response) => {
  const snapshot = controller.setScenario('live');

  response.json({
    scenario: snapshot.current,
    changedAt: snapshot.changedAt,
  });
});
```

This endpoint provides one explicit return path to the default live state, which simplifies manual demo recovery after testing disconnect or alarm scenarios.

### API mounting

```ts
app.use(express.json());
app.use('/api', createScenarioControlRouter(scenarioController));
```

The router is mounted under `/api`, so the exposed control endpoints become:

- `GET /api/scenario`
- `POST /api/scenario`
- `POST /api/scenario/reset`

### 2. What each part does

#### `ScenarioRequestBody`

```ts
interface ScenarioRequestBody {
  scenario?: string;
}
```

This keeps the request shape explicit instead of treating the body as untyped data.

#### Validation helpers

```ts
isScenarioName(scenario)
scenarioNames
```

These reuse the same supported scenario definitions that the streaming layer already depends on, so the HTTP API cannot drift away from backend runtime behavior.

#### `controller.setScenario(...)`

The routes do not implement scenario behavior themselves. They delegate all state changes to the existing `ScenarioController`, which means the HTTP API becomes a control surface over the same scenario system already used by the broadcaster and connection manager.

#### `changedAt`

Returning the updated snapshot timestamp gives callers a concrete signal that a scenario change really happened.

### 3. What this phase means

This phase separates transport from control:

- WebSocket continues to carry telemetry frames
- HTTP now controls backend demo state
- scenario changes can be driven externally without restarting the server or injecting special WebSocket messages

In demo terms, this is the phase where the backend becomes easy to operate live during a walkthrough. A reviewer or operator can flip scenarios with plain HTTP requests while the WebSocket stream continues to represent the resulting behavior.

### 4. How to validate it

Start the server:

```bash
npm run dev:server
```

Then query and switch scenarios:

```bash
curl -s http://localhost:3001/api/scenario
curl -s -X POST http://localhost:3001/api/scenario \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"alarm"}'
curl -s -X POST http://localhost:3001/api/scenario \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"stale"}'
curl -s -X POST http://localhost:3001/api/scenario/reset
```

Also verify error handling:

```bash
curl -i -X POST http://localhost:3001/api/scenario \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"unsupported"}'
```

Then connect a WebSocket client and confirm the HTTP requests actually drive the stream behaviors introduced in the previous phase.

### Expected acceptance result

This phase is accepted if:

1. the server exposes one readable scenario query endpoint
2. each supported demo scenario can be selected through HTTP
3. reset reliably returns the scenario to `live`
4. invalid input is rejected with a `400` response
5. WebSocket behavior changes immediately after HTTP-driven scenario updates

## Phase 6: Front-End Types, Store, Freshness, and Backoff

### Goal

Build the front-end telemetry state layer before the final dashboard UI so trust-state derivation, stale detection, and reconnect timing can be validated directly.

### 1. What code was written

The sixth phase added the web-side state foundation:

- `apps/web/src/types/telemetry.ts`
- `apps/web/src/utils/freshness.ts`
- `apps/web/src/utils/backoff.ts`
- `apps/web/src/store/telemetryStore.ts`
- `apps/web/src/store/selectors.ts`
- temporary state-inspector wiring in `apps/web/src/App.tsx`

### Telemetry and UI state types

```ts
export type ConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'disconnected';

export type FreshnessState = 'no-data-yet' | 'fresh' | 'stale';

export type TrustState = 'no-data-yet' | 'live' | 'stale' | 'reconnecting' | 'disconnected';
```

This file mirrors the backend telemetry frame contract and adds the front-end state vocabulary needed to describe transport, freshness, trust, and UI behavior explicitly.

### Freshness derivation

```ts
export function deriveFreshnessState(
  lastReceiveTime: number | null,
  now: number,
  thresholdMs = STALE_THRESHOLD_MS,
): FreshnessState {
  if (lastReceiveTime === null) {
    return 'no-data-yet';
  }

  return now - lastReceiveTime > thresholdMs ? 'stale' : 'fresh';
}
```

This function turns timestamps into one explicit freshness state instead of asking every component to reason about elapsed time on its own.

### Trust-state derivation

```ts
export function deriveTrustState(
  connectionState: ConnectionState,
  freshnessState: FreshnessState,
): TrustState {
  if (connectionState === 'reconnecting') {
    return 'reconnecting';
  }

  if (connectionState === 'disconnected') {
    return 'disconnected';
  }

  if (freshnessState === 'no-data-yet') {
    return 'no-data-yet';
  }

  return freshnessState === 'stale' ? 'stale' : 'live';
}
```

This keeps trust-state logic centralized and assignment-aligned. Transport failure wins over freshness, and stale data never masquerades as live data.

### Reconnect backoff

```ts
export function getReconnectDelay(
  attempt: number,
  baseMs = RECONNECT_BASE_MS,
  maxMs = RECONNECT_MAX_MS,
): number {
  const normalizedAttempt = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;

  return Math.min(maxMs, baseMs * 2 ** normalizedAttempt);
}
```

This utility makes reconnect timing deterministic and bounded before the actual websocket transport layer is added.

### Zustand store

```ts
export const useTelemetryStore = create<TelemetryStoreState>((set) => ({
  ...createInitialState(Date.now()),

  receiveFrame: (frame, receivedAt = Date.now()) => {
    set((state) =>
      createStatePatch(state, {
        rawFrame: frame,
        lastReceiveTime: receivedAt,
        alarms: frame.alarms,
        connectionState: 'open',
        reconnectAttempt: 0,
        now: receivedAt,
      }),
    );
  },
```

The store keeps both raw transport data and derived UI-facing state together:

- `rawFrame`
- `uiSnapshot`
- `lastReceiveTime`
- `alarms`
- `connectionState`
- `freshnessState`
- `trustState`
- `viewState`
- reconnect attempt and next backoff delay

This means the UI layer can consume already-derived state instead of recomputing trust and freshness rules inside components.

### Temporary inspector UI

```tsx
<button className="action-button" type="button" onClick={() => pushFrame(false)}>
  Receive live frame
  <span>Pushes a fresh telemetry frame through the store.</span>
</button>
```

The current `App.tsx` is intentionally a temporary state inspector rather than the final dashboard. It exposes manual actions that trigger store transitions directly so the state logic can be validated before step seven adds websocket transport and message routing.

### 2. What each part does

#### `types/telemetry.ts`

This file gives the web app a typed contract for:

- raw telemetry frames
- connection lifecycle state
- freshness state
- trust state
- view state
- one UI snapshot shape derived from the raw frame

#### `utils/freshness.ts`

This file converts timestamps and connection state into:

- `freshnessState`
- `trustState`
- `viewState`
- one normalized `uiSnapshot`

It also marks whether values should be treated as frozen through `isFrozen`.

#### `utils/backoff.ts`

This file computes reconnect delays from attempt count using the locked kickoff parameters of `1000ms` base delay and `30000ms` max delay.

#### `store/telemetryStore.ts`

This file is the single state owner for the front end. It exposes actions such as:

- `receiveFrame()`
- `syncClock()`
- `markConnecting()`
- `markConnected()`
- `markReconnecting()`
- `markDisconnected()`
- `resetState()`

These actions are intentionally simple and map closely to the states that later websocket and UI code will need.

#### `store/selectors.ts`

This file provides small selectors for:

- the raw frame
- the derived UI snapshot
- a compact debug summary

This keeps the current inspector screen and future components from reaching into the full store shape unnecessarily.

#### Temporary `App.tsx`

The current app shell is now a debug harness that proves:

1. `no-data-yet` persists until a first frame exists
2. `live` appears only after a valid frame arrives
3. `stale` appears after the threshold elapses
4. `reconnecting` overrides freshness
5. `disconnected` keeps last-known values but reduces trust
6. alarms remain separate from the trust-state signal

### 3. What this phase means

This phase is the handoff from static UI shell to real front-end state logic.

It establishes:

- one typed boundary between backend frames and frontend UI state
- one centralized place for trust-state derivation
- one explicit stale-data policy
- one bounded reconnect backoff strategy
- one manual validation surface before websocket transport is introduced

In demo terms, this is the phase where the front end begins to behave like an operator interface even though the final visual dashboard components are not built yet.

### 4. How to validate it

Build the web app:

```bash
npm --prefix apps/web run build
```

Then run the web app:

```bash
npm run dev:web
```

Use the temporary inspector screen and validate these transitions:

1. click `Mark open` and confirm trust state remains `no-data-yet`
2. click `Receive live frame` and confirm trust state becomes `live`
3. click `Advance past stale threshold` and confirm trust state becomes `stale`
4. click `Mark reconnecting` and confirm trust state becomes `reconnecting`
5. click `Mark disconnected` and confirm trust state becomes `disconnected`
6. click `Receive frame with alarm` and confirm alarm count changes without overriding trust-state semantics

### Expected acceptance result

This phase is accepted if:

1. the front end has explicit types for telemetry, trust, freshness, and view state
2. state derivation happens in one centralized layer rather than inside presentation components
3. stale data is represented as frozen last-known data instead of current live data
4. reconnect timing is explicit and bounded
5. the state transitions can be validated manually without the final dashboard UI

## Phase 7: WebSocket Client and Message Router

### Goal

Connect the front end to the real backend websocket stream and make transport behavior explicit: connect, disconnect, reconnect, latest-only buffering, and immediate alarm delivery.

### 1. What code was written

The seventh phase added the web-side transport layer:

- `apps/web/src/services/websocketClient.ts`
- `apps/web/src/services/messageRouter.ts`
- live transport wiring in `apps/web/src/App.tsx`

### WebSocket URL resolution

```ts
export function getTelemetryWebSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_TELEMETRY_WS_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  return `${protocol}//${window.location.hostname}:3001/telemetry`;
}
```

This gives the client one predictable websocket target while still allowing an override through `VITE_TELEMETRY_WS_URL`.

### WebSocket client lifecycle

```ts
connect(): void {
  if (
    this.socket &&
    (this.socket.readyState === WebSocket.OPEN ||
      this.socket.readyState === WebSocket.CONNECTING ||
      this.socket.readyState === WebSocket.CLOSING)
  ) {
    return;
  }

  this.clearReconnectTimer();
  this.manualClose = false;
```

The client owns websocket lifecycle rules directly:

- it avoids opening duplicate sockets while one is already active or closing
- it emits `connecting`, `open`, `message`, `reconnecting`, `closed`, and `error` events
- it supports manual disconnect and reconnect-flow simulation
- it schedules reconnect attempts with the backoff rules from the previous phase

### Simulated reconnect flow

```ts
simulateReconnectFlow(): void {
  this.manualClose = false;
  this.clearReconnectTimer();

  if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
    this.socket.close(4001, 'Simulated reconnect flow');
    return;
  }

  this.scheduleReconnect(Date.now());
}
```

This path gives the debug page one explicit way to force the client into a real reconnect cycle while still using the normal exponential backoff interval.

### Message routing and latest-only buffering

```ts
routeMessage(data: string, receivedAt = Date.now()): boolean {
  const frame = this.parseFrame(data);

  if (!frame) {
    return false;
  }

  if (this.shouldFlushImmediately(frame)) {
    this.clearFlushTimer();
    this.pendingFrame = null;
    this.pendingReceivedAt = null;
    this.commit(frame, receivedAt);
    return true;
  }

  this.pendingFrame = frame;
  this.pendingReceivedAt = receivedAt;
```

The message router parses incoming telemetry frames and applies a latest-only buffering rule:

- only the most recent pending frame is kept between commits
- the first frame is committed immediately
- any alarm signature change is committed immediately
- otherwise frames flush on the UI commit interval

This keeps the UI responsive without forcing a render on every websocket message.

### Alarm-sensitive commit rule

```ts
private shouldFlushImmediately(frame: RawTelemetryFrame): boolean {
  if (!this.hasCommittedFrame) {
    return true;
  }

  return getAlarmSignature(frame.alarms) !== this.lastCommittedAlarmSignature;
}
```

This is the key rule that protects short-lived alarms from being swallowed by throttling. Even if normal telemetry is buffered, alarm changes punch through immediately.

### App wiring

```tsx
useEffect(() => {
  const router = new TelemetryMessageRouter({
    onFrame: receiveFrame,
    commitIntervalMs: UI_COMMIT_INTERVAL_MS,
  });
  const client = new TelemetryWebSocketClient(streamUrlRef.current);
```

The current app shell now wires the transport layer into the store from phase six:

- websocket lifecycle events call store actions such as `markConnecting()` and `markReconnecting()`
- websocket messages flow through the message router before reaching `receiveFrame()`
- one interval calls `syncClock()` so stale detection keeps advancing even when no new frames arrive
- cleanup unsubscribes the socket listener and disposes the router, which avoids duplicate listener registration across rerenders or remounts

### 2. What each part does

#### `services/websocketClient.ts`

This file owns transport lifecycle behavior:

- choosing the websocket URL
- connecting to the backend
- closing intentionally
- scheduling reconnect attempts
- surfacing transport events to the UI layer

#### `services/messageRouter.ts`

This file owns transport-to-store routing:

- parsing websocket message payloads
- deciding when to commit immediately
- keeping only the latest buffered frame
- flushing through the store on a bounded interval

#### Live `App.tsx` transport inspector

The app shell is still a debug-oriented screen, but it is no longer using synthetic frames. It now shows live transport state, live telemetry values, current backoff information, and controls for:

- `Connect stream`
- `Disconnect stream`
- `Simulate reconnect flow`
- `Sync clock now`
- `Reset local store`

### 3. What this phase means

This phase is where the front end stops simulating telemetry and starts acting as a real streaming client.

It establishes:

- one actual websocket transport connection to the backend
- one bounded latest-only UI commit strategy
- one reconnect-aware client lifecycle
- one transport path that preserves alarm visibility

In demo terms, this is the phase where the browser can now show real `live`, `stale`, `reconnecting`, and `disconnected` trust-state transitions driven by actual backend behavior instead of only manual store actions.

### 4. How to validate it

Start the backend:

```bash
npm run dev:server
```

Start the web app:

```bash
npm run dev:web
```

Then validate these behaviors from the browser page and backend control API:

1. on page load, the socket connects automatically and trust state reaches `live`
2. click `Disconnect stream` and confirm trust state becomes `disconnected`
3. click `Connect stream` and confirm frames resume
4. click `Simulate reconnect flow` and confirm reconnect state appears and follows the normal backoff delay
5. switch the backend to `stale` and confirm the UI eventually transitions to `stale`
6. switch the backend to `alarm` and confirm alarms appear immediately
7. switch the backend to `manual-disconnect` or `drop` and confirm the client enters reconnect flow

Useful backend control commands:

```bash
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"stale"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"alarm"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"manual-disconnect"}'
curl -s -X POST http://localhost:3001/api/scenario/reset
```

### Expected acceptance result

This phase is accepted if:

1. the web app consumes the real websocket telemetry stream
2. reconnect behavior is automatic and externally visible in state
3. no duplicate websocket listener registration occurs during app lifetime
4. normal frame commits are latest-only instead of one-render-per-message
5. short alarm bursts are not swallowed by the commit interval

## Phase 8: Running Through the Front-End State Layer

### Goal

Use the existing live transport inspector as the formal acceptance harness for front-end trust-state semantics. This phase is not about final dashboard components yet. It is about proving that the current state system behaves correctly under `no-data-yet`, `live`, `stale`, `reconnecting`, `disconnected`, and alarm-bearing runtime conditions.

### 1. What code was used in this phase

This phase mainly exercises and explains the behavior already wired together in:

- `apps/web/src/App.tsx`
- `apps/web/src/store/telemetryStore.ts`
- `apps/web/src/utils/freshness.ts`
- `apps/web/src/services/websocketClient.ts`
- `apps/web/src/services/messageRouter.ts`

The important point is that Phase 8 is still a real implementation phase even though it adds almost no new subsystem. Its job is to prove the existing store, freshness logic, websocket client, and message router behave correctly when run together through one live page.

### Live inspector as the acceptance harness

The current app shell already exposes the right state signals for this walkthrough:

- trust state
- connection state
- freshness state
- frame age
- reconnect attempt and next backoff delay
- alarm count
- frozen-value status
- raw frame and derived snapshot output

That means the page is no longer just a transport debug surface. It is the concrete place where the front-end trust model can be accepted or rejected.

### `stale` is timer-driven, not server-labeled

```tsx
const clockTimer = window.setInterval(() => {
  syncClock(Date.now());
}, 250);
```

This interval is what makes the stale path real. When the backend switches to the `stale` scenario, it does not send a special websocket message that says "you are stale now." It simply stops sending new frames. The browser keeps advancing `now`, and the freshness logic compares that moving clock to `lastReceiveTime` until the stale threshold is crossed.

That distinction matters because it proves the UI can detect frozen telemetry even when the connection itself stays open.

### Local disconnect is intentionally different from backend `manual-disconnect`

```tsx
case 'closed':
  if (event.manual) {
    markDisconnected(event.at);
  }
  break;
```

The app only enters `disconnected` when the websocket client knows the close was initiated locally through `disconnect()`.

For non-manual closes, the client follows its reconnect path instead:

```ts
if (manual) {
  this.manualClose = false;
  this.reconnectAttempt = 0;
  return;
}

this.scheduleReconnect(Date.now());
```

This is the semantic difference that matters during demo validation:

- `Disconnect stream` means "stop locally and stay disconnected"
- backend `manual-disconnect` and `drop` mean "the server closed or broke the connection, so try to recover"

Those two paths may both preserve last-known telemetry on screen, but they are not the same trust-state outcome.

### Alarm remains visible without replacing trust state

`alarm` is not a trust-state value. The backend `alarm` scenario keeps streaming frames, and the front end continues to classify the page as `live` as long as freshness and connection state are healthy.

That is intentional. Alarm belongs to a separate UI surface. It is important, but it should not hide whether the underlying telemetry is fresh, stale, reconnecting, or disconnected.

This is also why the current page shows `Alarm Count` independently instead of inventing a sixth trust-state label.

### 2. What each validated state means

#### `no-data-yet`

The websocket may already be opening or even open, but no committed telemetry frame exists yet. This proves the UI does not pretend an empty transport is already live data.

#### `live`

The latest committed frame is recent enough to be considered fresh, and the transport is not in reconnect or local disconnect mode.

#### `stale`

The last committed frame still exists and remains visible, but its age has crossed the stale threshold. The values are therefore frozen last-known values rather than current truth.

#### `reconnecting`

The browser did not choose to stop. The transport was interrupted and the websocket client is now trying to recover using bounded exponential backoff.

#### `disconnected`

The operator intentionally stopped the local client. No automatic reconnect should start until the operator chooses to reconnect.

### 3. What this phase means

This is the phase where the front-end state model becomes demonstrably correct instead of merely well-structured.

By the end of it:

- trust-state derivation is visible under real websocket conditions
- stale behavior is proven without extra backend annotations
- reconnect behavior is distinguishable from local shutdown
- alarm visibility is confirmed without corrupting trust-state semantics

In practical terms, this phase closes the gap between "the state layer looks right in code" and "the operator-facing state behavior is now proven in the browser."

### 4. How to validate it

Start the backend:

```bash
npm run dev:server
```

Start the web app:

```bash
npm run dev:web
```

Then walk through these checks:

1. on first load, observe the page move from initial connect behavior into `live`
2. switch the backend to `stale` and wait slightly longer than the stale threshold; confirm trust state becomes `stale` while values remain visible as frozen last-known data
3. switch the backend to `alarm`; confirm trust state stays `live` while alarm count updates immediately
4. click `Disconnect stream`; confirm trust state becomes `disconnected` and no automatic reconnect starts
5. click `Connect stream`; confirm the stream returns
6. click `Simulate reconnect flow`; confirm reconnect state appears and the backoff counters advance
7. switch the backend to `manual-disconnect` or `drop`; confirm the page enters `reconnecting` rather than `disconnected`

Useful backend control commands:

```bash
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"stale"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"alarm"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"manual-disconnect"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"drop"}'
curl -s -X POST http://localhost:3001/api/scenario/reset
```

### Expected acceptance result

This phase is accepted if:

1. all five trust states are demonstrable on the live page
2. stale is proven to be derived from time since the last received frame
3. alarm remains visible without taking over trust-state classification
4. local disconnect and remote reconnect scenarios are clearly distinguishable
5. the current app shell already satisfies the assignment's core front-end state validation requirement before the final dashboard components are built