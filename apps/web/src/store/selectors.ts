import type { TelemetryStoreState } from './telemetryStore';

export function selectUiSnapshot(state: TelemetryStoreState) {
  return state.uiSnapshot;
}

export function selectRawFrame(state: TelemetryStoreState) {
  return state.rawFrame;
}

export function selectDebugSummary(state: TelemetryStoreState) {
  return {
    connectionState: state.connectionState,
    freshnessState: state.freshnessState,
    trustState: state.trustState,
    viewState: state.viewState,
    lastReceiveTime: state.lastReceiveTime,
    reconnectAttempt: state.reconnectAttempt,
    nextReconnectDelayMs: state.nextReconnectDelayMs,
    now: state.now,
    alarmCount: state.alarms.length,
  };
}