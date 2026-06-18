import type { TelemetryFrame } from './types.js';

const MISSIONS = [
  'Transit to waypoint alpha',
  'Inspect storage lane',
  'Return to charging berth',
] as const;

interface GeneratorState {
  x: number;
  y: number;
  headingRad: number;
  battery: number;
  missionIndex: number;
  missionProgress: number;
  lastTimestamp: number;
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
      alarms: [],
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