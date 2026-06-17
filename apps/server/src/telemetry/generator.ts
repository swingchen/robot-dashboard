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

    // Vehicle follows a circular path in the viewport
    // Circle with radius ~200m, completes one lap every ~60 seconds
    const angle = (now / 20000) * Math.PI * 2;
    const radius = 200;
    
    this.state.x = Math.cos(angle) * radius;
    this.state.y = Math.sin(angle) * radius;

    // Heading always points in the direction of motion (tangent to circle)
    // Calculate heading by looking at next position
    const nextAngle = ((now + 400) / 20000) * Math.PI * 2;
    const nextX = Math.cos(nextAngle) * radius;
    const nextY = Math.sin(nextAngle) * radius;
    const dx = nextX - this.state.x;
    const dy = nextY - this.state.y;
    this.state.headingRad = normalizeRadians(Math.atan2(dy, dx));

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

function normalizeRadians(value: number): number {
  const fullTurn = Math.PI * 2;

  return ((value % fullTurn) + fullTurn) % fullTurn;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function roundTo(value: number): number {
  return Math.round(value * 100) / 100;
}