import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { TelemetryMessageRouter, UI_COMMIT_INTERVAL_MS } from './services/messageRouter';
import { TelemetryWebSocketClient, getTelemetryWebSocketUrl } from './services/websocketClient';
import { selectDebugSummary, selectRawFrame, selectUiSnapshot } from './store/selectors';
import { useTelemetryStore } from './store/telemetryStore';
import type { TrustState } from './types/telemetry';

const trustStateChecklist: Array<{ state: TrustState; detail: string }> = [
  { state: 'no-data-yet', detail: 'Socket is open but the first telemetry frame has not been committed yet.' },
  { state: 'live', detail: 'Frames are arriving from the server and the derived snapshot is current.' },
  { state: 'stale', detail: 'The socket stayed up, but the latest received frame is now older than the stale threshold.' },
  { state: 'reconnecting', detail: 'The websocket client scheduled a reconnect attempt and exposes the next backoff delay.' },
  { state: 'disconnected', detail: 'The stream was intentionally stopped and the UI keeps only last-known frozen data.' },
];

function formatDuration(ms: number | null): string {
  if (ms === null) {
    return 'No frames received';
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimestamp(value: number | null): string {
  if (value === null) {
    return 'Not available';
  }

  return new Date(value).toLocaleTimeString();
}

export default function App() {
  const snapshot = useTelemetryStore(selectUiSnapshot);
  const rawFrame = useTelemetryStore(selectRawFrame);
  const debugSummary = useTelemetryStore(useShallow(selectDebugSummary));
  const receiveFrame = useTelemetryStore((state) => state.receiveFrame);
  const syncClock = useTelemetryStore((state) => state.syncClock);
  const markConnecting = useTelemetryStore((state) => state.markConnecting);
  const markConnected = useTelemetryStore((state) => state.markConnected);
  const markReconnecting = useTelemetryStore((state) => state.markReconnecting);
  const markDisconnected = useTelemetryStore((state) => state.markDisconnected);
  const resetState = useTelemetryStore((state) => state.resetState);
  const socketClientRef = useRef<TelemetryWebSocketClient | null>(null);
  const messageRouterRef = useRef<TelemetryMessageRouter | null>(null);
  const streamUrlRef = useRef(getTelemetryWebSocketUrl());

  useEffect(() => {
    const router = new TelemetryMessageRouter({
      onFrame: receiveFrame,
      commitIntervalMs: UI_COMMIT_INTERVAL_MS,
    });
    const client = new TelemetryWebSocketClient(streamUrlRef.current);

    messageRouterRef.current = router;
    socketClientRef.current = client;

    const unsubscribe = client.subscribe((event) => {
      switch (event.type) {
        case 'connecting':
          markConnecting(event.at);
          break;
        case 'open':
          markConnected(event.at);
          break;
        case 'message':
          router.routeMessage(event.data, event.receivedAt);
          break;
        case 'reconnecting':
          markReconnecting(event.at);
          break;
        case 'closed':
          if (event.manual) {
            markDisconnected(event.at);
          }
          break;
        case 'error':
          break;
      }
    });

    client.connect();

    const clockTimer = window.setInterval(() => {
      syncClock(Date.now());
    }, 250);

    return () => {
      unsubscribe();
      window.clearInterval(clockTimer);
      client.disconnect();
      router.dispose();
      socketClientRef.current = null;
      messageRouterRef.current = null;
    };
  }, [markConnected, markConnecting, markDisconnected, markReconnecting, receiveFrame, syncClock]);

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Robot Operations Dashboard</p>
        <h1>Phase 8 trust-state walkthrough is live.</h1>
        <p className="summary">
          This screen now uses the real telemetry websocket as a live state walkthrough. The
          browser client owns connect, disconnect, and reconnect behavior, while the message
          router buffers frames in latest-only mode and still flushes first-frame and alarm
          changes immediately.
        </p>
      </section>

      <section className="debug-layout" aria-label="Frontend telemetry state inspector">
        <article className="debug-card state-card-large">
          <div className="card-header">
            <div>
              <p className="eyebrow">Trust State</p>
              <h2>{snapshot.trustState}</h2>
              <p className="muted-copy">
                View state mirrors trust state for now, which keeps the UI layer honest about when
                values are live, stale, reconnecting, or fully disconnected. Alarm remains a
                separate local signal instead of replacing trust state.
              </p>
            </div>

            <span className={`state-pill trust-${snapshot.trustState}`}>{snapshot.trustState}</span>
          </div>

          <div className="metric-grid">
            <div>
              <span>Connection</span>
              <strong>{debugSummary.connectionState}</strong>
            </div>
            <div>
              <span>Freshness</span>
              <strong>{debugSummary.freshnessState}</strong>
            </div>
            <div>
              <span>View State</span>
              <strong>{debugSummary.viewState}</strong>
            </div>
            <div>
              <span>Last Receive Age</span>
              <strong>{formatDuration(snapshot.ageMs)}</strong>
            </div>
            <div>
              <span>Reconnect Attempt</span>
              <strong>{debugSummary.reconnectAttempt}</strong>
            </div>
            <div>
              <span>Next Backoff Delay</span>
              <strong>{debugSummary.nextReconnectDelayMs}ms</strong>
            </div>
          </div>
        </article>

        <article className="debug-card">
          <h2>Transport controls</h2>
          <p className="muted-copy">
            The websocket client auto-connects on page load. These controls let you verify the
            difference between a local disconnect that becomes `disconnected` and backend-driven
            reconnect flows that become `reconnecting`, without duplicating socket listeners.
          </p>

          <div className="control-grid">
            <button className="action-button" type="button" onClick={() => socketClientRef.current?.connect()}>
              Connect stream
              <span>Starts the websocket client if it is not already connecting or open.</span>
            </button>

            <button className="action-button" type="button" onClick={() => socketClientRef.current?.disconnect()}>
              Disconnect stream
              <span>Stops reconnect scheduling and moves trust state to disconnected.</span>
            </button>

            <button className="action-button" type="button" onClick={() => socketClientRef.current?.simulateReconnectFlow()}>
              Simulate reconnect flow
              <span>Closes the current socket and lets normal exponential backoff drive recovery.</span>
            </button>

            <button className="action-button" type="button" onClick={() => syncClock(Date.now())}>
              Sync clock now
              <span>Refreshes freshness state immediately instead of waiting for the timer tick.</span>
            </button>

            <button
              className="action-button"
              type="button"
              onClick={() => resetState(Date.now())}
            >
              Reset local store
              <span>Clears the local snapshot while leaving the transport available to refill it.</span>
            </button>
          </div>

          <div className="snapshot-grid">
            <div className="snapshot-item">
              <dt>Stream URL</dt>
              <dd>{streamUrlRef.current}</dd>
            </div>
            <div className="snapshot-item">
              <dt>Commit Interval</dt>
              <dd>{UI_COMMIT_INTERVAL_MS}ms latest-only</dd>
            </div>
          </div>
        </article>

        <article className="debug-card">
          <h2>Derived snapshot</h2>
          <div className="snapshot-grid">
            <div className="snapshot-item">
              <dt>Last Frame Timestamp</dt>
              <dd>{formatTimestamp(snapshot.ts)}</dd>
            </div>
            <div className="snapshot-item">
              <dt>Last Receive Time</dt>
              <dd>{formatTimestamp(debugSummary.lastReceiveTime)}</dd>
            </div>
            <div className="snapshot-item">
              <dt>Pose</dt>
              <dd>
                {snapshot.pose
                  ? `${snapshot.pose.x.toFixed(1)}, ${snapshot.pose.y.toFixed(1)}, ${snapshot.pose.headingDeg.toFixed(0)}deg`
                  : 'Awaiting telemetry'}
              </dd>
            </div>
            <div className="snapshot-item">
              <dt>Speed</dt>
              <dd>{snapshot.speed === null ? 'Awaiting telemetry' : `${snapshot.speed.toFixed(2)} m/s`}</dd>
            </div>
            <div className="snapshot-item">
              <dt>Battery</dt>
              <dd>{snapshot.battery === null ? 'Awaiting telemetry' : `${snapshot.battery.toFixed(1)}%`}</dd>
            </div>
            <div className="snapshot-item">
              <dt>Mission</dt>
              <dd>
                {snapshot.mission
                  ? `${snapshot.mission.label} (${snapshot.mission.progress.toFixed(1)}%)`
                  : 'Awaiting telemetry'}
              </dd>
            </div>
            <div className="snapshot-item">
              <dt>Alarm Count</dt>
              <dd>{debugSummary.alarmCount}</dd>
            </div>
            <div className="snapshot-item">
              <dt>Frozen Values</dt>
              <dd>{snapshot.isFrozen ? 'Yes' : 'No'}</dd>
            </div>
          </div>
        </article>

        <article className="debug-card">
          <h2>Trust-state checklist</h2>
          <div className="checklist-grid">
            {trustStateChecklist.map((entry) => (
              <article
                className={`checklist-card ${snapshot.trustState === entry.state ? 'is-active' : ''}`}
                key={entry.state}
              >
                <strong>{entry.state}</strong>
                <p>{entry.detail}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="debug-card json-card">
          <h2>Raw frame</h2>
          <pre>{rawFrame ? JSON.stringify(rawFrame, null, 2) : 'No frame received yet.'}</pre>
        </article>
      </section>
    </main>
  );
}