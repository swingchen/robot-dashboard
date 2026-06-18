import { getReconnectDelay, shouldStopReconnecting } from '../utils/backoff';

export type TelemetryWebSocketEvent =
  | { type: 'connecting'; at: number; url: string }
  | { type: 'open'; at: number }
  | { type: 'message'; data: string; receivedAt: number }
  | { type: 'reconnecting'; at: number; attempt: number; delayMs: number }
  | { type: 'reconnectFailed'; at: number; attempts: number }
  | { type: 'closed'; at: number; code: number; reason: string; wasClean: boolean; manual: boolean }
  | { type: 'error'; at: number };

type TelemetryWebSocketListener = (event: TelemetryWebSocketEvent) => void;

export function getTelemetryWebSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_TELEMETRY_WS_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  return `${protocol}//${window.location.hostname}:3001/telemetry`;
}

export class TelemetryWebSocketClient {
  private socket: WebSocket | null = null;

  private reconnectTimer: number | null = null;

  private reconnectAttempt = 0;

  private manualClose = false;

  private readonly listeners = new Set<TelemetryWebSocketListener>();

  constructor(private readonly url: string) {}

  subscribe(listener: TelemetryWebSocketListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  connect(): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING ||
        this.socket.readyState === WebSocket.CLOSING)
    ) {
      return;
    }

    this.clearReconnectTimer();
    this.manualClose = false;

    if (this.reconnectAttempt === 0) {
      this.emit({
        type: 'connecting',
        at: Date.now(),
        url: this.url,
      });
    }

    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.addEventListener('open', this.handleOpen);
    socket.addEventListener('message', this.handleMessage);
    socket.addEventListener('close', this.handleClose);
    socket.addEventListener('error', this.handleError);
  }

  disconnect(): void {
    this.manualClose = true;
    this.clearReconnectTimer();

    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.socket = null;
      this.emit({
        type: 'closed',
        at: Date.now(),
        code: 1000,
        reason: 'Client disconnect',
        wasClean: true,
        manual: true,
      });
      return;
    }

    this.socket.close(1000, 'Client disconnect');
  }

  simulateReconnectFlow(): void {
    this.manualClose = false;
    this.clearReconnectTimer();

    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.socket.close(4001, 'Simulated reconnect flow');
      return;
    }

    this.scheduleReconnect(Date.now());
  }

  private readonly handleOpen = (): void => {
    // Do NOT reset reconnectAttempt here — wait for first message
    // to prove the data path is truly restored.
    this.emit({
      type: 'open',
      at: Date.now(),
    });
  };

  private readonly handleMessage = (event: MessageEvent<string>): void => {
    // First message after reconnection → backoff succeeded, reset counter
    this.reconnectAttempt = 0;
    this.emit({
      type: 'message',
      data: String(event.data),
      receivedAt: Date.now(),
    });
  };

  private readonly handleClose = (event: CloseEvent): void => {
    const closedSocket = this.socket;

    if (closedSocket) {
      closedSocket.removeEventListener('open', this.handleOpen);
      closedSocket.removeEventListener('message', this.handleMessage);
      closedSocket.removeEventListener('close', this.handleClose);
      closedSocket.removeEventListener('error', this.handleError);
    }

    this.socket = null;
    const manual = this.manualClose;

    this.emit({
      type: 'closed',
      at: Date.now(),
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      manual,
    });

    if (manual) {
      this.manualClose = false;
      this.reconnectAttempt = 0;
      return;
    }

    this.scheduleReconnect(Date.now());
  };

  private readonly handleError = (): void => {
    this.emit({
      type: 'error',
      at: Date.now(),
    });
  };

  private scheduleReconnect(now: number, immediate = false): void {
    if (this.reconnectTimer !== null) {
      return;
    }

    if (shouldStopReconnecting(this.reconnectAttempt)) {
      this.emit({
        type: 'reconnectFailed',
        at: now,
        attempts: this.reconnectAttempt,
      });
      return;
    }

    const attempt = this.reconnectAttempt + 1;
    const delayMs = immediate ? 0 : getReconnectDelay(this.reconnectAttempt);

    this.reconnectAttempt = attempt;
    this.emit({
      type: 'reconnecting',
      at: now,
      attempt,
      delayMs,
    });

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) {
      return;
    }

    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private emit(event: TelemetryWebSocketEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}