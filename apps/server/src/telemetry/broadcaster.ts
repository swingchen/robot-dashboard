import type { ConnectionManager } from '../connection/manager.js';
import type { ScenarioController } from '../scenarios/controller.js';
import type { TelemetryGenerator } from './generator.js';
import type { TelemetryFrame } from './types.js';

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

    // Alarms are now produced by the generator itself — no injection needed.
    const nextFrame = this.options.generator.nextFrame();
    this.latestFrame = nextFrame;

    // Only broadcast if not paused
    if (!this.isPaused) {
      this.options.connectionManager.broadcast(JSON.stringify(nextFrame));
    }
  }
}