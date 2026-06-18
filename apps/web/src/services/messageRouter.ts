import type { RawTelemetryFrame, TelemetryAlarm } from '../types/telemetry';

export const UI_COMMIT_INTERVAL_MS = 100;

interface TelemetryMessageRouterOptions {
  onFrame: (frame: RawTelemetryFrame, receivedAt: number) => void;
  commitIntervalMs?: number;
}

function getAlarmSignature(alarms: TelemetryAlarm[]): string {
  return alarms
    .map((alarm) => `${alarm.id}:${alarm.code}:${alarm.severity}:${alarm.raisedAt}`)
    .join('|');
}

export class TelemetryMessageRouter {
  private pendingFrame: RawTelemetryFrame | null = null;

  private pendingReceivedAt: number | null = null;

  private flushTimer: number | null = null;

  private lastCommittedAlarmSignature = '';

  private hasCommittedFrame = false;

  private readonly commitIntervalMs: number;

  constructor(private readonly options: TelemetryMessageRouterOptions) {
    this.commitIntervalMs = options.commitIntervalMs ?? UI_COMMIT_INTERVAL_MS;
  }

  routeMessage(data: string, receivedAt = Date.now()): boolean {
    const frame = this.parseFrame(data);

    if (!frame) {
      return false;
    }

    if (this.shouldFlushImmediately(frame)) {
      this.clearFlushTimer();
      this.pendingFrame = null;
      this.pendingReceivedAt = null;
      this.commit(frame, receivedAt);
      return true;
    }

    this.pendingFrame = frame;
    this.pendingReceivedAt = receivedAt;

    if (this.flushTimer === null) {
      this.flushTimer = window.setTimeout(() => {
        this.flushTimer = null;
        this.flushPending();
      }, this.commitIntervalMs);
    }

    return true;
  }

  dispose(): void {
    this.clearPending();
  }

  clearPending(): void {
    this.clearFlushTimer();
    this.pendingFrame = null;
    this.pendingReceivedAt = null;
  }

  private flushPending(): void {
    if (!this.pendingFrame || this.pendingReceivedAt === null) {
      return;
    }

    const frame = this.pendingFrame;
    const receivedAt = this.pendingReceivedAt;

    this.pendingFrame = null;
    this.pendingReceivedAt = null;
    this.commit(frame, receivedAt);
  }

  private commit(frame: RawTelemetryFrame, receivedAt: number): void {
    this.hasCommittedFrame = true;
    this.lastCommittedAlarmSignature = getAlarmSignature(frame.alarms);
    this.options.onFrame(frame, receivedAt);
  }

  private shouldFlushImmediately(frame: RawTelemetryFrame): boolean {
    if (!this.hasCommittedFrame) {
      return true;
    }

    return getAlarmSignature(frame.alarms) !== this.lastCommittedAlarmSignature;
  }

  private parseFrame(data: string): RawTelemetryFrame | null {
    try {
      return JSON.parse(data) as RawTelemetryFrame;
    } catch {
      return null;
    }
  }

  private clearFlushTimer(): void {
    if (this.flushTimer === null) {
      return;
    }

    window.clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }
}