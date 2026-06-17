import type {
  ConnectionState,
  FreshnessState,
  RawTelemetryFrame,
  TelemetryAlarm,
  TrustState,
  UiTelemetrySnapshot,
  ViewState,
} from '../types/telemetry';

export const STALE_THRESHOLD_MS = 2500;

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

export function deriveViewState(trustState: TrustState): ViewState {
  return trustState;
}

interface BuildUiSnapshotOptions {
  rawFrame: RawTelemetryFrame | null;
  alarms: TelemetryAlarm[];
  connectionState: ConnectionState;
  lastReceiveTime: number | null;
  now: number;
  thresholdMs?: number;
}

export function buildUiSnapshot({
  rawFrame,
  alarms,
  connectionState,
  lastReceiveTime,
  now,
  thresholdMs = STALE_THRESHOLD_MS,
}: BuildUiSnapshotOptions): UiTelemetrySnapshot {
  const freshnessState = deriveFreshnessState(lastReceiveTime, now, thresholdMs);
  const trustState = deriveTrustState(connectionState, freshnessState);

  return {
    ts: rawFrame?.ts ?? null,
    pose: rawFrame?.pose ?? null,
    speed: rawFrame?.speed ?? null,
    battery: rawFrame?.battery ?? null,
    mission: rawFrame?.mission ?? null,
    alarms,
    connectionState,
    freshnessState,
    trustState,
    viewState: deriveViewState(trustState),
    ageMs: lastReceiveTime === null ? null : Math.max(0, now - lastReceiveTime),
    hasData: rawFrame !== null,
    isFrozen: rawFrame !== null && trustState !== 'live',
  };
}