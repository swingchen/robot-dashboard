import { useEffect, useRef, useState } from 'react';
import { TelemetryMessageRouter, UI_COMMIT_INTERVAL_MS } from './services/messageRouter';
import { TelemetryWebSocketClient, getTelemetryWebSocketUrl } from './services/websocketClient';
import { selectUiSnapshot } from './store/selectors';
import { useTelemetryStore } from './store/telemetryStore';
import type { TelemetryAlarm } from './types/telemetry';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/state.css';
import './styles/components/trust-banner.css';
import './styles/components/vitals-panel.css';
import './styles/components/pose-view.css';
import { TrustBanner } from './components/TrustBanner';
import { PoseView } from './components/PoseView';
import { VitalsPanel } from './components/VitalsPanel';

const SCENARIO_API_BASE = `${window.location.protocol}//${window.location.hostname}:3001/api`;

interface ScenarioControlResponse {
  scenario: string;
  changedAt: number;
}

function toAlarmKey(alarm: TelemetryAlarm): string {
  return `${alarm.id}:${alarm.raisedAt}`;
}

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
  const streamUrlRef = useRef(getTelemetryWebSocketUrl());
  const [controlError, setControlError] = useState<string | null>(null);
  const [pendingAlarms, setPendingAlarms] = useState<TelemetryAlarm[]>([]);
  const [ackedAlarmKeys, setAckedAlarmKeys] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [isPausedConfirmed, setIsPausedConfirmed] = useState(false);
  const severityRank: Record<'critical' | 'warning', number> = {
    critical: 0,
    warning: 1,
  };
  const visibleAlarms = [...pendingAlarms].sort((a, b) => {
    const rankDiff = severityRank[a.severity] - severityRank[b.severity];

    if (rankDiff !== 0) {
      return rankDiff;
    }

    const raisedAtDiff = b.raisedAt - a.raisedAt;

    if (raisedAtDiff !== 0) {
      return raisedAtDiff;
    }

    return a.code.localeCompare(b.code);
  });
  const criticalAlarms = visibleAlarms.filter((alarm) => alarm.severity === 'critical');
  const overlayTitle =
    criticalAlarms.length > 1
      ? `Critical Alarms - ${criticalAlarms.length} Active`
      : 'Critical Alarm - Immediate Action Required';

  const setScenario = async (scenario: 'stale' | 'alarm'): Promise<ScenarioControlResponse> => {
    const response = await fetch(`${SCENARIO_API_BASE}/scenario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scenario }),
    });

    if (!response.ok) {
      throw new Error(`Scenario switch failed (${response.status})`);
    }

    return (await response.json()) as ScenarioControlResponse;
  };

  const resetScenario = async (): Promise<ScenarioControlResponse> => {
    const response = await fetch(`${SCENARIO_API_BASE}/scenario/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Scenario reset failed (${response.status})`);
    }

    return (await response.json()) as ScenarioControlResponse;
  };

  const runScenarioAction = async (action: () => Promise<void>): Promise<void> => {
    setControlError(null);
    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scenario control request failed';
      setControlError(message);
    }
  };

  const pauseStream = async (): Promise<void> => {
    setIsPaused(true);
    try {
      const response = await fetch(`${SCENARIO_API_BASE}/stream/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Pause failed');
      setIsPausedConfirmed(true);
      setControlError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pause request failed';
      setControlError(message);
      setIsPaused(false);
    }
  };

  const resumeStream = async (): Promise<void> => {
    setIsPaused(false);
    try {
      const response = await fetch(`${SCENARIO_API_BASE}/stream/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Resume failed');
      setIsPausedConfirmed(false);
      setControlError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Resume request failed';
      setControlError(message);
      setIsPaused(true);
    }
  };

  useEffect(() => {
    const activeKeys = new Set(snapshot.alarms.map((alarm) => toAlarmKey(alarm)));

    setAckedAlarmKeys((previous) => {
      if (previous.size === 0) {
        return previous;
      }

      const next = new Set(Array.from(previous).filter((key) => activeKeys.has(key)));
      return next.size === previous.size ? previous : next;
    });

    setPendingAlarms((previous) => {
      const existingKeys = new Set(previous.map((alarm) => toAlarmKey(alarm)));
      const nextAlarms = snapshot.alarms.filter((alarm) => {
        const key = toAlarmKey(alarm);
        return !ackedAlarmKeys.has(key) && !existingKeys.has(key);
      });

      if (nextAlarms.length === 0) {
        return previous;
      }

      return [...previous, ...nextAlarms];
    });
  }, [snapshot.alarms, ackedAlarmKeys]);

  const acknowledgeAlarm = (alarm: TelemetryAlarm): void => {
    const key = toAlarmKey(alarm);

    setPendingAlarms((previous) => previous.filter((candidate) => toAlarmKey(candidate) !== key));

    setAckedAlarmKeys((previous) => {
      const next = new Set(previous);
      next.add(key);
      return next;
    });
  };

  const acknowledgeAllVisible = (): void => {
    if (visibleAlarms.length === 0) {
      return;
    }

    setPendingAlarms([]);

    setAckedAlarmKeys((previous) => {
      const next = new Set(previous);

      for (const alarm of visibleAlarms) {
        next.add(toAlarmKey(alarm));
      }

      return next;
    });
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

    // Keep initial state as no-data-yet for demo walkthroughs.
    // Operator starts stream manually via the Connect control.

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
          {/* Alarm Info Panel - Left (high priority, above vitals) */}
          <div
            className={`panel alarms-left${criticalAlarms.length > 0 ? ' alarms-left--has-critical' : ''}`}
            aria-label="Alarm info panel"
          >
            <div className="panel__header">
              <div className="panel__title">
                <span className="panel__title-icon">🔔</span>
                Alarm Info
                {visibleAlarms.length > 0 && (
                  <span className={`alarm-count-badge${criticalAlarms.length > 0 ? ' alarm-count-badge--critical' : ''}`}>
                    {visibleAlarms.length}
                  </span>
                )}
              </div>
              {visibleAlarms.length > 0 && (
                <button className="alarm-ack-btn alarm-ack-btn--all" onClick={acknowledgeAllVisible}>
                  Ack All
                </button>
              )}
            </div>
            <div className="panel__content alarms-panel">
              {visibleAlarms.length === 0 ? (
                <div className="alarms-empty">
                  <span className="alarms-empty__icon">✓</span>
                  <span>No active alarms</span>
                </div>
              ) : (
                <div className="alarms-list">
                  {visibleAlarms.map((alarm) => (
                    <div key={toAlarmKey(alarm)} className={`alarm-item alarm-item--${alarm.severity}${alarm.severity === 'critical' ? ' alarm-item--pulse' : ''}`}>
                      <div className="alarm-item__icon">
                        {alarm.severity === 'critical' ? '🔴' : '⚠️'}
                      </div>
                      <div className="alarm-item__content">
                        <div className="alarm-item__header-row">
                          <span className="alarm-item__code">{alarm.code}</span>
                          <span className={`alarm-item__severity alarm-item__severity--${alarm.severity}`}>
                            {alarm.severity}
                          </span>
                        </div>
                        <div className="alarm-item__message">{alarm.message}</div>
                        <div className="alarm-item__time">
                          {new Date(alarm.raisedAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        className={`alarm-ack-btn alarm-ack-btn--${alarm.severity}`}
                        onClick={() => acknowledgeAlarm(alarm)}
                        aria-label={`Acknowledge alarm ${alarm.code}`}
                      >
                        Ack
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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

          {/* Demo Controls - Right */}
          <div className="panel controls-right">
            <div className="panel__header">
              <div className="panel__title">Demo Controls</div>
            </div>
            <div className="panel__content demo-controls">
              <div className="demo-controls__section">
                <div className="demo-controls__label">Transport</div>
                <div className="demo-controls__buttons">
                  <button
                    className="demo-btn"
                    onClick={() => {
                      setControlError(null);
                      socketClientRef.current?.connect();
                    }}
                  >
                    ① Connect
                  </button>
                  <button
                    className="demo-btn"
                    onClick={() => {
                      setControlError(null);
                      socketClientRef.current?.disconnect();
                    }}
                  >
                    ⑤ Disconnect
                  </button>
                </div>
              </div>

              <div className="demo-controls__section">
                <div className="demo-controls__label">Scenarios</div>
                <div className="demo-controls__buttons">
                  <button
                    className="demo-btn"
                    onClick={() => {
                      void runScenarioAction(async () => {
                        await setScenario('stale');
                      });
                    }}
                  >
                    ② Stale
                  </button>
                  <button
                    className="demo-btn"
                    onClick={() => {
                      void runScenarioAction(async () => {
                        await resetScenario();
                      });
                    }}
                  >
                    ③ Recover
                  </button>
                  <button
                    className="demo-btn"
                    onClick={() => {
                      setControlError(null);
                      socketClientRef.current?.simulateReconnectFlow();
                    }}
                  >
                    ④ Reconnect
                  </button>
                  <button
                    className="demo-btn demo-btn--alarm"
                    onClick={() => {
                      void runScenarioAction(async () => {
                        await setScenario('alarm');
                      });
                    }}
                  >
                    ⑥ Alarm
                  </button>
                </div>
                {controlError && <div className="demo-controls__error">{controlError}</div>}
              </div>

              <div className="demo-controls__section">
                <div className="demo-controls__label">Stream Control (Bonus)</div>
                <div className="demo-controls__buttons">
                  <button
                    className="demo-btn"
                    disabled={isPaused}
                    onClick={() => {
                      void pauseStream();
                    }}
                  >
                    ⏸ Pause
                    {isPaused && !isPausedConfirmed && ' (requesting...)'}
                  </button>
                  <button
                    className="demo-btn"
                    disabled={!isPaused}
                    onClick={() => {
                      void resumeStream();
                    }}
                  >
                    ▶ Resume
                    {!isPaused && isPausedConfirmed && ' (requesting...)'}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  Status: {isPausedConfirmed ? '✓ Paused' : '✓ Running'}
                  {isPaused !== isPausedConfirmed && ' → Syncing...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {criticalAlarms.length > 0 && (
        <div className="alarm-overlay" role="alert" aria-live="assertive" aria-label="Active critical alarm overlay">
          <div className="alarm-overlay__card alarm-overlay__card--critical">
            <div className="alarm-overlay__title alarm-overlay__title--critical">{overlayTitle}</div>
            <div className="alarm-overlay__list">
              {criticalAlarms.map((alarm) => (
                <div key={toAlarmKey(alarm)} className={`alarm-item alarm-item--${alarm.severity}`}>
                  <div className="alarm-item__content">
                    <div className="alarm-item__code">{alarm.code}</div>
                    <div className="alarm-item__message">{alarm.message}</div>
                  </div>
                  <div className="alarm-item__actions">
                    <div className={`alarm-item__severity alarm-item__severity--${alarm.severity}`}>
                      {alarm.severity}
                    </div>
                    <button
                      className={`alarm-ack-btn alarm-ack-btn--${alarm.severity}`}
                      onClick={() => acknowledgeAlarm(alarm)}
                    >
                      Ack
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div>Stream: {streamUrlRef.current}</div>
      </footer>

      {/* Debug Section - Hidden by default, can be toggled */}
      <section className="debug-layout" aria-label="Frontend telemetry state inspector" style={{ display: 'none' }}>
        <p>Debug information available but hidden by default</p>
      </section>
    </div>
  );
}