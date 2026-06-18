// ⚠️ KEEP IN SYNC with apps/server/src/telemetry/types.ts
// If you change these shared types, update both files.
export interface Pose {
  x: number;
  y: number;
  headingDeg: number;
}

export interface MissionState {
  id: string;
  label: string;
  progress: number;
  state: 'EXECUTING' | 'COMPLETED';
}

export interface TelemetryAlarm {
  id: string;
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  raisedAt: number;
}

export interface TelemetryFrame {
  ts: number;
  pose: Pose;
  speed: number;
  battery: number;
  mission: MissionState;
  alarms: TelemetryAlarm[];
}

export type RawTelemetryFrame = TelemetryFrame;

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'disconnected';

export type FreshnessState = 'no-data-yet' | 'fresh' | 'stale';

export type TrustState = 'no-data-yet' | 'live' | 'stale' | 'reconnecting' | 'disconnected';

export interface UiTelemetrySnapshot {
  ts: number | null;
  pose: Pose | null;
  speed: number | null;
  battery: number | null;
  mission: MissionState | null;
  alarms: TelemetryAlarm[];
  connectionState: ConnectionState;
  freshnessState: FreshnessState;
  trustState: TrustState;
  ageMs: number | null;
  hasData: boolean;
  isFrozen: boolean;
  /** Reconnection backoff – attempt count (0 = connected / never reconnected) */
  reconnectAttempt: number;
  /** Reconnection backoff – next retry delay in ms (0 = not reconnecting) */
  nextReconnectDelayMs: number;
}