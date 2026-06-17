import type { ConnectionManager } from '../connection/manager.js';
import type { ScenarioController } from '../scenarios/controller.js';
import type { TelemetryGenerator } from './generator.js';
import type { TelemetryAlarm, TelemetryFrame } from './types.js';

interface TelemetryBroadcasterOptions {
  controller: ScenarioController;
  connectionManager: ConnectionManager;
  generator: TelemetryGenerator;
  streamHz: number;
}

export class TelemetryBroadcaster {
  private readonly intervalMs: number;

  private latestFrame: TelemetryFrame;

  private timer: NodeJS.Timeout | undefined;

  private isPaused = false;

  private activeInjectedAlarm:
    | {
      severity: 'warning' | 'critical';
      raisedAt: number;
    }
    | null = null;

  constructor(private readonly options: TelemetryBroadcasterOptions) {
    this.intervalMs = Math.round(1000 / options.streamHz);
    this.latestFrame = options.generator.nextFrame();
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.tick();
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }

  getLatestFrame(): TelemetryFrame {
    return this.latestFrame;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  isPausedNow(): boolean {
    return this.isPaused;
  }

  private tick(): void {
    if (!this.options.controller.shouldStream()) {
      return;
    }

    const baseFrame = this.options.generator.nextFrame();
    const nextFrame = this.options.controller.shouldInjectAlarm()
      ? withInjectedAlarm(baseFrame, this.options.controller.getAlarmSeverity(), this.activeInjectedAlarm)
      : baseFrame;

    if (this.options.controller.shouldInjectAlarm()) {
      this.activeInjectedAlarm = {
        severity: nextFrame.alarms[0]?.severity ?? this.options.controller.getAlarmSeverity(),
        raisedAt: nextFrame.alarms[0]?.raisedAt ?? baseFrame.ts,
      };
    } else {
      this.activeInjectedAlarm = null;
    }

    this.latestFrame = nextFrame;

    // Only broadcast if not paused
    if (!this.isPaused) {
      this.options.connectionManager.broadcast(JSON.stringify(nextFrame));
    }
  }
}

function withInjectedAlarm(
  frame: TelemetryFrame,
  severity: 'warning' | 'critical',
  previous: { severity: 'warning' | 'critical'; raisedAt: number } | null,
): TelemetryFrame {
  const isCritical = severity === 'critical';
  const raisedAt = previous && previous.severity === severity ? previous.raisedAt : frame.ts;
  const alarm: TelemetryAlarm = {
    id: isCritical ? 'motor-temp-high' : 'load-camera-obstructed',
    code: isCritical ? 'MOTOR_OVER_TEMP' : 'E-105',
    severity,
    message: isCritical
      ? 'Drive motor temperature is above the safe threshold.'
      : 'Load camera visibility is degraded.',
    raisedAt,
  };

  return {
    ...frame,
    alarms: [alarm],
  };
}