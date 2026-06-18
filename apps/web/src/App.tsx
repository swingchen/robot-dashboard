import { useEffect, useRef } from 'react';
import { TelemetryMessageRouter, UI_COMMIT_INTERVAL_MS } from './services/messageRouter';
import { TelemetryWebSocketClient, getTelemetryWebSocketUrl } from './services/websocketClient';
import { useTelemetryStore } from './store/telemetryStore';
import './styles/index.css';
import { getApiBaseUrl } from './utils/api';
import { AlarmInfoPanel } from './components/AlarmInfoPanel';
import { TrustBanner } from './components/TrustBanner';
import { PoseView } from './components/PoseView';
import { VitalsPanel } from './components/VitalsPanel';
import { ControlPanel } from './components/ControlPanel';

export default function App() {
  const snapshot = useTelemetryStore((state) => state.uiSnapshot);
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
  const apiBaseRef = useRef(getApiBaseUrl());

  const handleConnect = async (): Promise<void> => {
    // Reset server to live scenario and ensure stream is running
    try {
      await fetch(`${apiBaseRef.current}/scenario/reset`, { method: 'POST' });
      await fetch(`${apiBaseRef.current}/stream/resume`, { method: 'POST' });
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
            <TrustBanner snapshot={snapshot} />
          </div>

          {/* Left Column: Alarm Info + Vitals, 1:1 */}
          <div className="left-column">
            <AlarmInfoPanel alarms={snapshot.alarms} />

            <div className="panel vitals-left">
              <div className="panel__header">
                <div className="panel__title">Vehicle Vitals</div>
              </div>
              <div className="panel__content">
                <VitalsPanel snapshot={snapshot} />
              </div>
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