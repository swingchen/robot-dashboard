import { useEffect, useRef } from 'react';
import { TelemetryMessageRouter, UI_COMMIT_INTERVAL_MS } from './services/messageRouter';
import { TelemetryWebSocketClient, getTelemetryWebSocketUrl } from './services/websocketClient';
import { selectUiSnapshot } from './store/selectors';
import { useTelemetryStore } from './store/telemetryStore';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/state.css';
import './styles/components/trust-banner.css';
import './styles/components/vitals-panel.css';
import './styles/components/pose-view.css';
import './styles/components/alarm-info-panel.css';
import './styles/components/control-panel.css';
import { AlarmInfoPanel } from './components/AlarmInfoPanel';
import { TrustBanner } from './components/TrustBanner';
import { PoseView } from './components/PoseView';
import { VitalsPanel } from './components/VitalsPanel';
import { ControlPanel } from './components/ControlPanel';

export default function App() {
  const snapshot = useTelemetryStore(selectUiSnapshot);
  const receiveFrame = useTelemetryStore((state) => state.receiveFrame);
  const syncClock = useTelemetryStore((state) => state.syncClock);
  const markConnecting = useTelemetryStore((state) => state.markConnecting);
  const markConnected = useTelemetryStore((state) => state.markConnected);
  const markReconnecting = useTelemetryStore((state) => state.markReconnecting);
  const markDisconnected = useTelemetryStore((state) => state.markDisconnected);
  const socketClientRef = useRef<TelemetryWebSocketClient | null>(null);
  const messageRouterRef = useRef<TelemetryMessageRouter | null>(null);
  const isManualDisconnectRef = useRef(false);
  const streamUrlRef = useRef(getTelemetryWebSocketUrl());

  const apiBase = `//${window.location.hostname}:3001/api`;

  const handleConnect = async (): Promise<void> => {
    // Pause auto-fault scheduler and reset to live scenario
    try {
      const r1 = await fetch(`${apiBase}/auto-faults/pause`, { method: 'POST' });
      const r2 = await fetch(`${apiBase}/scenario/reset`, { method: 'POST' });
      console.log('[connect] auto-faults paused:', r1.ok, 'scenario reset:', r2.ok);
    } catch (err) {
      console.warn('[connect] API call failed:', err);
    }

    // Connect if not already connected (connect() guards against double-connect)
    isManualDisconnectRef.current = false;
    socketClientRef.current?.connect();
  };

  const handleDisconnect = (): void => {
    isManualDisconnectRef.current = true;
    messageRouterRef.current?.clearPending();
    socketClientRef.current?.disconnect();
  };

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
          isManualDisconnectRef.current = false;
          markConnecting(event.at);
          break;
        case 'open':
          isManualDisconnectRef.current = false;
          markConnected(event.at);
          break;
        case 'message':
          if (isManualDisconnectRef.current) {
            break;
          }
          router.routeMessage(event.data, event.receivedAt);
          break;
        case 'reconnecting':
          markReconnecting(event.at);
          break;
        case 'reconnectFailed':
          markDisconnected(event.at);
          break;
        case 'closed':
          if (event.manual) {
            isManualDisconnectRef.current = true;
            router.clearPending();
            markDisconnected(event.at);
          }
          break;
        case 'error':
          break;
      }
    });

    // Auto-connect on page load — reset server to live + ensure auto-faults running
    fetch(`${apiBase}/scenario/reset`, { method: 'POST' }).catch(() => {});
    fetch(`${apiBase}/auto-faults/resume`, { method: 'POST' }).catch(() => {});
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
    <div className="app-container">
      {/* Header / Trust Banner */}
      <header className="app-header">
        <div className="app-header__title">Robot Operations Dashboard</div>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* TrustBanner - Full Width */}
          <div className="panel trust-banner-wrapper">
            <TrustBanner
              snapshot={snapshot}
              ageMs={snapshot.ageMs}
            />
          </div>

          {/* Second Row: Alarm Info (Left, priority), Vitals (Left), PoseView (Center), Controls (Right) */}
          <AlarmInfoPanel alarms={snapshot.alarms} />

          {/* Vitals Panel - Left */}
          <div className="panel vitals-left">
            <div className="panel__header">
              <div className="panel__title">Vehicle Vitals</div>
            </div>
            <div className="panel__content">
              <VitalsPanel snapshot={snapshot} />
            </div>
          </div>

          {/* PoseView - Center (Large) */}
          <div className="panel pose-panel-center">
            <div className="panel__header">
              <div className="panel__title">Position & Heading</div>
            </div>
            <div className="panel__content">
              <PoseView pose={snapshot.pose} isFrozen={snapshot.isFrozen} />
            </div>
          </div>

          {/* Controls */}
          <div className="panel controls-right">
            <div className="panel__header">
              <div className="panel__title">Controls</div>
            </div>
            <div className="panel__content">
              <ControlPanel
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div>Stream: {streamUrlRef.current}</div>
      </footer>
    </div>
  );
}