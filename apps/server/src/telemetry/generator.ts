import type { TelemetryAlarm, TelemetryFrame } from './types.js';

const MISSIONS = [
  'Transit to waypoint alpha',
  'Inspect storage lane',
  'Return to charging berth',
] as const;

// === Alarm pool & cycling schedule ===
// info appears often, warning medium, critical rare (~1/7)
const ALARM_POOL: Omit<TelemetryAlarm, 'raisedAt'>[] = [
  { id: 'battery-low', code: 'E-201', severity: 'info', message: 'Battery below 30% — schedule charging.' },
  { id: 'sensor-dust', code: 'E-302', severity: 'info', message: 'LiDAR sensor dust accumulation detected.' },
  { id: 'load-camera-obstructed', code: 'E-105', severity: 'warning', message: 'Load camera visibility is degraded.' },
  { id: 'wifi-signal-weak', code: 'E-410', severity: 'warning', message: 'WiFi signal strength below threshold.' },
  { id: 'motor-temp-high', code: 'MOTOR_OVER_TEMP', severity: 'critical', message: 'Drive motor temperature is above the safe threshold.' },
];

// Cycle pattern: pool indices. critical (index 4) only appears 2 out of 20 slots.
const ALARM_CYCLE = [0, 1, 2, 0, 3, 0, 4, 1, 0, 2, 3, 0, 1, 4, 0, 2, 0, 3, 1, 0];

const ALARM_ACTIVE_MS = 6000;  // alarm stays visible for 6 s
const ALARM_PAUSE_MS = 4000;   // gap between alarms: 4 s with no alarm

interface GeneratorState {
  x: number;
  y: number;
  headingRad: number;
  battery: number;
  missionIndex: number;
  missionProgress: number;
  lastTimestamp: number;
  alarmCycleIndex: number;
  alarmRaisedAt: number;
  alarmPhaseStart: number;
  alarmActive: boolean;
}

export class TelemetryGenerator {
  private readonly state: GeneratorState = {
    x: 0,
    y: 0,
    headingRad: Math.PI / 8,
    battery: 100,
    missionIndex: 0,
    missionProgress: 12,
    lastTimestamp: Date.now(),
    alarmCycleIndex: 0,
    alarmRaisedAt: Date.now(),
    alarmPhaseStart: Date.now(),
    alarmActive: false,
  };

  nextFrame(now = Date.now()): TelemetryFrame {
    const deltaMs = Math.max(now - this.state.lastTimestamp, 1000 / 15);
    const deltaSeconds = deltaMs / 1000;

    // Back-and-forth patrol along X axis (warehouse aisle simulation)
    // Period ~16 seconds for a full round trip (left → right → left)
    const periodMs = 16000;
    const phase = ((now % periodMs) / periodMs) * Math.PI * 2; // 0 → 2π
    const rawX = Math.sin(phase) * 180; // -180m to +180m

    // Slight Y drift for realism (small figure-8 wobble)
    const rawY = Math.sin(phase * 2) * 15;

    // Smooth the position (low-pass to avoid jumps)
    const smoothingFactor = 0.3;
    this.state.x = this.state.x + (rawX - this.state.x) * smoothingFactor;
    this.state.y = this.state.y + (rawY - this.state.y) * smoothingFactor;

    // Smooth heading transition at endpoints
    const targetHeading = Math.cos(phase) > 0.05 ? 0 : Math.cos(phase) < -0.05 ? Math.PI : this.state.headingRad;
    this.state.headingRad = targetHeading;

    // Speed varies slightly
    const speed = clamp(3.0 + 1.0 * Math.sin(now / 2000), 2.0, 5.0);
    this.state.battery -= deltaSeconds * 0.35;
    this.state.missionProgress += deltaSeconds * 7.5;

    if (this.state.battery < 18) {
      this.state.battery = 100;
    }

    // Determine mission state based on progress
    const missionState = this.state.missionProgress >= 95 ? 'COMPLETED' : 'EXECUTING';

    if (this.state.missionProgress >= 100) {
      this.state.missionProgress -= 100;
      this.state.missionIndex = (this.state.missionIndex + 1) % MISSIONS.length;
    }

    // === Alarm cycling: active 6 s → pause 4 s → next alarm ===
    const elapsedInPhase = now - this.state.alarmPhaseStart;

    if (this.state.alarmActive) {
      if (elapsedInPhase >= ALARM_ACTIVE_MS) {
        this.state.alarmActive = false;
        this.state.alarmPhaseStart = now;
      }
    } else {
      if (elapsedInPhase >= ALARM_PAUSE_MS) {
        this.state.alarmActive = true;
        this.state.alarmPhaseStart = now;
        this.state.alarmRaisedAt = now;
        this.state.alarmCycleIndex = (this.state.alarmCycleIndex + 1) % ALARM_CYCLE.length;
      }
    }

    const alarms: TelemetryAlarm[] = [];
    if (this.state.alarmActive) {
      const poolIndex = ALARM_CYCLE[this.state.alarmCycleIndex];
      alarms.push({
        ...ALARM_POOL[poolIndex],
        raisedAt: this.state.alarmRaisedAt,
      });
    }
    // ==========================================================

    this.state.lastTimestamp = now;

    return {
      ts: now,
      pose: {
        x: roundTo(this.state.x),
        y: roundTo(this.state.y),
        headingDeg: roundTo(radiansToDegrees(this.state.headingRad)),
      },
      speed: roundTo(speed),
      battery: roundTo(this.state.battery),
      mission: {
        id: `M-${String(this.state.missionIndex + 1).padStart(2, '0')}`,
        label: MISSIONS[this.state.missionIndex],
        progress: roundTo(this.state.missionProgress),
        state: missionState,
      },
      alarms,
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function roundTo(value: number): number {
  return Math.round(value * 100) / 100;
}