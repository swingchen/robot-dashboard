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